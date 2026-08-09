import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { Shell } from "./components/Shell";
import { initApp } from "@freeappstore/sdk";
import { useAuth } from "@freeappstore/sdk/hooks";

const fas = initApp({ appId: "chefai-recipes" });

const STORAGE_KEY = "chefai_restrictions";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function formatRecipeContent(text: string): ReactNode {
  const lines = text.split("\n");
  return (
    <div>
      {lines.map((line, i) => {
        if (line.startsWith("### ")) {
          return (
            <h3 key={i} className="text-base font-bold mt-4 mb-1" style={{ fontFamily: "Fraunces, serif", color: "var(--ink)" }}>
              {line.slice(4)}
            </h3>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h2 key={i} className="text-lg font-bold mt-5 mb-2" style={{ fontFamily: "Fraunces, serif", color: "var(--ink)" }}>
              {line.slice(3)}
            </h2>
          );
        }
        if (line.startsWith("# ")) {
          return (
            <h1 key={i} className="text-xl font-bold mt-2 mb-3" style={{ fontFamily: "Fraunces, serif", color: "var(--accent)" }}>
              {line.slice(2)}
            </h1>
          );
        }
        const numberedMatch = line.match(/^(\d+)\.\s(.*)$/);
        if (numberedMatch) {
          return (
            <div key={i} className="flex gap-3 my-2">
              <span
                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                {numberedMatch[1]}
              </span>
              <span className="pt-0.5 leading-relaxed">{renderInline(numberedMatch[2])}</span>
            </div>
          );
        }
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div key={i} className="flex gap-2 my-1">
              <span className="shrink-0 mt-2 w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
              <span className="leading-relaxed">{renderInline(line.slice(2))}</span>
            </div>
          );
        }
        if (line.trim() === "---") {
          return <hr key={i} className="my-4" style={{ borderColor: "var(--line)" }} />;
        }
        if (line.trim() === "") {
          return <div key={i} className="h-1" />;
        }
        return (
          <p key={i} className="leading-relaxed my-1">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}

const SUGGESTED_PROMPTS = [
  { emoji: "🥗", text: "Give me a summer salad recipe" },
  { emoji: "🍝", text: "Quick 20-minute pasta dinner" },
  { emoji: "🥞", text: "Fluffy weekend pancakes" },
  { emoji: "🍲", text: "Cosy winter soup recipe" },
  { emoji: "🌮", text: "Easy taco night ideas" },
  { emoji: "🎂", text: "Simple chocolate cake" },
];

const QUICK_TWEAKS = [
  "I don't have that utensil — alternatives?",
  "Make it vegetarian",
  "Give me a simpler version",
  "What can I substitute?",
  "Add more flavour tips",
  "Scale it for 2 people",
];

const PRESETS = ["gluten", "dairy", "nuts", "eggs", "shellfish", "soy", "meat", "alcohol", "spicy", "sugar"];

export default function App() {
  const { user, loading: authLoading } = useAuth(fas);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [restrictionInput, setRestrictionInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<"chat" | "settings">("chat");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setRestrictions(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(restrictions));
  }, [restrictions]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const addRestriction = () => {
    const val = restrictionInput.trim().toLowerCase();
    if (val && !restrictions.includes(val)) {
      setRestrictions((prev) => [...prev, val]);
      setRestrictionInput("");
    }
  };

  const removeRestriction = (r: string) => {
    setRestrictions((prev) => prev.filter((x) => x !== r));
  };

  const buildSystemPrompt = useCallback((): string => {
    const restrictionText =
      restrictions.length > 0
        ? `The user CANNOT eat or use: ${restrictions.join(", ")}. Never include these in any recipe or suggestion.`
        : "The user has no dietary restrictions.";

    return `You are ChefAI, a friendly expert personal chef assistant. ${restrictionText}

When asked for a recipe, provide: recipe name, brief description, prep/cook time, servings, full ingredients list, and numbered step-by-step instructions. Use markdown: # for title, ## for sections (Ingredients, Instructions, Tips), numbered lists for steps, bullet points for ingredients.

When a user asks follow-up questions like "I don't have X utensil" or "I don't have X ingredient", suggest practical alternatives immediately. Be warm, encouraging, and conversational. Always stay focused on cooking and recipes.`;
  }, [restrictions]);

  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isLoading) return;

    if (!user) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "assistant", content: "Please sign in to use ChefAI — it only takes one tap! 👆" },
      ]);
      return;
    }

    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const history: Message[] = [
      { role: "system", content: buildSystemPrompt() },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: text },
    ];

    try {
      const response = await fas.proxy.fetch("api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: history,
          max_tokens: 1500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json() as { choices: { message: { content: string } }[] };
      const content = data.choices?.[0]?.message?.content ?? "Sorry, I couldn't generate a recipe right now. Please try again!";

      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: "Oops! Something went wrong. Please try again in a moment. 🍳" },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, isLoading, messages, buildSystemPrompt, user]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const navItems = [
    { id: "chat", icon: "🍳", label: "Recipes", active: view === "chat", onClick: () => setView("chat") },
    { id: "settings", icon: "⚙️", label: "My Diet", active: view === "settings", onClick: () => setView("settings") },
  ];

  return (
    <Shell navItems={navItems} title="ChefAI">
      {view === "settings" ? (
        <div className="max-w-xl mx-auto w-full overflow-y-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "Fraunces, serif" }}>
              My Dietary Restrictions
            </h1>
            <p style={{ color: "var(--muted)" }}>
              Add any foods, ingredients, or flavours you can't eat. ChefAI will never include these in your recipes.
            </p>
          </div>

          {/* Add restriction */}
          <div className="rounded-2xl p-5 mb-6" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
            <label className="block text-sm font-semibold mb-2" style={{ color: "var(--muted)" }}>
              ADD A RESTRICTION
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={restrictionInput}
                onChange={(e) => setRestrictionInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addRestriction()}
                placeholder="e.g. peanuts, gluten, spicy, dairy…"
                className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
                style={{ background: "var(--paper)", border: "1px solid var(--line)", color: "var(--ink)" }}
              />
              <button
                onClick={addRestriction}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                Add
              </button>
            </div>
          </div>

          {/* Restriction tags */}
          {restrictions.length > 0 ? (
            <div className="rounded-2xl p-5 mb-6" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
              <label className="block text-sm font-semibold mb-3" style={{ color: "var(--muted)" }}>
                YOUR RESTRICTIONS ({restrictions.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {restrictions.map((r) => (
                  <span
                    key={r}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                    style={{ background: "var(--paper)", border: "1px solid var(--line-strong)", color: "var(--ink)" }}
                  >
                    🚫 {r}
                    <button
                      onClick={() => removeRestriction(r)}
                      className="ml-1 hover:opacity-60 transition-opacity text-base leading-none"
                      style={{ color: "var(--error)" }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-8 text-center mb-6" style={{ background: "var(--panel)", border: "1px dashed var(--line-strong)" }}>
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold">No restrictions yet</p>
              <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                Add foods you can't eat above and ChefAI will always avoid them.
              </p>
            </div>
          )}

          {/* Quick presets */}
          <div className="mb-8">
            <p className="text-sm font-semibold mb-3" style={{ color: "var(--muted)" }}>QUICK PRESETS</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => { if (!restrictions.includes(preset)) setRestrictions((prev) => [...prev, preset]); }}
                  disabled={restrictions.includes(preset)}
                  className="px-3 py-1.5 rounded-full text-sm transition-opacity hover:opacity-70 disabled:opacity-40"
                  style={{ background: "var(--panel)", border: "1px solid var(--line-strong)", color: "var(--ink)" }}
                >
                  {restrictions.includes(preset) ? "✓ " : "+ "}{preset}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setView("chat")}
            className="w-full py-3 rounded-xl font-semibold transition-opacity hover:opacity-80"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Start Cooking 🍳
          </button>
        </div>
      ) : (
        /* Chat view */
        <div className="flex flex-col h-full w-full max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: "Fraunces, serif" }}>ChefAI 👨‍🍳</h1>
              {restrictions.length > 0 && (
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                  Avoiding: {restrictions.slice(0, 4).join(", ")}{restrictions.length > 4 ? ` +${restrictions.length - 4} more` : ""}
                </p>
              )}
            </div>
            <div className="flex gap-2 items-center">
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-70"
                  style={{ border: "1px solid var(--line)", color: "var(--muted)" }}
                >
                  Clear
                </button>
              )}
              {!authLoading && !user && (
                <button
                  onClick={() => fas.auth.signIn()}
                  className="px-4 py-1.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  Sign in
                </button>
              )}
              {user && (
                <span className="text-xs px-3 py-1.5 rounded-xl" style={{ background: "var(--panel)", color: "var(--muted)" }}>
                  👤 {user.login}
                </span>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 pb-4">
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
                <div className="text-6xl mb-4">🍽️</div>
                <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "Fraunces, serif" }}>
                  What would you like to cook?
                </h2>
                <p className="mb-6 max-w-sm" style={{ color: "var(--muted)" }}>
                  Ask me for any recipe! I'll give you step-by-step instructions and help you tweak it along the way.
                </p>

                {!user && !authLoading && (
                  <div
                    className="rounded-2xl p-5 mb-6 w-full max-w-sm"
                    style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
                  >
                    <p className="font-semibold mb-1">Sign in to get started</p>
                    <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>One tap with GitHub — no password needed.</p>
                    <button
                      onClick={() => fas.auth.signIn()}
                      className="w-full px-6 py-2.5 rounded-xl font-semibold transition-opacity hover:opacity-80"
                      style={{ background: "var(--accent)", color: "#fff" }}
                    >
                      Sign in with GitHub
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
                  {SUGGESTED_PROMPTS.map((p) => (
                    <button
                      key={p.text}
                      onClick={() => { setInput(p.text); setTimeout(() => inputRef.current?.focus(), 50); }}
                      className="text-left px-4 py-3 rounded-2xl text-sm transition-all hover:scale-[1.02]"
                      style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }}
                    >
                      {p.emoji} {p.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1 text-lg">👨‍🍳</div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-4 text-sm leading-relaxed ${msg.role === "user" ? "rounded-br-sm" : "rounded-bl-sm"}`}
                  style={
                    msg.role === "user"
                      ? { background: "var(--accent)", color: "#fff" }
                      : { background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }
                  }
                >
                  {msg.role === "assistant" ? formatRecipeContent(msg.content) : msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1 text-lg">👨‍🍳</div>
                <div className="rounded-2xl rounded-bl-sm px-5 py-4" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
                  <div className="flex items-center gap-2" style={{ color: "var(--muted)" }}>
                    <div className="flex gap-1">
                      {[0, 150, 300].map((delay) => (
                        <span
                          key={delay}
                          className="w-2 h-2 rounded-full animate-bounce"
                          style={{ background: "var(--accent)", animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </div>
                    <span className="text-sm">Finding your recipe…</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick tweaks */}
          {messages.some((m) => m.role === "assistant") && !isLoading && (
            <div className="flex gap-2 overflow-x-auto pb-2 shrink-0">
              {QUICK_TWEAKS.map((tweak) => (
                <button
                  key={tweak}
                  onClick={() => { setInput(tweak); setTimeout(() => inputRef.current?.focus(), 50); }}
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-opacity hover:opacity-70 whitespace-nowrap"
                  style={{ background: "var(--panel)", border: "1px solid var(--line-strong)", color: "var(--ink)" }}
                >
                  {tweak}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div
            className="shrink-0 mt-2 rounded-2xl flex items-end gap-3 p-3"
            style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={user ? "Ask for a recipe, or ask a follow-up like "I don't have a whisk"…" : "Sign in to start cooking…"}
              disabled={isLoading || !user}
              rows={1}
              className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed py-1 disabled:opacity-50"
              style={{ color: "var(--ink)", maxHeight: "8rem" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 128) + "px";
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim() || !user}
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:opacity-80 disabled:opacity-30"
              style={{ background: "var(--accent)", color: "#fff" }}
              aria-label="Send"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
