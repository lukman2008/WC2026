import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Calendar, Clock, Ticket, ShieldCheck, Minus, Plus, Loader2, Bitcoin } from "lucide-react";
import { CountdownTimer } from "@/components/CountdownTimer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Flag } from "@/components/Flag";
import { CryptoCheckoutDialog } from "@/components/CryptoCheckoutDialog";

type PaymentMethod = "mock" | "crypto";

type Category = "vip" | "regular" | "economy";

interface DbMatch {
  id: string;
  home_team: string;
  away_team: string;
  home_flag: string;
  away_flag: string;
  stadium: string;
  city: string;
  match_date: string;
  stage: string;
  group_name: string | null;
  price_vip: number;
  price_regular: number;
  price_economy: number;
  available_vip: number;
  available_regular: number;
  available_economy: number;
}

export const Route = createFileRoute("/matches/$matchId")({
  head: ({ params }) => ({
    meta: [
      { title: `Match ${params.matchId} — World Cup 2026 Tickets` },
      { name: "description", content: "Buy tickets for the FIFA World Cup 2026." },
    ],
  }),
  component: MatchDetailPage,
});

const categoryInfo: Record<Category, { label: string; desc: string; color: string }> = {
  vip: { label: "VIP", desc: "Premium seats with exclusive lounge access, complimentary food & drinks", color: "bg-gradient-gold text-gold-foreground" },
  regular: { label: "Regular", desc: "Great view, central sections with comfortable seating", color: "bg-primary/15 text-primary" },
  economy: { label: "Economy", desc: "Standard seating, perfect for the full atmosphere experience", color: "bg-secondary text-secondary-foreground" },
};

function MatchDetailPage() {
  const { matchId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [match, setMatch] = useState<DbMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category>("regular");
  const [quantity, setQuantity] = useState(1);
  const [purchasing, setPurchasing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("crypto");
  const [cryptoOpen, setCryptoOpen] = useState(false);

  const loadMatch = async () => {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .maybeSingle();
    if (error) {
      toast.error("Failed to load match");
    }
    setMatch(data as DbMatch | null);
    setLoading(false);
  };

  useEffect(() => {
    loadMatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const handlePurchase = async () => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: `/matches/${matchId}`, mode: "signin" } });
      return;
    }
    if (!match) return;
    if (paymentMethod === "crypto") {
      setCryptoOpen(true);
      return;
    }
    setPurchasing(true);
    try {
      // Mock card path (existing behavior)
      const { data, error } = await supabase.rpc("purchase_tickets", {
        _user_id: user.id,
        _match_id: match.id,
        _category: category,
        _quantity: quantity,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      const result = data?.[0];
      toast.success(`${quantity} ticket${quantity > 1 ? "s" : ""} purchased successfully!`, {
        description: result?.ticket_codes?.[0] ? `First code: ${result.ticket_codes[0]}` : undefined,
      });
      navigate({ to: "/my-tickets" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Purchase failed. Please try again.";
      toast.error(msg);
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Match not found</h1>
          <Link to="/matches" className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to matches
          </Link>
        </div>
      </div>
    );
  }

  const matchDate = new Date(match.match_date);
  const isUpcoming = matchDate > new Date();
  const availableMap = { vip: match.available_vip, regular: match.available_regular, economy: match.available_economy };
  const priceMap = { vip: match.price_vip, regular: match.price_regular, economy: match.price_economy };
  const available = availableMap[category];
  const pricePerTicket = Number(priceMap[category]);
  const total = pricePerTicket * quantity;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <Link to="/matches" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to matches
      </Link>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Match Info */}
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
                {match.stage} {match.group_name && `· ${match.group_name}`}
              </span>
            </div>

            <div className="flex items-center justify-center gap-8 sm:gap-12 py-6">
              <div className="flex flex-col items-center gap-3">
                <Flag team={match.home_team} fallbackEmoji={match.home_flag} size={56} />
                <span className="text-lg font-bold text-foreground">{match.home_team}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-sm font-bold text-muted-foreground tracking-widest">VS</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <Flag team={match.away_team} fallbackEmoji={match.away_flag} size={56} />
                <span className="text-lg font-bold text-foreground">{match.away_team}</span>
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
                    {matchDate.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3">
                <Clock className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="text-sm font-semibold text-foreground">
                    {matchDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Ticket Selector */}
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

            <div className="mt-5 space-y-3">
              {(Object.keys(categoryInfo) as Category[]).map(cat => {
                const info = categoryInfo[cat];
                const avail = availableMap[cat];
                const price = Number(priceMap[cat]);
                const selected = category === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => { setCategory(cat); setQuantity(1); }}
                    className={`w-full text-left rounded-lg border p-4 transition-all ${
                      selected ? "border-primary bg-primary/5 shadow-glow-primary" : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${info.color}`}>
                          {info.label}
                        </span>
                        {avail < 100 && avail > 0 && <span className="text-[10px] text-destructive font-medium">Only {avail} left</span>}
                        {avail === 0 && <span className="text-[10px] text-destructive font-medium">Sold out</span>}
                      </div>
                      <span className="text-lg font-bold text-foreground">${price}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{info.desc}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{avail} tickets available</p>
                  </button>
                );
              })}
            </div>

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

            {/* Payment method */}
            <div className="mt-6">
              <label className="text-sm font-medium text-foreground">Payment method</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("crypto")}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all ${
                    paymentMethod === "crypto" ? "border-primary bg-primary/5 shadow-glow-primary" : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <Bitcoin className="h-5 w-5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Crypto</span>
                  <span className="text-[10px] text-muted-foreground">BTC · ETH · USDC</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("mock")}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all ${
                    paymentMethod === "mock" ? "border-primary bg-primary/5 shadow-glow-primary" : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <CreditCard className="h-5 w-5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Card (demo)</span>
                  <span className="text-[10px] text-muted-foreground">Instant mock</span>
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-lg bg-secondary/50 p-4 space-y-2">
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
              onClick={handlePurchase}
              disabled={purchasing || available === 0}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-glow-primary transition-all hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {purchasing ? <Loader2 className="h-4 w-4 animate-spin" /> : paymentMethod === "crypto" ? <Bitcoin className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
              {purchasing
                ? "Processing..."
                : !user
                  ? "Sign in to Buy"
                  : paymentMethod === "crypto"
                    ? `Pay with Crypto — $${total.toLocaleString()}`
                    : `Buy Tickets — $${total.toLocaleString()}`}
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{paymentMethod === "crypto" ? "On-chain BTC or ETH · Verified via Mempool.space & Alchemy" : "Secure checkout · Mock payment (demo)"}</span>
            </div>
          </motion.div>
        </div>
      </div>

      <CryptoCheckoutDialog
        open={cryptoOpen}
        onClose={() => setCryptoOpen(false)}
        matchId={match.id}
        category={category}
        quantity={quantity}
        usdTotal={total}
      />
    </div>
  );
}
