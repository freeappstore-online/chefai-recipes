import { useState, useEffect, useRef } from "react";
import { Shell } from "./components/Shell";
import { initApp } from "@freeappstore/sdk";
import { useAuth } from "@freeappstore/sdk/hooks";

const fas = initApp({ appId: "chefai-recipes" });

const AVOID_KEY = "chefai_avoid_v1";

const QUICK_SEARCHES = [
  "🥗 Caesar salad",
  "🍝 Spaghetti bolognese",
  "🥞 Fluffy pancakes",
  "🍲 Tomato soup",
  "🌮 Beef tacos",
  "🎂 Chocolate cake",
  "🍛 Chicken curry",
  "🥦 Veggie stir fry",
];

const PRESET_AVOIDS = [
  "gluten", "dairy", "nuts", "eggs",
  "shellfish", "soy", "meat", "alcohol",
];

const FOLLOW_UPS = [
  "Make it vegetarian",
  "Simpler version please",
  "What can I substitute?",
  "Scale for 2 people",
  "I don't have that utensil",
  "More flavour tips",
];

interface Msg {
  id: string;
  role: "user" | "assistant";
  text: string;
}

function RecipeDisplay({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div>
      {lines.map((line, i) => {
        if (line.startsWith("# ")) {
          return (
            <p key={i} style={{ fontFamily: "Fraunces, serif", fontSize: "1.1rem", fontWeight: 700, color: "var(--accent)", marginTop: "0.5rem", marginBottom: "0.25rem" }}>
              {line.slice(2)}
            </p>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <p key={i} style={{ fontFamily: "Fraunces, serif", fontWeight: 700, marginTop: "0.75rem", marginBottom: "0.25rem" }}>
              {line.slice(3)}
            </p>
          );
        }
        const num = line.match(/^(\d+)\.\s(.+)$/);
        if (num) {
          return (
            <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", margin: "0.25rem 0" }}>
              <span style={{ background: "var(--accent)", color: "#fff", borderRadius: "50%", width: "1.25rem", height: "1.25rem", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, flexShrink: 0, marginTop: "0.15rem" }}>
                {num[1]}
              </span>
              <span style={{ fontSize: "0.875rem", lineHeight: 1.6 }}>{num[2]}</span>
            </div>
          );
        }
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", margin: "0.2rem 0" }}>
              <span style={{ width: "0.35rem", height: "0.35rem", borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: "0.45rem" }} />
              <span style={{ fontSize: "0.875rem", lineHeight: 1.6 }}>{line.slice(2)}</span>
            </div>
          );
        }
        if (line.trim() === "" || line.trim() === "---") return <div key={i} style={{ height: "0.25rem" }} />;
        return <p key={i} style={{ fontSize: "0.875rem", lineHeight: 1.6, margin: "0.1rem 0" }}>{line}</p>;
      })}
    </div>
  );
}

export default function App() {
  const { user, loading: authLoading } = useAuth(fas);
  const [view, setView] = useState<"chat" | "diet">("chat");
  const [avoid, setAvoid] = useState<string[]>([]);
  const [avoidInput, setAvoidInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const s = localStorage.getItem(AVOID_KEY);
      if (s) setAvoid(JSON.parse(s) as string[]);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(AVOID_KEY, JSON.stringify(avoid));
  }, [avoid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  function addAvoid() {
    const v = avoidInput.trim().toLowerCase();
    if (v && !avoid.includes(v)) {
      setAvoid((prev) => [...prev, v]);
      setAvoidInput("");
    }
  }

  async function sendMessage(override?: string) {
    const text = (override ?? input).trim();
    if (!text || busy || !user) return;

    const userMsg: Msg = { id: String(Date.now()), role: "user", text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setBusy(true);

    const avoidLine =
      avoid.length > 0
        ? `IMPORTANT — never include these in any recipe: ${avoid.join(", ")}.`
        : "";

    const systemPrompt = `You are ChefAI, a friendly personal chef assistant. ${avoidLine}
When the user asks for a recipe, respond with:
- Recipe name as a # heading
- Short description (1 sentence)
- Prep time and cook time
- Servings
- ## Ingredients section with a bullet list
- ## Instructions section with numbered steps (clear and beginner-friendly)
- ## Tips section (optional, 1-2 tips)
For follow-up questions about missing ingredients or utensils, give practical alternatives. Keep responses warm and encouraging.`;

    try {
      const res = await fas.proxy.fetch("api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            ...updated.map((m) => ({ role: m.role, content: m.text })),
          ],
          max_tokens: 1200,
          temperature: 0.7,
        }),
      });

      if (!res.ok) throw new Error("API error");

      const data = await res.json() as {
        choices: Array<{ message: { content: string } }>;
      };

      const reply = data.choices?.[0]?.message?.content ?? "Sorry, I couldn't get a recipe. Please try again!";
      setMessages((prev) => [...prev, { id: String(Date.now() + 1), role: "assistant", text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: String(Date.now() + 1), role: "assistant", text: "Something went wrong. Please try again! 🍳" },
      ]);
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  const navItems = [
    { id: "chat", icon: "🍳", label: "Recipes", active: view === "chat", onClick: () => setView("chat") },
    { id: "diet", icon: "🚫", label: "My Diet", active: view === "diet", onClick: () => setView("diet") },
  ];

  return (
    <Shell navItems={navItems} title="ChefAI">

      {/* ── DIET VIEW ── */}
      {view === "diet" && (
        <div style={{ maxWidth: "32rem", margin: "0 auto", width: "100%", overflowY: "auto", paddingBottom: "2rem" }}>
          <h1 style={{ fontFamily: "Fraunces, serif", fontSize: "2rem", fontWeight: 700, marginBottom: "0.25rem" }}>
            My Dietary Restrictions
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
            Any food you add here will never appear in your recipes.
          </p>

          {/* Input */}
          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "1rem", padding: "1rem", marginBottom: "1rem" }}>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                value={avoidInput}
                onChange={(e) => setAvoidInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addAvoid()}
                placeholder="e.g. peanuts, dairy, shellfish…"
                style={{
                  flex: 1, borderRadius: "0.75rem", padding: "0.5rem 1rem",
                  fontSize: "0.875rem", outline: "none",
                  background: "var(--paper)", border: "1px solid var(--line)", color: "var(--ink)",
                }}
              />
              <button
                onClick={addAvoid}
                style={{ background: "var(--accent)", color: "#fff", borderRadius: "0.75rem", padding: "0.5rem 1rem", fontWeight: 600, fontSize: "0.875rem", border: "none", cursor: "pointer" }}
              >
                Add
              </button>
            </div>
          </div>

          {/* Tags */}
          {avoid.length > 0 && (
            <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "1rem", padding: "1rem", marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Avoiding ({avoid.length})
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {avoid.map((r) => (
                  <span key={r} style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "var(--paper)", border: "1px solid var(--line-strong)", borderRadius: "9999px", padding: "0.25rem 0.75rem", fontSize: "0.875rem" }}>
                    🚫 {r}
                    <button
                      onClick={() => setAvoid((prev) => prev.filter((x) => x !== r))}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--error)", fontWeight: 700, fontSize: "1rem", lineHeight: 1, padding: "0 0.1rem" }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Presets */}
          <p style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Quick add
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.5rem" }}>
            {PRESET_AVOIDS.map((p) => (
              <button
                key={p}
                onClick={() => { if (!avoid.includes(p)) setAvoid((a) => [...a, p]); }}
                disabled={avoid.includes(p)}
                style={{
                  background: "var(--panel)", border: "1px solid var(--line-strong)", borderRadius: "9999px",
                  padding: "0.25rem 0.75rem", fontSize: "0.875rem", cursor: "pointer", color: "var(--ink)",
                  opacity: avoid.includes(p) ? 0.4 : 1,
                }}
              >
                {avoid.includes(p) ? "✓ " : "+ "}{p}
              </button>
            ))}
          </div>

          <button
            onClick={() => setView("chat")}
            style={{ width: "100%", background: "var(--accent)", color: "#fff", borderRadius: "0.75rem", padding: "0.75rem", fontWeight: 600, fontSize: "0.95rem", border: "none", cursor: "pointer" }}
          >
            Start Cooking 🍳
          </button>
        </div>
      )}

      {/* ── CHAT VIEW ── */}
      {view === "chat" && (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", maxWidth: "48rem", margin: "0 auto" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", flexShrink: 0 }}>
            <div>
              <h1 style={{ fontFamily: "Fraunces, serif", fontSize: "1.25rem", fontWeight: 700 }}>ChefAI 👨‍🍳</h1>
              {avoid.length > 0 && (
                <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.1rem" }}>
                  Avoiding: {avoid.slice(0, 3).join(", ")}{avoid.length > 3 ? ` +${avoid.length - 3} more` : ""}
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  style={{ border: "1px solid var(--line)", borderRadius: "0.5rem", padding: "0.25rem 0.75rem", fontSize: "0.75rem", background: "none", cursor: "pointer", color: "var(--muted)" }}
                >
                  Clear
                </button>
              )}
              {!authLoading && !user && (
                <button
                  onClick={() => fas.auth.signIn()}
                  style={{ background: "var(--accent)", color: "#fff", borderRadius: "0.75rem", padding: "0.375rem 1rem", fontWeight: 600, fontSize: "0.875rem", border: "none", cursor: "pointer" }}
                >
                  Sign in
                </button>
              )}
              {user && (
                <span style={{ background: "var(--panel)", borderRadius: "0.75rem", padding: "0.25rem 0.75rem", fontSize: "0.75rem", color: "var(--muted)" }}>
                  👤 {user.login}
                </span>
              )}
            </div>
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: "auto", paddingBottom: "0.75rem" }}>

            {/* Empty state */}
            {messages.length === 0 && !busy && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: "1rem" }}>
                <div style={{ fontSize: "3.5rem", marginBottom: "0.75rem" }}>🍽️</div>
                <h2 style={{ fontFamily: "Fraunces, serif", fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                  What would you like to cook?
                </h2>
                <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "1.5rem", maxWidth: "22rem" }}>
                  Search for any recipe and I'll show you exactly how to make it, step by step.
                </p>

                {!user && !authLoading && (
                  <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "1rem", padding: "1.25rem", marginBottom: "1.25rem", width: "100%", maxWidth: "20rem" }}>
                    <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Sign in to get started</p>
                    <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.75rem" }}>One tap with GitHub — no password needed.</p>
                    <button
                      onClick={() => fas.auth.signIn()}
                      style={{ width: "100%", background: "var(--accent)", color: "#fff", borderRadius: "0.75rem", padding: "0.5rem", fontWeight: 600, border: "none", cursor: "pointer" }}
                    >
                      Sign in with GitHub
                    </button>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", width: "100%", maxWidth: "28rem" }}>
                  {QUICK_SEARCHES.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setInput(s.replace(/^.\s/, "")); setTimeout(() => inputRef.current?.focus(), 50); }}
                      style={{ textAlign: "left", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "1rem", padding: "0.75rem 1rem", fontSize: "0.875rem", cursor: "pointer", color: "var(--ink)" }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {messages.map((m) => (
                <div key={m.id} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  {m.role === "assistant" && (
                    <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: "0.5rem", marginTop: "0.25rem", fontSize: "1rem" }}>
                      👨‍🍳
                    </div>
                  )}
                  <div
                    style={{
                      maxWidth: "85%",
                      borderRadius: m.role === "user" ? "1rem 1rem 0.25rem 1rem" : "1rem 1rem 1rem 0.25rem",
                      padding: "0.75rem 1rem",
                      ...(m.role === "user"
                        ? { background: "var(--accent)", color: "#fff" }
                        : { background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }),
                    }}
                  >
                    {m.role === "assistant" ? <RecipeDisplay text={m.text} /> : <p style={{ fontSize: "0.875rem" }}>{m.text}</p>}
                  </div>
                </div>
              ))}

              {/* Loading */}
              {busy && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: "0.5rem", marginTop: "0.25rem", fontSize: "1rem" }}>
                    👨‍🍳
                  </div>
                  <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "1rem 1rem 1rem 0.25rem", padding: "0.75rem 1rem" }}>
                    <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                      {[0, 150, 300].map((d) => (
                        <span
                          key={d}
                          className="animate-bounce"
                          style={{ width: "0.4rem", height: "0.4rem", borderRadius: "50%", background: "var(--accent)", display: "inline-block", animationDelay: `${d}ms` }}
                        />
                      ))}
                      <span style={{ fontSize: "0.75rem", color: "var(--muted)", marginLeft: "0.5rem" }}>Finding your recipe…</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Follow-up chips */}
          {messages.some((m) => m.role === "assistant") && !busy && (
            <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.5rem", flexShrink: 0, scrollbarWidth: "none" }}>
              {FOLLOW_UPS.map((t) => (
                <button
                  key={t}
                  onClick={() => { setInput(t); setTimeout(() => inputRef.current?.focus(), 50); }}
                  style={{ flexShrink: 0, background: "var(--panel)", border: "1px solid var(--line-strong)", borderRadius: "9999px", padding: "0.25rem 0.75rem", fontSize: "0.75rem", cursor: "pointer", color: "var(--ink)", whiteSpace: "nowrap" }}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ flexShrink: 0, marginTop: "0.5rem", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "1rem", display: "flex", alignItems: "flex-end", gap: "0.5rem", padding: "0.75rem" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder={user ? "Search for a recipe, e.g. “pasta carbonara”…" : "Sign in to start cooking…"}
              disabled={busy || !user}
              rows={1}
              style={{
                flex: 1, resize: "none", background: "transparent", outline: "none",
                fontSize: "0.875rem", lineHeight: 1.5, padding: "0.125rem 0",
                color: "var(--ink)", border: "none", maxHeight: "7rem",
                opacity: busy || !user ? 0.5 : 1,
                fontFamily: "inherit",
              }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 112) + "px";
              }}
            />
            <button
              onClick={() => void sendMessage()}
              disabled={busy || !input.trim() || !user}
              style={{
                flexShrink: 0, width: "2.25rem", height: "2.25rem", borderRadius: "0.75rem",
                background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: busy || !input.trim() || !user ? 0.3 : 1,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>

        </div>
      )}
    </Shell>
  );
}
