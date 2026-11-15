"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
const KEY = "expected-circumstances-theme";
const OPTIONS: { value: Theme; icon: string; title: string }[] = [
  { value: "light", icon: "☀", title: "Light" },
  { value: "dark", icon: "☾", title: "Dark" },
  { value: "system", icon: "◐", title: "System" },
];

function applyTheme(theme: Theme) {
  if (theme === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      const preference: Theme = saved === "light" || saved === "dark" ? saved : "system";
      setTheme(preference);
      applyTheme(preference);
    } catch {
      applyTheme("system");
    }
    setReady(true);
  }, []);

  function selectTheme(next: Theme) {
    setTheme(next);
    applyTheme(next);
    try { window.localStorage.setItem(KEY, next); } catch { /* Storage disabled. */ }
  }

  return (
    <div className="theme-switch" role="group" aria-label="Website color theme">
      {OPTIONS.map(option => (
        <button
          key={option.value}
          type="button"
          aria-label={`${option.title} theme`}
          aria-pressed={ready && theme === option.value}
          className={`theme-option ${ready && theme === option.value ? "is-active" : ""}`}
          onClick={() => selectTheme(option.value)}
          title={`${option.title} theme`}
        >
          <span aria-hidden="true">{option.icon}</span>
          <span className="theme-name">{option.title}</span>
        </button>
      ))}
    </div>
  );
}
