import { Link } from "@tanstack/react-router";
import { MapPin, Calendar, Clock, Ticket } from "lucide-react";
import { motion } from "framer-motion";
import type { Match } from "@/lib/match-data";
import { CountdownTimer } from "./CountdownTimer";
import { Flag } from "./Flag";

export function MatchCard({ match, index = 0 }: { match: Match; index?: number }) {
  const totalAvailable = match.ticketsAvailable.vip + match.ticketsAvailable.regular + match.ticketsAvailable.economy;
  const isLowStock = totalAvailable < 500;
  const matchDate = new Date(`${match.date}T${match.time}`);
  const isUpcoming = matchDate > new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link
        to="/matches/$matchId"
        params={{ matchId: match.id }}
        className="group block rounded-xl border border-border bg-card shadow-card transition-all hover:shadow-elevated hover:border-primary/30 hover:-translate-y-1"
      >
        {/* Stage badge */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            match.stage === "Final" ? "bg-gradient-gold text-gold-foreground" :
            match.stage === "Semi-Final" ? "bg-primary/15 text-primary" :
            "bg-secondary text-secondary-foreground"
          }`}>
            {match.stage} {match.group && `· ${match.group}`}
          </span>
          {isLowStock && (
            <span className="text-xs font-medium text-destructive animate-pulse">
              Low availability
            </span>
          )}
        </div>

        {/* Teams */}
        <div className="flex items-center justify-center gap-5 px-5 py-5">
          <div className="flex flex-col items-center gap-2 min-w-[80px]">
            <Flag team={match.homeTeam} fallbackEmoji={match.homeFlag} size={32} />
            <span className="text-sm font-semibold text-foreground">{match.homeTeam}</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-bold text-muted-foreground tracking-widest">VS</span>
          </div>
          <div className="flex flex-col items-center gap-2 min-w-[80px]">
            <Flag team={match.awayTeam} fallbackEmoji={match.awayFlag} size={32} />
            <span className="text-sm font-semibold text-foreground">{match.awayTeam}</span>
          </div>
        </div>

        {/* Countdown */}
        {isUpcoming && (
          <div className="px-5 pb-3">
            <CountdownTimer targetDate={matchDate} compact />
          </div>
        )}

        {/* Info */}
        <div className="border-t border-border px-5 py-3 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{match.stadium}, {match.city}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(match.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {match.time}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="border-t border-border px-5 py-3 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            From <span className="font-semibold text-foreground">${Math.min(match.prices.vip, match.prices.regular, match.prices.economy)}</span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary group-hover:gap-2 transition-all">
            <Ticket className="h-3.5 w-3.5" />
            Get Tickets →
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
