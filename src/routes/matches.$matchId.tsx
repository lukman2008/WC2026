import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Calendar, Clock, Ticket, ShieldCheck, Minus, Plus, CreditCard } from "lucide-react";
import { getMatch } from "@/lib/match-data";
import { CountdownTimer } from "@/components/CountdownTimer";

export const Route = createFileRoute("/matches/$matchId")({
  head: ({ params }) => {
    const match = getMatch(params.matchId);
    const title = match ? `${match.homeTeam} vs ${match.awayTeam} — World Cup 2026 Tickets` : "Match Not Found";
    return {
      meta: [
        { title },
        { name: "description", content: match ? `Buy tickets for ${match.homeTeam} vs ${match.awayTeam} at ${match.stadium}, ${match.city}.` : "Match not found." },
        { property: "og:title", content: title },
      ],
    };
  },
  component: MatchDetailPage,
  notFoundComponent: () => (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Match not found</h1>
        <Link to="/matches" className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to matches
        </Link>
      </div>
    </div>
  ),
});

type Category = "vip" | "regular" | "economy";

const categoryInfo: Record<Category, { label: string; desc: string; color: string }> = {
  vip: { label: "VIP", desc: "Premium seats with exclusive lounge access, complimentary food & drinks", color: "bg-gradient-gold text-gold-foreground" },
  regular: { label: "Regular", desc: "Great view, central sections with comfortable seating", color: "bg-primary/15 text-primary" },
  economy: { label: "Economy", desc: "Standard seating, perfect for the full atmosphere experience", color: "bg-secondary text-secondary-foreground" },
};

function MatchDetailPage() {
  const { matchId } = Route.useParams();
  const match = getMatch(matchId);
  const [category, setCategory] = useState<Category>("regular");
  const [quantity, setQuantity] = useState(1);

  if (!match) {
    throw notFound();
  }

  const matchDate = new Date(`${match.date}T${match.time}`);
  const isUpcoming = matchDate > new Date();
  const available = match.ticketsAvailable[category];
  const pricePerTicket = match.prices[category];
  const total = pricePerTicket * quantity;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <Link to="/matches" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to matches
      </Link>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Match Info - Left */}
        <div className="lg:col-span-3 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card shadow-card p-6 sm:p-8"
          >
            <div className="flex items-center gap-2 mb-6">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                match.stage === "Final" ? "bg-gradient-gold text-gold-foreground" :
                match.stage === "Semi-Final" ? "bg-primary/15 text-primary" :
                "bg-secondary text-secondary-foreground"
              }`}>
                {match.stage} {match.group && `· ${match.group}`}
              </span>
            </div>

            <div className="flex items-center justify-center gap-8 sm:gap-12 py-6">
              <div className="flex flex-col items-center gap-2">
                <span className="text-5xl sm:text-6xl">{match.homeFlag}</span>
                <span className="text-lg font-bold text-foreground">{match.homeTeam}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-sm font-bold text-muted-foreground tracking-widest">VS</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-5xl sm:text-6xl">{match.awayFlag}</span>
                <span className="text-lg font-bold text-foreground">{match.awayTeam}</span>
              </div>
            </div>

            {isUpcoming && (
              <div className="flex justify-center pt-4 border-t border-border">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Kickoff in</span>
                  <CountdownTimer targetDate={matchDate} />
                </div>
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3">
                <MapPin className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Venue</p>
                  <p className="text-sm font-semibold text-foreground">{match.stadium}</p>
                  <p className="text-xs text-muted-foreground">{match.city}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3">
                <Calendar className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="text-sm font-semibold text-foreground">
                    {new Date(match.date).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3">
                <Clock className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="text-sm font-semibold text-foreground">{match.time} Local Time</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Ticket Selector - Right */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-border bg-card shadow-card p-6 sticky top-24"
          >
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              Select Tickets
            </h2>

            {/* Category selection */}
            <div className="mt-5 space-y-3">
              {(Object.keys(categoryInfo) as Category[]).map(cat => {
                const info = categoryInfo[cat];
                const avail = match.ticketsAvailable[cat];
                const price = match.prices[cat];
                const selected = category === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => { setCategory(cat); setQuantity(1); }}
                    className={`w-full text-left rounded-lg border p-4 transition-all ${
                      selected
                        ? "border-primary bg-primary/5 shadow-glow-primary"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${info.color}`}>
                          {info.label}
                        </span>
                        {avail < 100 && <span className="text-[10px] text-destructive font-medium">Only {avail} left</span>}
                      </div>
                      <span className="text-lg font-bold text-foreground">${price}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{info.desc}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{avail} tickets available</p>
                  </button>
                );
              })}
            </div>

            {/* Quantity */}
            <div className="mt-5">
              <label className="text-sm font-medium text-foreground">Quantity</label>
              <div className="mt-2 flex items-center gap-3">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center text-lg font-bold text-foreground">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => Math.min(available, Math.min(10, q + 1)))}
                  disabled={quantity >= Math.min(available, 10)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <span className="text-xs text-muted-foreground">Max 10 per order</span>
              </div>
            </div>

            {/* Order summary */}
            <div className="mt-6 rounded-lg bg-secondary/50 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{categoryInfo[category].label} × {quantity}</span>
                <span>${pricePerTicket} each</span>
              </div>
              <div className="border-t border-border pt-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Total</span>
                <span className="text-xl font-bold text-gradient-primary">${total.toLocaleString()}</span>
              </div>
            </div>

            <button
              className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-glow-primary transition-all hover:opacity-90 hover:scale-[1.01] active:scale-[0.99]"
            >
              <CreditCard className="h-4 w-4" />
              Proceed to Checkout — ${total.toLocaleString()}
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Secure checkout · 100% guaranteed tickets</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
