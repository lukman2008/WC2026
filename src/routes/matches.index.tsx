import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Filter, X, Loader2 } from "lucide-react";
import { MatchCard } from "@/components/MatchCard";
import { supabase } from "@/integrations/supabase/client";
import type { Match } from "@/lib/match-data";

export const Route = createFileRoute("/matches/")({
  head: () => ({
    meta: [
      { title: "Match Schedule — FIFA World Cup 2026 Tickets" },
      { name: "description", content: "Browse all FIFA World Cup 2026 matches. Filter by team, stadium, or stage and buy tickets." },
      { property: "og:title", content: "Match Schedule — FIFA World Cup 2026" },
      { property: "og:description", content: "Browse all FIFA World Cup 2026 matches and buy tickets." },
    ],
  }),
  component: MatchesPage,
});

function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [team, setTeam] = useState("");
  const [stadium, setStadium] = useState("");
  const [stage, setStage] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("matches").select("*").order("match_date", { ascending: true });
      if (data) {
        const mapped: Match[] = data.map((m) => ({
          id: m.id,
          homeTeam: m.home_team,
          awayTeam: m.away_team,
          homeFlag: m.home_flag,
          awayFlag: m.away_flag,
          stadium: m.stadium,
          city: m.city,
          date: m.match_date.split("T")[0],
          time: new Date(m.match_date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
          group: m.group_name || "",
          stage: m.stage,
          ticketsAvailable: { vip: m.available_vip, regular: m.available_regular, economy: m.available_economy },
          prices: { vip: Number(m.price_vip), regular: Number(m.price_regular), economy: Number(m.price_economy) },
          stadiumImage: "",
        }));
        setMatches(mapped);
      }
      setLoading(false);
    })();
  }, []);

  const allTeams = useMemo(() => [...new Set(matches.flatMap(m => [m.homeTeam, m.awayTeam]).filter(t => t !== "TBD"))].sort(), [matches]);
  const allStadiums = useMemo(() => [...new Set(matches.map(m => m.stadium))].sort(), [matches]);
  const allStages = useMemo(() => [...new Set(matches.map(m => m.stage))], [matches]);

  const filtered = useMemo(() => {
    return matches.filter(m => {
      const q = search.toLowerCase();
      const matchesSearch = !q || m.homeTeam.toLowerCase().includes(q) || m.awayTeam.toLowerCase().includes(q) || m.stadium.toLowerCase().includes(q) || m.city.toLowerCase().includes(q);
      const matchesTeam = !team || m.homeTeam === team || m.awayTeam === team;
      const matchesStadium = !stadium || m.stadium === stadium;
      const matchesStage = !stage || m.stage === stage;
      return matchesSearch && matchesTeam && matchesStadium && matchesStage;
    });
  }, [matches, search, team, stadium, stage]);

  const hasFilters = team || stadium || stage;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Match Schedule</h1>
        <p className="mt-2 text-muted-foreground">Browse all matches and secure your tickets</p>
      </div>

      <div className="mb-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search teams, stadiums, cities..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-input pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              showFilters || hasFilters ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasFilters && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{[team, stadium, stage].filter(Boolean).length}</span>}
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
            <select value={team} onChange={e => setTeam(e.target.value)} className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/40">
              <option value="">All Teams</option>
              {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={stadium} onChange={e => setStadium(e.target.value)} className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/40">
              <option value="">All Stadiums</option>
              {allStadiums.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={stage} onChange={e => setStage(e.target.value)} className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/40">
              <option value="">All Stages</option>
              {allStages.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {hasFilters && (
              <button onClick={() => { setTeam(""); setStadium(""); setStage(""); }} className="inline-flex items-center gap-1 text-xs font-medium text-destructive hover:underline">
                <X className="h-3 w-3" />
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-lg font-semibold text-foreground">No matches found</p>
          <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((match, i) => (
            <MatchCard key={match.id} match={match} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
