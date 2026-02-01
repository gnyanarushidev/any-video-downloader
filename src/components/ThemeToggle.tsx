"use client";

import { useTheme } from "@/components/ThemeProvider";
import { FaMoon, FaSun } from "react-icons/fa";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark and light theme"
      className="group flex items-center gap-2 rounded-full bg-[color:var(--chip-bg)] px-3 py-2 text-sm font-medium text-[color:var(--text-primary)] shadow-sm ring-1 ring-[color:var(--border-muted)] transition hover:translate-y-[-1px] hover:shadow-lg">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--accent-ghost)] text-[color:var(--accent-foreground)] transition group-hover:scale-105">
        {isDark ? <FaMoon size={14} /> : <FaSun size={14} />}
      </span>
      <span className="hidden sm:inline">{isDark ? "Dark" : "Light"} mode</span>
      <span className="sm:hidden">{isDark ? "Dark" : "Light"}</span>
    </button>
  );
}
