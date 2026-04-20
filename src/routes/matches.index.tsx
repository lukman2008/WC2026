import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Settings, Apple, Smartphone, Loader2 } from "lucide-react";
import { Flag } from "@/components/Flag";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/matches/")({
  head: () => ({
    meta: [
      { title: "TV Schedules — International Football Matches" },
      { name: "description", content: "Round-by-round TV schedule for international football matches grouped by date." },
      { property: "og:title", content: "TV Schedules — International Football" },
      { property: "og:description", content: "Browse upcoming international matches by round and date." },
    ],
  }),
  component: TvSchedulesPage,
});

interface DbMatch {
  id: string;
  home_team: string;
  away_team: string;
  match_date: string;
}

interface ScheduleMatch {
  id: string;
  home: string;
  away: string;
  time: string;
  dateLabel: string;
  ts: number;
}
interface DayGroup {
  date: string;
  matches: ScheduleMatch[];
}
interface Round {
  label: string;
  startISO: string; // inclusive
  endISO: string; // exclusive
  days: DayGroup[];
}

const ROUND_RANGES = [
  { label: "Round 1", startISO: "2026-06-11T00:00:00Z", endISO: "2026-06-18T12:00:00Z" },
  { label: "Round 2", startISO: "2026-06-18T12:00:00Z", endISO: "2026-06-24T12:00:00Z" },
  { label: "Round 3", startISO: "2026-06-24T12:00:00Z", endISO: "2026-06-29T00:00:00Z" },
];

function formatDateLabel(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
}
function formatTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" });
}

function CircleFlag({ team }: { team: string }) {
  return (
    <span className="relative inline-flex h-8 w-8 overflow-hidden rounded-full ring-1 ring-border bg-muted shrink-0">
      <Flag team={team} size={32} rounded={false} className="!h-8 !w-8 scale-150 object-cover" />
    </span>
  );
}

function MatchRow({ match }: { match: ScheduleMatch }) {
  return (
    <Link
      to="/matches/$matchId"
      params={{ matchId: match.id }}
      className="group grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6 px-4 sm:px-6 py-3.5 rounded-xl transition-colors hover:bg-secondary/60 cursor-pointer"
    >
      <div className="flex items-center gap-3 justify-end text-right min-w-0">
        <span className="truncate text-sm sm:text-base font-medium text-foreground">{match.home}</span>
        <CircleFlag team={match.home} />
      </div>
      <div className="px-2 sm:px-4 py-1 rounded-md bg-muted/60 text-xs sm:text-sm font-semibold text-foreground tabular-nums whitespace-nowrap">
        {match.time}
      </div>
      <div className="flex items-center gap-3 justify-start min-w-0">
        <CircleFlag team={match.away} />
        <span className="truncate text-sm sm:text-base font-medium text-foreground">{match.away}</span>
      </div>
    </Link>
  );
}

function TvSchedulesPage() {
  const [roundIdx, setRoundIdx] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dbMatches, setDbMatches] = useState<DbMatch[] | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("matches")
        .select("id,home_team,away_team,match_date")
        .gte("match_date", "2026-06-11")
        .lt("match_date", "2026-06-29")
        .order("match_date", { ascending: true });
      if (active) setDbMatches(data ?? []);
    })();
    return () => { active = false; };
  }, []);

  const rounds: Round[] = useMemo(() => {
    if (!dbMatches) return [];
    return ROUND_RANGES.map(r => {
      const start = new Date(r.startISO).getTime();
      const end = new Date(r.endISO).getTime();
      const inRound = dbMatches.filter(m => {
        const t = new Date(m.match_date).getTime();
        return t >= start && t < end;
      });
      const byDay = new Map<string, ScheduleMatch[]>();
      for (const m of inRound) {
        const d = new Date(m.match_date);
        const dateLabel = formatDateLabel(d);
        const sm: ScheduleMatch = {
          id: m.id,
          home: m.home_team,
          away: m.away_team,
          time: formatTime(d),
          dateLabel,
          ts: d.getTime(),
        };
        if (!byDay.has(dateLabel)) byDay.set(dateLabel, []);
        byDay.get(dateLabel)!.push(sm);
      }
      const days: DayGroup[] = Array.from(byDay.entries())
        .map(([date, matches]) => ({
          date,
          matches: matches.sort((a, b) => a.ts - b.ts),
        }))
        .sort((a, b) => a.matches[0].ts - b.matches[0].ts);
      return { label: r.label, startISO: r.startISO, endISO: r.endISO, days };
    });
  }, [dbMatches]);

  const round = rounds[roundIdx];

  const highlights = useMemo(() => {
    if (!round || round.days.length < 2) return null;
    const lastDay = round.days[round.days.length - 1];
    const prevDay = round.days[round.days.length - 2];
    return { sameDay: prevDay, today: lastDay };
  }, [round]);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top sub-nav */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-4">
            <div className="flex items-center gap-1">
              <Link
                to="/"
                className="px-3 sm:px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                About
              </Link>
              <button className="px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold text-foreground bg-secondary">
                TV schedules
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button aria-label="Settings" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground">
                <Settings className="h-4 w-4" />
              </button>
              <button aria-label="Apple app" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground">
                <Apple className="h-4 w-4" />
              </button>
              <button aria-label="Android app" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground">
                <Smartphone className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Round selector */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setRoundIdx(Math.max(0, roundIdx - 1))}
            disabled={roundIdx === 0}
            aria-label="Previous round"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-secondary transition"
            >
              {round?.label ?? "Round 1"}
              <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {dropdownOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 min-w-[160px] rounded-xl border border-border bg-card shadow-elevated overflow-hidden z-10">
                {ROUND_RANGES.map((r, i) => (
                  <button
                    key={r.label}
                    onClick={() => { setRoundIdx(i); setDropdownOpen(false); }}
                    className={`w-full px-4 py-2.5 text-sm text-left hover:bg-secondary ${i === roundIdx ? "font-semibold text-primary" : "text-foreground"}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setRoundIdx(Math.min(ROUND_RANGES.length - 1, roundIdx + 1))}
            disabled={roundIdx >= ROUND_RANGES.length - 1}
            aria-label="Next round"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Schedule */}
        {!dbMatches ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading schedule…
          </div>
        ) : !round || round.days.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">No matches scheduled for this round.</div>
        ) : (
          <div className="space-y-5">
            {round.days.map(day => (
              <section key={day.date} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <header className="px-5 sm:px-6 py-3 border-b border-border bg-muted/40">
                  <h2 className="text-sm sm:text-base font-semibold text-foreground">{day.date}</h2>
                </header>
                <div className="divide-y divide-border/60 py-1">
                  {day.matches.map(m => (
                    <MatchRow key={m.id} match={m} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Highlight section */}
        {highlights && (
          <section className="mt-8 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <header className="px-5 sm:px-6 py-3 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
              <h2 className="text-sm font-semibold text-foreground">Same Day Highlights</h2>
            </header>
            <div className="p-5 sm:p-6 space-y-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  Before {highlights.today.date}
                </p>
                <ul className="space-y-2">
                  {highlights.sameDay.matches.map(m => (
                    <li key={m.id} className="flex items-center gap-3 text-sm text-foreground">
                      <CircleFlag team={m.home} />
                      <span className="font-medium">{m.home}</span>
                      <span className="ml-auto text-muted-foreground tabular-nums">{m.time}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  {highlights.today.date}
                </p>
                <ul className="space-y-2">
                  {highlights.today.matches.map(m => (
                    <li key={m.id} className="flex items-center gap-3 text-sm text-foreground">
                      <CircleFlag team={m.home} />
                      <span className="font-medium">{m.home}</span>
                      <span className="ml-auto text-muted-foreground tabular-nums">{m.time}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
