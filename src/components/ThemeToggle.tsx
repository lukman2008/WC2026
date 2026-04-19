import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";

function getInitial(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem("theme") as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const initial = getInitial();
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
    document.documentElement.classList.toggle("light", initial === "light");
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.classList.toggle("light", next === "light");
  };

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground ${className}`}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
