import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Settings, Apple, Smartphone, Loader2, Globe2, ChevronRight as ChevronRightIcon } from "lucide-react";
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
  stadium: string;
  city: string;
}

interface ScheduleMatch {
  id: string;
  home: string;
  away: string;
  time: string;
  dateLabel: string;
  ts: number;
  fromPrice: number;
  stadium: string;
  city: string;
}
interface DayGroup { date: string; matches: ScheduleMatch[]; }
interface Round { label: string; days: DayGroup[]; }

const ROUND_RANGES = [
  { label: "Round 1", startISO: "2026-06-11T00:00:00Z", endISO: "2026-06-18T12:00:00Z" },
  { label: "Round 2", startISO: "2026-06-18T12:00:00Z", endISO: "2026-06-24T12:00:00Z" },
  { label: "Round 3", startISO: "2026-06-24T12:00:00Z", endISO: "2026-06-29T00:00:00Z" },
];

const detectedTZ = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";

function autoLabel(tz: string) {
  try {
    const city = tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
    const abbr = new Intl.DateTimeFormat(undefined, { timeZone: tz, timeZoneName: "short" })
      .formatToParts(new Date()).find(p => p.type === "timeZoneName")?.value ?? "";
    return `${city} (${abbr})`;
  } catch { return tz; }
}

const TZ_OPTIONS: { label: string; value: string }[] = [
  { label: `${autoLabel(detectedTZ)} — your region`, value: "__auto__" },
  { label: "Lagos (WAT)", value: "Africa/Lagos" },
  { label: "London (GMT/BST)", value: "Europe/London" },
  { label: "Paris (CET)", value: "Europe/Paris" },
  { label: "New York (EST)", value: "America/New_York" },
  { label: "Chicago (CST)", value: "America/Chicago" },
  { label: "Denver (MST)", value: "America/Denver" },
  { label: "Los Angeles (PST)", value: "America/Los_Angeles" },
  { label: "São Paulo (BRT)", value: "America/Sao_Paulo" },
  { label: "Dubai (GST)", value: "Asia/Dubai" },
  { label: "Mumbai (IST)", value: "Asia/Kolkata" },
  { label: "Tokyo (JST)", value: "Asia/Tokyo" },
  { label: "Sydney (AEDT)", value: "Australia/Sydney" },
  { label: "UTC", value: "UTC" },
];

function formatDateLabel(d: Date, tz: string) {
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", timeZone: tz });
}
function formatTime(d: Date, tz: string) {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZone: tz });
}
function tzAbbrev(tz: string) {
  try {
    const parts = new Intl.DateTimeFormat(undefined, { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date());
    return parts.find(p => p.type === "timeZoneName")?.value ?? tz;
  } catch { return tz; }
}

function CircleFlag({ team, size = 24 }: { team: string; size?: number }) {
  return (
    <span
      className="relative inline-flex overflow-hidden rounded-full bg-muted shrink-0"
      style={{ height: size, width: size }}
    >
      <Flag team={team} size={size} rounded={false} className="!h-full !w-full scale-150 object-cover" />
    </span>
  );
}

function MatchRow({ match }: { match: ScheduleMatch }) {
  return (
    <Link
      to="/matches/$matchId"
      params={{ matchId: match.id }}
      className="group flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 transition-colors hover:bg-secondary/60 active:bg-secondary"
    >
      <div className="w-12 sm:w-14 shrink-0 text-xs sm:text-sm font-semibold tabular-nums text-foreground">
        {match.time}
      </div>
      <div className="h-8 w-px bg-border shrink-0" />
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2 min-w-0">
          <CircleFlag team={match.home} />
          <span className="truncate text-sm font-medium text-foreground">{match.home}</span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <CircleFlag team={match.away} />
          <span className="truncate text-sm font-medium text-foreground">{match.away}</span>
        </div>
        <div className="text-[11px] text-muted-foreground truncate mt-0.5">
          {match.stadium} · {match.city}
        </div>
      </div>
      <div className="hidden sm:block text-[11px] text-muted-foreground shrink-0">
        from <span className="font-semibold text-foreground">${Math.round(match.fromPrice)}</span>
      </div>
      <ChevronRightIcon className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
    </Link>
  );
}

function TvSchedulesPage() {
  const [roundIdx, setRoundIdx] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dbMatches, setDbMatches] = useState<DbMatch[] | null>(null);
  const activeTZ = detectedTZ;

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("matches")
        .select("id,home_team,away_team,match_date,price_economy,stadium,city")
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
        const dateLabel = formatDateLabel(d, activeTZ);
        const sm: ScheduleMatch = {
          id: m.id,
          home: m.home_team,
          away: m.away_team,
          time: formatTime(d, activeTZ),
          dateLabel,
          ts: d.getTime(),
          fromPrice: Number(m.price_economy),
          stadium: m.stadium,
          city: m.city,
        };
        if (!byDay.has(dateLabel)) byDay.set(dateLabel, []);
        byDay.get(dateLabel)!.push(sm);
      }
      const days: DayGroup[] = Array.from(byDay.entries())
        .map(([date, matches]) => ({ date, matches: matches.sort((a, b) => a.ts - b.ts) }))
        .sort((a, b) => a.matches[0].ts - b.matches[0].ts);
      return { label: r.label, days };
    });
  }, [dbMatches, activeTZ]);

  const round = rounds[roundIdx];
  const tz = tzAbbrev(activeTZ);

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
          <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
            <Globe2 className="h-3.5 w-3.5" />
            <span>Times in your local timezone</span>
            <span className="px-1.5 py-0.5 rounded bg-secondary font-semibold text-foreground">{tz}</span>
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
          <div className="max-w-2xl mx-auto space-y-4">
            {round.days.map(day => (
              <section key={day.date} className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                <header className="px-4 py-2.5 bg-muted/50 border-b border-border">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {day.date}
                  </h2>
                </header>
                <div className="divide-y divide-border">
                  {day.matches.map(m => <MatchRow key={m.id} match={m} />)}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
