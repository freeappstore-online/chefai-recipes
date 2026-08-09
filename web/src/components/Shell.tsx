import type { ReactNode } from "react";

interface NavItem {
  id: string;
  icon: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

interface ShellProps {
  children: ReactNode;
  navItems?: NavItem[];
  title?: string;
}

export function Shell({ children, navItems = [], title = "ChefAI" }: ShellProps) {
  return (
    <>
      <div className="hidden md:flex h-screen" style={{ background: "var(--paper)", color: "var(--ink)" }}>
        <aside
          className="flex flex-col border-r h-full shrink-0"
          style={{ width: "17rem", borderColor: "var(--line)", background: "var(--panel)" }}
        >
          <div className="p-6 text-xl font-bold" style={{ fontFamily: "Fraunces, serif" }}>
            {title}
          </div>
          <nav className="flex-1 px-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={item.onClick}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-left transition-opacity hover:opacity-80"
                style={{
                  background: item.active ? "var(--accent)" : "transparent",
                  color: item.active ? "#fff" : "var(--ink)",
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="p-4 text-xs" style={{ color: "var(--muted)" }}>
            <a
              href="https://freeappstore.online"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--muted)" }}
              className="hover:underline"
            >
              Part of FreeAppStore — free forever
            </a>
          </div>
        </aside>
        <main className="flex-1 overflow-hidden flex flex-col" style={{ padding: "2rem" }}>
          {children}
        </main>
      </div>

      <div className="flex flex-col h-screen md:hidden" style={{ background: "var(--paper)", color: "var(--ink)" }}>
        <header
          className="flex items-center px-4 shrink-0"
          style={{ height: "3.5rem", borderBottom: "1px solid var(--line)", background: "var(--panel)" }}
        >
          <span className="font-bold text-lg" style={{ fontFamily: "Fraunces, serif" }}>
            {title}
          </span>
        </header>
        <main className="flex-1 overflow-hidden flex flex-col" style={{ padding: "1rem" }}>
          {children}
        </main>
        {navItems.length > 0 && (
          <nav
            className="flex items-center justify-around shrink-0"
            style={{ height: "4rem", borderTop: "1px solid var(--line)", background: "var(--dock)" }}
          >
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={item.onClick}
                className="flex flex-col items-center gap-0.5 px-4 py-1 transition-opacity hover:opacity-70"
                style={{ color: item.active ? "var(--accent)" : "var(--muted)" }}
              >
                <span style={{ fontSize: "1.25rem" }}>{item.icon}</span>
                <span style={{ fontSize: "0.7rem", fontWeight: 500 }}>{item.label}</span>
              </button>
            ))}
          </nav>
        )}
      </div>
    </>
  );
}
