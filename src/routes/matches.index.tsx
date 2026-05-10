import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { MatchCard } from "@/components/MatchCard";
import { supabase } from "@/integrations/supabase/client";
import type { Match } from "@/lib/match-data";

export const Route = createFileRoute("/matches/")({
  head: () => ({
    meta: [
      { title: "Browse Matches — FIFA World Cup 2026 Tickets" },
      { name: "description", content: "Browse World Cup 2026 matches and buy tickets in VIP, Regular, or Economy." },
      { property: "og:title", content: "Browse Matches — World Cup 2026 Tickets" },
      { property: "og:description", content: "Pick your match, choose your section, and pay with crypto." },
    ],
  }),
  component: MatchesPage,
});

interface DbMatch {
  id: string;
  home_team: string;
  away_team: string;
  home_flag: string;
  away_flag: string;
  match_date: string;
  group_name: string | null;
  stage: string;
  price_vip: number;
  price_regular: number;
  price_economy: number;
  available_vip: number;
  available_regular: number;
  available_economy: number;
  stadium: string;
  city: string;
}

const detectedTZ = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";

type SortKey = "soonest" | "cheapest" | "availability";

function MatchesPage() {
  const [dbMatches, setDbMatches] = useState<DbMatch[] | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("soonest");
  const [stage, setStage] = useState<string>("All");
  const [city, setCity] = useState<string>("All");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("matches")
        .select("id,home_team,away_team,home_flag,away_flag,match_date,group_name,stage,price_vip,price_regular,price_economy,available_vip,available_regular,available_economy,stadium,city")
        .order("match_date", { ascending: true });
      if (active) setDbMatches((data as DbMatch[]) ?? []);
    })();
    return () => { active = false; };
  }, []);

  const matches: Match[] = useMemo(() => {
    if (!dbMatches) return [];
    const userTZ = detectedTZ;
    return dbMatches.map(m => {
      const d = new Date(m.match_date);
      return {
        id: m.id,
        homeTeam: m.home_team,
        awayTeam: m.away_team,
        homeFlag: m.home_flag,
        awayFlag: m.away_flag,
        stadium: m.stadium,
        city: m.city,
        date: d.toISOString(),
        time: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", timeZone: userTZ }),
        dateObj: d,
        group: m.group_name || "",
        stage: m.stage,
        ticketsAvailable: { vip: m.available_vip, regular: m.available_regular, economy: m.available_economy },
        prices: { vip: Number(m.price_vip), regular: Number(m.price_regular), economy: Number(m.price_economy) },
        stadiumImage: "",
      };
    });
  }, [dbMatches]);

  const stageOptions = useMemo(() => {
    const set = new Set<string>();
    for (const m of matches) set.add(m.stage);
    return ["All", ...Array.from(set).sort()];
  }, [matches]);

  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    for (const m of matches) set.add(m.city);
    return ["All", ...Array.from(set).sort()];
  }, [matches]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byStage = stage === "All" ? matches : matches.filter(m => m.stage === stage);
    const byCity = city === "All" ? byStage : byStage.filter(m => m.city === city);
    const byQuery = q.length === 0 ? byCity : byCity.filter(m => {
      return (
        m.homeTeam.toLowerCase().includes(q) ||
        m.awayTeam.toLowerCase().includes(q) ||
        m.city.toLowerCase().includes(q) ||
        m.stadium.toLowerCase().includes(q) ||
        m.stage.toLowerCase().includes(q) ||
        m.group.toLowerCase().includes(q)
      );
    });

    const sorted = [...byQuery].sort((a, b) => {
      if (sort === "soonest") return a.dateObj.getTime() - b.dateObj.getTime();
      if (sort === "cheapest") {
        const ap = Math.min(a.prices.vip, a.prices.regular, a.prices.economy);
        const bp = Math.min(b.prices.vip, b.prices.regular, b.prices.economy);
        return ap - bp;
      }
      const aa = a.ticketsAvailable.vip + a.ticketsAvailable.regular + a.ticketsAvailable.economy;
      const ba = b.ticketsAvailable.vip + b.ticketsAvailable.regular + b.ticketsAvailable.economy;
      return ba - aa;
    });

    return sorted;
  }, [matches, query, stage, city, sort]);

  const clearFilters = () => {
    setQuery("");
    setStage("All");
    setCity("All");
    setSort("soonest");
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">Browse Matches</h1>
                <p className="mt-2 text-sm text-muted-foreground">Choose a match, pick your section, and pay with crypto.</p>
              </div>
              <Link
                to="/"
                className="hidden sm:inline-flex items-center rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary/50"
              >
                Back home
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search teams, city, stadium, stage…"
                  className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFiltersOpen(v => !v)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary/50"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                </button>
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary/50"
                >
                  <X className="h-4 w-4" />
                  Reset
                </button>
              </div>
            </div>

            {filtersOpen && (
              <div className="rounded-xl border border-border bg-background p-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Stage</label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    {stageOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">City</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Sort</label>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                    className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="soonest">Soonest</option>
                    <option value="cheapest">Lowest price</option>
                    <option value="availability">Most available</option>
                  </select>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{dbMatches ? `${filtered.length} match${filtered.length !== 1 ? "es" : ""}` : "Loading matches…"}</span>
              <span>Times shown in your local timezone ({detectedTZ})</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {!dbMatches ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading matches…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <p className="text-lg font-bold text-foreground">No matches found</p>
            <p className="mt-2 text-sm text-muted-foreground">Try changing filters or search terms.</p>
            <button
              onClick={clearFilters}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow-primary hover:opacity-90"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((m, i) => (
              <MatchCard key={m.id} match={m} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
