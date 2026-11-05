"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Read directly from DOM to sync state
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Query DOM state directly
    const isCurrentlyDark = document.documentElement.classList.contains("dark");
    const next = isCurrentlyDark ? "light" : "dark";

    const root = document.documentElement;
    const body = document.body;

    if (next === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      if (body) {
        body.classList.add("dark");
        body.classList.remove("light");
      }
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
      if (body) {
        body.classList.add("light");
        body.classList.remove("dark");
      }
    }

    try {
      localStorage.setItem("nivaran_theme", next);
    } catch (err) {}

    setTheme(next);
  };

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label="Toggle theme"
      title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm select-none bg-[#F0ECE7] border-[#EAE5DE] text-[#8C6A4F] hover:border-[#8C6A4F]/50 dark:bg-[#2B241E] dark:border-white/10 dark:text-[#E2BA91] dark:hover:border-[#E2BA91]/50 ${className}`}
    >
      <Sun className="w-4 h-4 transition-transform duration-300 dark:hidden" />
      <Moon className="w-4 h-4 transition-transform duration-300 hidden dark:block" />
    </button>
  );
}

export default ThemeToggle;
