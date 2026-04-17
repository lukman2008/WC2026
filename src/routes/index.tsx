import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Ticket, MapPin, ArrowRight, Shield, Zap, Globe, Loader2 } from "lucide-react";
import { MatchCard } from "@/components/MatchCard";
import { CountdownTimer } from "@/components/CountdownTimer";
import { supabase } from "@/integrations/supabase/client";
import type { Match } from "@/lib/match-data";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("matches").select("*").order("match_date", { ascending: true });
      if (data) {
        setMatches(data.map(m => ({
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
        })));
      }
      setLoading(false);
    })();
  }, []);

  const featuredMatches = matches.filter(m => m.stage === "Final" || m.stage === "Semi-Final").slice(0, 3);
  const upcomingMatches = matches.filter(m => m.stage === "Group Stage").slice(0, 6);
  const finalMatch = matches.find(m => m.stage === "Final");
  const finalDate = finalMatch ? new Date(`${finalMatch.date}T${finalMatch.time}`) : new Date("2026-07-19T18:00");

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gold/5 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full border border-primary/5" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
          <div className="text-center max-w-3xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 mb-6">
                <Trophy className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-primary tracking-wide uppercase">FIFA World Cup 2026</span>
              </div>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight">
              <span className="text-foreground">Your Seat at the</span><br />
              <span className="text-gradient-primary">World's Stage</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
              Secure your tickets for the biggest sporting event on the planet. 48 teams, 3 countries, 1 champion.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/matches" className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-glow-primary transition-all hover:opacity-90 hover:scale-[1.02]">
                <Ticket className="h-4 w-4" /> Browse Tickets
              </Link>
              <Link to="/matches" className="inline-flex items-center gap-2 rounded-xl border border-border px-7 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary">
                View Schedule <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }} className="mt-12 flex flex-col items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Final Countdown</span>
              <CountdownTimer targetDate={finalDate} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-card/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: "Teams", value: "48", icon: Shield },
              { label: "Matches", value: "104", icon: Zap },
              { label: "Stadiums", value: "16", icon: MapPin },
              { label: "Countries", value: "3", icon: Globe },
            ].map(stat => (
              <div key={stat.label} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          <section className="py-16 sm:py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Featured Matches</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Don't miss the most anticipated games</p>
                </div>
                <Link to="/matches" className="text-sm font-semibold text-primary hover:underline hidden sm:block">View all matches →</Link>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {featuredMatches.map((match, i) => <MatchCard key={match.id} match={match} index={i} />)}
              </div>
            </div>
          </section>

          <section className="py-16 sm:py-20 bg-card/30">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Group Stage</h2>
                  <p className="mt-1 text-sm text-muted-foreground">The tournament begins here</p>
                </div>
                <Link to="/matches" className="text-sm font-semibold text-primary hover:underline hidden sm:block">View all →</Link>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {upcomingMatches.map((match, i) => <MatchCard key={match.id} match={match} index={i} />)}
              </div>
              <div className="mt-8 text-center sm:hidden">
                <Link to="/matches" className="text-sm font-semibold text-primary hover:underline">View all matches →</Link>
              </div>
            </div>
          </section>
        </>
      )}

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-hero p-10 sm:p-14 text-center">
            <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-gold/10 blur-3xl" />
            <div className="relative">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Ready to Be Part of History?</h2>
              <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
                Tickets are selling fast. Secure yours now and witness football's greatest spectacle live.
              </p>
              <Link to="/matches" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-glow-primary transition-all hover:opacity-90 hover:scale-[1.02]">
                <Ticket className="h-4 w-4" /> Get Your Tickets
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
