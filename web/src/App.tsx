import { useState, useEffect, useRef } from "react";
import { Shell } from "./components/Shell";
import { initApp } from "@freeappstore/sdk";
import { useAuth } from "@freeappstore/sdk/hooks";

const fas = initApp({ appId: "chefai-recipes" });

const STORAGE_KEY = "chefai_avoid";

const PRESETS = ["gluten", "dairy", "nuts", "eggs", "shellfish", "soy", "meat", "alcohol", "spicy", "sugar"];

const SUGGESTIONS = [
  "🥗 Summer salad",
  "🍝 Quick pasta",
  "🥞 Fluffy pancakes",
  "🍲 Winter soup",
  "🌮 Easy tacos",
  "🎂 Chocolate cake",
  "🍛 Chicken curry",
  "🥦 Stir fry",
];

const TWEAKS = [
  "I don't have that utensil — alternatives?",
  "Make it vegetarian",
  "Simpler version please",
  "What can I substitute?",
  "Scale for 2 people",
  "More flavour tips",
];

type ChatMsg = { id: string; role: "user" | "assistant"; content: string };

function RecipeText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("# ")) {
          return <h2 key={i} className="text-lg font-bold mt-2" style={{ fontFamily: "Fraunces, serif", color: "var(--accent)" }}>{line.slice(2)}</h2>;
        }
        if (line.startsWith("## ")) {
          return <h3 key={i} className="text-base font-bold mt-3 mb-1" style={{ fontFamily: "Fraunces, serif" }}>{line.slice(3)}</h3>;
        }
        if (line.startsWith("### ")) {
          return <h4 key={i} className="text-sm font-bold mt-2" style={{ fontFamily: "Fraunces, serif" }}>{line.slice(4)}</h4>;
        }
        const numMatch = line.match(/^(\d+)\.\s(.+)$/);
        if (numMatch) {
          return (
            <div key={i} className="flex gap-2 items-start py-0.5">
              <span className="shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5" style={{ background: "var(--accent)", color: "#fff" }}>{numMatch[1]}</span>
              <span className="leading-relaxed text-sm">{numMatch[2]}</span>
            </div>
          );
        }
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div key={i} className="flex gap-2 items-start py-0.5">
              <span className="shrink-0 w-1.5 h-1.5 rounded-full mt-2" style={{ background: "var(--accent)" }} />
              <span className="leading-relaxed text-sm">{line.slice(2)}</span>
            </div>
          );
        }
        if (line.trim() === "" || line.trim() === "---") return <div key={i} className="h-1" />;
        return <p key={i} className="text-sm leading-relaxed">{line}</p>;
      })}
    </div>
  );
}

export default function App() {
  const { user, loading: authLoading } = useAuth(fas);
  const [view, setView] = useState<"chat" | "diet">("chat");
  const [avoid, setAvoid] = useState<string[]>([]);
  const [avoidInput, setAvoidInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) setAvoid(JSON.parse(s));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(avoid));
  }, [avoid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function addAvoid() {
    const v = avoidInput.trim().toLowerCase();
    if (v && !avoid.includes(v)) {
      setAvoid(p => [...p, v]);
      setAvoidInput("");
    }
  }

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading || !user) return;

    const userMsg: ChatMsg = { id: String(Date.now()), role: "user", content: msg };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);

    const avoidLine = avoid.length > 0
      ? `IMPORTANT: Never include these ingredients or foods: ${avoid.join(", ")}.`
      : "";

    const systemPrompt = `You are ChefAI, a friendly personal chef. ${avoidLine}
When asked for a recipe, always provide: recipe name (as # heading), short description, prep time, cook time, servings, then ## Ingredients (bullet list), then ## Instructions (numbered steps), then ## Tips (optional). Keep steps clear and beginner-friendly. For follow-up questions about substitutions or missing utensils, give practical alternatives immediately.`;

    try {
      const res = await fas.proxy.fetch("api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            ...history.map(m => ({ role: m.role, content: m.content })),
          ],
          max_tokens: 1200,
          temperature: 0.7,
        }),
      });

      const data = await res.json() as { choices?: { message?: { content?: string } }[] };
      const reply = data?.choices?.[0]?.message?.content ?? "Sorry, I couldn't get a recipe right now. Please try again!";
      setMessages(p => [...p, { id: String(Date.now() + 1), role: "assistant", content: reply }]);
    } catch {
      setMessages(p => [...p, { id: String(Date.now() + 1), role: "assistant", content: "Something went wrong. Please try again! 🍳" }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  const navItems = [
    { id: "chat", icon: "🍳", label: "Recipes", active: view === "chat", onClick: () => setView("chat") },
    { id: "diet", icon: "🚫", label: "My Diet", active: view === "diet", onClick: () => setView("diet") },
  ];

  return (
    <Shell navItems={navItems} title="ChefAI">

      {/* ── Diet Settings ── */}
      {view === "diet" && (
        <div className="max-w-lg mx-auto w-full overflow-y-auto pb-8">
          <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: "Fraunces, serif" }}>My Diet</h1>
          <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>ChefAI will never use these in any recipe.</p>

          <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
            <div className="flex gap-2">
              <input
                value={avoidInput}
                onChange={e => setAvoidInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addAvoid()}
                placeholder="e.g. peanuts, dairy, spicy…"
                className="flex-1 rounded-xl px-4 py-2 text-sm outline-none"
                style={{ background: "var(--paper)", border: "1px solid var(--line)", color: "var(--ink)" }}
              />
              <button onClick={addAvoid} className="px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80" style={{ background: "var(--accent)", color: "#fff" }}>
                Add
              </button>
            </div>
          </div>

          {avoid.length > 0 && (
            <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
              <p className="text-xs font-semibold mb-3" style={{ color: "var(--muted)" }}>AVOIDING ({avoid.length})</p>
              <div className="flex flex-wrap gap-2">
                {avoid.map(r => (
                  <span key={r} className="flex items-center gap-1 px-3 py-1 rounded-full text-sm" style={{ background: "var(--paper)", border: "1px solid var(--line-strong)" }}>
                    🚫 {r}
                    <button onClick={() => setAvoid(p => p.filter(x => x !== r))} className="ml-1 font-bold hover:opacity-60" style={{ color: "var(--error)" }}>×</button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs font-semibold mb-2" style={{ color: "var(--muted)" }}>QUICK ADD</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {PRESETS.map(p => (
              <button key={p} onClick={() => { if (!avoid.includes(p)) setAvoid(a => [...a, p]); }}
                disabled={avoid.includes(p)}
                className="px-3 py-1 rounded-full text-sm hover:opacity-70 disabled:opacity-40"
                style={{ background: "var(--panel)", border: "1px solid var(--line-strong)", color: "var(--ink)" }}>
                {avoid.includes(p) ? "✓ " : "+ "}{p}
              </button>
            ))}
          </div>

          <button onClick={() => setView("chat")} className="w-full py-3 rounded-xl font-semibold hover:opacity-80" style={{ background: "var(--accent)", color: "#fff" }}>
            Start Cooking 🍳
          </button>
        </div>
      )}

      {/* ── Chat ── */}
      {view === "chat" && (
        <div className="flex flex-col h-full w-full max-w-3xl mx-auto">

          {/* Top bar */}
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div>
              <h1 className="text-xl font-bold" style={{ fontFamily: "Fraunces, serif" }}>ChefAI 👨‍🍳</h1>
              {avoid.length > 0 && (
                <p className="text-xs" style={{ color: "var(--muted)" }}>Avoiding: {avoid.slice(0, 3).join(", ")}{avoid.length > 3 ? ` +${avoid.length - 3} more` : ""}</p>
              )}
            </div>
            <div className="flex gap-2 items-center">
              {messages.length > 0 && (
                <button onClick={() => setMessages([])} className="px-3 py-1 rounded-lg text-xs hover:opacity-70" style={{ border: "1px solid var(--line)", color: "var(--muted)" }}>Clear</button>
              )}
              {!authLoading && !user && (
                <button onClick={() => fas.auth.signIn()} className="px-4 py-1.5 rounded-xl text-sm font-semibold hover:opacity-80" style={{ background: "var(--accent)", color: "#fff" }}>Sign in</button>
              )}
              {user && (
                <span className="text-xs px-3 py-1.5 rounded-xl" style={{ background: "var(--panel)", color: "var(--muted)" }}>👤 {user.login}</span>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 pb-3">

            {/* Empty state */}
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="text-5xl mb-3">🍽️</div>
                <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "Fraunces, serif" }}>What would you like to cook?</h2>
                <p className="text-sm mb-6 max-w-xs" style={{ color: "var(--muted)" }}>Search for any recipe and I'll show you step-by-step how to make it.</p>

                {!user && !authLoading && (
                  <div className="rounded-2xl p-5 mb-5 w-full max-w-xs" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
                    <p className="font-semibold mb-1">Sign in to get started</p>
                    <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>One tap with GitHub.</p>
                    <button onClick={() => fas.auth.signIn()} className="w-full py-2 rounded-xl font-semibold hover:opacity-80" style={{ background: "var(--accent)", color: "#fff" }}>Sign in with GitHub</button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => { setInput(s.replace(/^.\s/, "")); setTimeout(() => inputRef.current?.focus(), 50); }}
                      className="text-left px-4 py-3 rounded-2xl text-sm hover:scale-[1.02] transition-transform"
                      style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat bubbles */}
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1 text-base">👨‍🍳</div>}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.role === "user" ? "rounded-br-sm" : "rounded-bl-sm"}`}
                  style={m.role === "user"
                    ? { background: "var(--accent)", color: "#fff" }
                    : { background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }}
                >
                  {m.role === "assistant" ? <RecipeText text={m.content} /> : <p className="text-sm">{m.content}</p>}
                </div>
              </div>
            ))}

            {/* Loading */}
            {loading && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1 text-base">👨‍🍳</div>
                <div className="rounded-2xl rounded-bl-sm px-4 py-3" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
                  <div className="flex gap-1 items-center">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--accent)", animationDelay: `${d}ms` }} />
                    ))}
                    <span className="text-xs ml-2" style={{ color: "var(--muted)" }}>Finding your recipe…</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick tweaks */}
          {messages.some(m => m.role === "assistant") && !loading && (
            <div className="flex gap-2 overflow-x-auto pb-2 shrink-0" style={{ scrollbarWidth: "none" }}>
              {TWEAKS.map(t => (
                <button key={t} onClick={() => { setInput(t); setTimeout(() => inputRef.current?.focus(), 50); }}
                  className="shrink-0 px-3 py-1 rounded-full text-xs font-medium hover:opacity-70 whitespace-nowrap"
                  style={{ background: "var(--panel)", border: "1px solid var(--line-strong)", color: "var(--ink)" }}>
                  {t}
                </button>
              ))}
            </div>
          )}

          {/* Input box */}
          <div className="shrink-0 mt-2 rounded-2xl flex items-end gap-2 p-3" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={user ? "Search for a recipe, e.g. "summer salad"…" : "Sign in to start cooking…"}
              disabled={loading || !user}
              rows={1}
              className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed py-1 disabled:opacity-50"
              style={{ color: "var(--ink)", maxHeight: "7rem" }}
              onInput={e => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 112) + "px"; }}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim() || !user}
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center hover:opacity-80 disabled:opacity-30"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}
