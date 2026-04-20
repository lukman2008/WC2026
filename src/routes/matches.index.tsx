import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Settings, Apple, Smartphone, Loader2, Globe2, Ticket } from "lucide-react";
import { Flag } from "@/components/Flag";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/matches/")({
  head: () => ({
    meta: [
      { title: "TV Schedules — International Football Matches" },
      { name: "description", content: "Round-by-round TV schedule with times shown in your local timezone." },
      { property: "og:title", content: "TV Schedules — International Football" },
      { property: "og:description", content: "Browse upcoming international matches by round and date in your local time." },
    ],
  }),
  component: TvSchedulesPage,
});

interface DbMatch {
  id: string;
  home_team: string;
  away_team: string;
  match_date: string;
  price_economy: number;
}

interface ScheduleMatch {
  id: string;
  home: string;
  away: string;
  time: string;
  dateLabel: string;
  ts: number;
  fromPrice: number;
}
interface DayGroup { date: string; matches: ScheduleMatch[]; }
interface Round { label: string; days: DayGroup[]; }

const ROUND_RANGES = [
  { label: "Round 1", startISO: "2026-06-11T00:00:00Z", endISO: "2026-06-18T12:00:00Z" },
  { label: "Round 2", startISO: "2026-06-18T12:00:00Z", endISO: "2026-06-24T12:00:00Z" },
  { label: "Round 3", startISO: "2026-06-24T12:00:00Z", endISO: "2026-06-29T00:00:00Z" },
];

const userTZ = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";

function formatDateLabel(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", timeZone: userTZ });
}
function formatTime(d: Date) {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZone: userTZ });
}
function tzAbbrev() {
  try {
    const parts = new Intl.DateTimeFormat(undefined, { timeZone: userTZ, timeZoneName: "short" }).formatToParts(new Date());
    return parts.find(p => p.type === "timeZoneName")?.value ?? userTZ;
  } catch { return userTZ; }
}

function CircleFlag({ team, size = 36 }: { team: string; size?: number }) {
  return (
    <span
      className="relative inline-flex overflow-hidden rounded-full ring-2 ring-background shadow-sm bg-muted shrink-0"
      style={{ height: size, width: size }}
    >
      <Flag team={team} size={size} rounded={false} className="!h-full !w-full scale-150 object-cover" />
    </span>
  );
}

function MatchCardBox({ match }: { match: ScheduleMatch }) {
  return (
    <Link
      to="/matches/$matchId"
      params={{ matchId: match.id }}
      className="group relative block rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5"
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
        <div className="flex flex-col items-center text-center gap-2 min-w-0">
          <CircleFlag team={match.home} />
          <span className="truncate w-full text-sm sm:text-base font-semibold text-foreground">{match.home}</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Kickoff</span>
          <div className="px-3 py-1.5 rounded-lg bg-gradient-primary text-primary-foreground text-xs sm:text-sm font-bold tabular-nums whitespace-nowrap shadow-sm">
            {match.time}
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">vs</span>
        </div>
        <div className="flex flex-col items-center text-center gap-2 min-w-0">
          <CircleFlag team={match.away} />
          <span className="truncate w-full text-sm sm:text-base font-semibold text-foreground">{match.away}</span>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Ticket className="h-3.5 w-3.5" /> from ${Math.round(match.fromPrice)}
        </span>
        <span className="font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          Get tickets →
        </span>
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
        .select("id,home_team,away_team,match_date,price_economy")
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
          fromPrice: Number(m.price_economy),
        };
        if (!byDay.has(dateLabel)) byDay.set(dateLabel, []);
        byDay.get(dateLabel)!.push(sm);
      }
      const days: DayGroup[] = Array.from(byDay.entries())
        .map(([date, matches]) => ({ date, matches: matches.sort((a, b) => a.ts - b.ts) }))
        .sort((a, b) => a.matches[0].ts - b.matches[0].ts);
      return { label: r.label, days };
    });
  }, [dbMatches]);

  const round = rounds[roundIdx];
  const tz = tzAbbrev();

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-4">
            <div className="flex items-center gap-1">
              <Link to="/" className="px-3 sm:px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">About</Link>
              <button className="px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold text-foreground bg-secondary">TV schedules</button>
            </div>
            <div className="flex items-center gap-1">
              <button aria-label="Settings" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"><Settings className="h-4 w-4" /></button>
              <button aria-label="Apple app" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"><Apple className="h-4 w-4" /></button>
              <button aria-label="Android app" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"><Smartphone className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Header w/ timezone */}
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground shadow-sm">
            <Globe2 className="h-3.5 w-3.5" />
            Times shown in your local timezone · <span className="font-semibold text-foreground">{tz}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setRoundIdx(Math.max(0, roundIdx - 1))} disabled={roundIdx === 0} aria-label="Previous round" className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="relative">
              <button onClick={() => setDropdownOpen(v => !v)} className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-secondary transition">
                {round?.label ?? "Round 1"}
                <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {dropdownOpen && (
                <div className="absolute left-1/2 -translate-x-1/2 mt-2 min-w-[160px] rounded-xl border border-border bg-card shadow-lg overflow-hidden z-10">
                  {ROUND_RANGES.map((r, i) => (
                    <button key={r.label} onClick={() => { setRoundIdx(i); setDropdownOpen(false); }} className={`w-full px-4 py-2.5 text-sm text-left hover:bg-secondary ${i === roundIdx ? "font-semibold text-primary" : "text-foreground"}`}>
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setRoundIdx(Math.min(ROUND_RANGES.length - 1, roundIdx + 1))} disabled={roundIdx >= ROUND_RANGES.length - 1} aria-label="Next round" className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!dbMatches ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading schedule…</div>
        ) : !round || round.days.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">No matches scheduled for this round.</div>
        ) : (
          <div className="space-y-8">
            {round.days.map(day => (
              <section key={day.date}>
                <header className="mb-3 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground px-3 py-1 rounded-full bg-card border border-border shadow-sm">
                    {day.date}
                  </h2>
                  <div className="h-px flex-1 bg-border" />
                </header>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {day.matches.map(m => <MatchCardBox key={m.id} match={m} />)}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
