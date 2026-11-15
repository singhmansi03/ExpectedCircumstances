"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
const STORAGE_KEY = "expected-circumstances-theme";

function applyTheme(theme: Theme) {
  const dark = theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const preference: Theme = stored === "dark" || stored === "light" ? stored : "system";
    setTheme(preference);
    applyTheme(preference);
    const systemPreference = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved !== "dark" && saved !== "light") applyTheme("system");
    };
    systemPreference.addEventListener("change", onSystemChange);
    return () => systemPreference.removeEventListener("change", onSystemChange);
  }, []);

  function updateTheme(next: Theme) {
    setTheme(next);
    if (next === "system") window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  return (
    <div className="theme-switcher" role="group" aria-label="Website color theme">
      <button type="button" className={theme === "light" ? "theme-option is-active" : "theme-option"}
        onClick={() => updateTheme("light")} aria-pressed={theme === "light"} title="Light theme">☀ <span>Light</span></button>
      <button type="button" className={theme === "dark" ? "theme-option is-active" : "theme-option"}
        onClick={() => updateTheme("dark")} aria-pressed={theme === "dark"} title="Dark theme">☾ <span>Dark</span></button>
      <button type="button" className={theme === "system" ? "theme-option is-active" : "theme-option"}
        onClick={() => updateTheme("system")} aria-pressed={theme === "system"} title="Match device theme">◉ <span>Auto</span></button>
    </div>
  );
}
