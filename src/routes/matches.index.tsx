import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Settings, Apple, Smartphone } from "lucide-react";
import { Flag } from "@/components/Flag";

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

interface ScheduleMatch {
  home: string;
  away: string;
  time: string;
}
interface DayGroup {
  date: string;
  matches: ScheduleMatch[];
}
interface Round {
  label: string;
  days: DayGroup[];
}

const ROUNDS: Round[] = [
  {
    label: "Round 1",
    days: [
      { date: "Thursday, June 11", matches: [{ home: "Mexico", away: "South Africa", time: "8:00 PM" }] },
      {
        date: "Friday, June 12",
        matches: [
          { home: "South Korea", away: "Czechia", time: "3:00 AM" },
          { home: "Canada", away: "Bosnia and Herzegovina", time: "8:00 PM" },
        ],
      },
      {
        date: "Saturday, June 13",
        matches: [
          { home: "USA", away: "Paraguay", time: "2:00 AM" },
          { home: "Qatar", away: "Switzerland", time: "8:00 PM" },
          { home: "Brazil", away: "Morocco", time: "11:00 PM" },
        ],
      },
      {
        date: "Sunday, June 14",
        matches: [
          { home: "Haiti", away: "Scotland", time: "2:00 AM" },
          { home: "Australia", away: "Turkiye", time: "5:00 AM" },
          { home: "Germany", away: "Curacao", time: "6:00 PM" },
          { home: "Netherlands", away: "Japan", time: "9:00 PM" },
        ],
      },
      {
        date: "Monday, June 15",
        matches: [
          { home: "Ivory Coast", away: "Ecuador", time: "12:00 AM" },
          { home: "Sweden", away: "Tunisia", time: "3:00 AM" },
          { home: "Spain", away: "Cape Verde", time: "5:00 PM" },
          { home: "Belgium", away: "Egypt", time: "8:00 PM" },
        ],
      },
      {
        date: "Tuesday, June 16",
        matches: [
          { home: "Iran", away: "New Zealand", time: "2:00 AM" },
          { home: "France", away: "Senegal", time: "8:00 PM" },
          { home: "Iraq", away: "Norway", time: "11:00 PM" },
        ],
      },
      {
        date: "Wednesday, June 17",
        matches: [
          { home: "Argentina", away: "Algeria", time: "2:00 AM" },
          { home: "Austria", away: "Jordan", time: "5:00 AM" },
          { home: "Portugal", away: "DR Congo", time: "6:00 PM" },
          { home: "England", away: "Croatia", time: "9:00 PM" },
        ],
      },
      {
        date: "Thursday, June 18",
        matches: [
          { home: "Ghana", away: "Panama", time: "12:00 AM" },
          { home: "Uzbekistan", away: "Colombia", time: "3:00 AM" },
        ],
      },
    ],
  },
];

function CircleFlag({ team }: { team: string }) {
  return (
    <span className="relative inline-flex h-8 w-8 overflow-hidden rounded-full ring-1 ring-border bg-muted shrink-0">
      <Flag team={team} size={32} rounded={false} className="!h-8 !w-8 scale-150 object-cover" />
    </span>
  );
}

function MatchRow({ match }: { match: ScheduleMatch }) {
  return (
    <div className="group grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6 px-4 sm:px-6 py-3.5 rounded-xl transition-colors hover:bg-secondary/60 cursor-pointer">
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
    </div>
  );
}

function TvSchedulesPage() {
  const [roundIdx, setRoundIdx] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const round = ROUNDS[roundIdx];

  const highlights = useMemo(() => {
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
              <button
                aria-label="Settings"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                aria-label="Apple app"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <Apple className="h-4 w-4" />
              </button>
              <button
                aria-label="Android app"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
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
              {round.label}
              <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {dropdownOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 min-w-[160px] rounded-xl border border-border bg-card shadow-elevated overflow-hidden z-10">
                {ROUNDS.map((r, i) => (
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
            onClick={() => setRoundIdx(Math.min(ROUNDS.length - 1, roundIdx + 1))}
            disabled={roundIdx >= ROUNDS.length - 1}
            aria-label="Next round"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Schedule */}
        <div className="space-y-5">
          {round.days.map(day => (
            <section
              key={day.date}
              className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
            >
              <header className="px-5 sm:px-6 py-3 border-b border-border bg-muted/40">
                <h2 className="text-sm sm:text-base font-semibold text-foreground">{day.date}</h2>
              </header>
              <div className="divide-y divide-border/60 py-1">
                {day.matches.map((m, i) => (
                  <MatchRow key={`${m.home}-${m.away}-${i}`} match={m} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Highlight section */}
        {highlights.sameDay && highlights.today && (
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
                  {highlights.sameDay.matches.map((m, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-foreground">
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
                  {highlights.today.matches.map((m, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-foreground">
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
