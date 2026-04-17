import { useMemo, useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { ALL_COUNTRIES, getCountryByCode } from "@/lib/countries";
import { Flag } from "./Flag";

interface CountrySelectProps {
  value: string | null;
  onChange: (code: string | null) => void;
  placeholder?: string;
}

export function CountrySelect({ value, onChange, placeholder = "Select your country" }: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = getCountryByCode(value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_COUNTRIES;
    return ALL_COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <span className="flex items-center gap-2.5">
          {selected ? (
            <>
              <Flag code={selected.code} fallbackEmoji={selected.flag} size={18} />
              <span className="truncate">{selected.name}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-lg border border-border bg-popover shadow-elevated overflow-hidden">
          <div className="relative border-b border-border">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country…"
              className="w-full bg-transparent pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-center text-xs text-muted-foreground">No countries found</li>
            )}
            {filtered.map((c) => {
              const isSelected = c.code === value;
              return (
                <li key={c.code}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(c.code);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-secondary ${
                      isSelected ? "bg-secondary/60" : ""
                    }`}
                  >
                    <Flag code={c.code} fallbackEmoji={c.flag} size={16} />
                    <span className="flex-1 truncate text-foreground">{c.name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{c.code}</span>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
