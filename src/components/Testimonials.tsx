import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Quote, Sparkles, Ticket } from "lucide-react";
import { Flag } from "./Flag";
import { supabase } from "@/integrations/supabase/client";

interface Purchase {
  ticket_id: string;
  created_at: string;
  category: "vip" | "regular" | "economy";
  display_name: string;
  country: string | null;
  home_team: string;
  away_team: string;
  home_flag: string;
  away_flag: string;
}

interface Testimonial {
  name: string;
  country: string;
  quote: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  { name: "Lucas Almeida", country: "Brazil", quote: "Booked VIP for Brazil vs Germany — the entire flow took two minutes and tickets were in my wallet instantly.", rating: 5 },
  { name: "Sophie Martin", country: "France", quote: "Crypto checkout worked flawlessly. Paid in BTC, got my QR codes before the confirmation email landed.", rating: 5 },
  { name: "James Carter", country: "USA", quote: "Best ticketing UX I've ever used for a major event. The countdown to the Final has me hyped already.", rating: 5 },
  { name: "Yuki Tanaka", country: "Japan", quote: "Super clean interface, prices were transparent, and I love that I can resell or transfer if plans change.", rating: 5 },
  { name: "Diego Hernández", country: "Mexico", quote: "Got tickets to Mexico vs Japan at Azteca. Verified my crypto payment in seconds. Unreal experience.", rating: 5 },
  { name: "Amelia Brown", country: "England", quote: "Compared to the official portal this is a dream. Mobile-friendly and dead simple.", rating: 5 },
  { name: "Mateo Rossi", country: "Italy", quote: "Locked in Portugal vs Italy. The stage badge and live availability are a nice touch.", rating: 4 },
  { name: "Aïsha Diallo", country: "Senegal", quote: "Smooth ETH payment for Canada vs Senegal. My family back home is so excited.", rating: 5 },
];

const recentPurchases: { name: string; country: string; match: string }[] = [
  { name: "Carlos M.", country: "Argentina", match: "France vs Argentina · VIP" },
  { name: "Hannah K.", country: "Germany", match: "Brazil vs Germany · Regular" },
  { name: "Liam O.", country: "USA", match: "USA vs England · VIP" },
  { name: "Ines G.", country: "Portugal", match: "Portugal vs Italy · Regular" },
  { name: "Kenji S.", country: "Japan", match: "Mexico vs Japan · Economy" },
  { name: "Ahmed B.", country: "Morocco", match: "Morocco vs Colombia · VIP" },
  { name: "Olivia T.", country: "Canada", match: "Canada vs Senegal · Regular" },
  { name: "Marco R.", country: "Spain", match: "Spain vs Netherlands · VIP" },
];

export function Testimonials() {
  return (
    <section className="py-16 sm:py-20 bg-card/30 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-primary tracking-wide uppercase">Loved by fans worldwide</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">What fans are saying</h2>
          <p className="mt-2 text-sm text-muted-foreground">Thousands of supporters trust us to get them to the stadium</p>
        </div>

        {/* Live purchase ticker */}
        <LivePurchaseTicker />

        {/* Marquee row 1 */}
        <Marquee items={testimonials.slice(0, 4)} duration={45} />
        {/* Marquee row 2 (reverse) */}
        <div className="mt-5">
          <Marquee items={testimonials.slice(4)} duration={50} reverse />
        </div>
      </div>
    </section>
  );
}

function Marquee({ items, duration, reverse = false }: { items: Testimonial[]; duration: number; reverse?: boolean }) {
  // Duplicate for seamless loop
  const loop = [...items, ...items];
  return (
    <div className="relative group">
      <div
        className="flex gap-5 w-max animate-marquee will-change-transform"
        style={{
          animationDuration: `${duration}s`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {loop.map((t, i) => (
          <article
            key={`${t.name}-${i}`}
            className="w-[320px] sm:w-[380px] shrink-0 rounded-xl border border-border bg-card p-5 shadow-card"
          >
            <Quote className="h-5 w-5 text-primary/60 mb-3" />
            <p className="text-sm text-foreground leading-relaxed">"{t.quote}"</p>
            <div className="mt-4 flex items-center gap-3">
              <Flag team={t.country} size={24} />
              <div>
                <p className="text-sm font-semibold text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.country}</p>
              </div>
              <div className="ml-auto text-xs text-gold">{"★".repeat(t.rating)}</div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function LivePurchaseTicker() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIdx(i => (i + 1) % recentPurchases.length);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  const current = recentPurchases[idx];

  return (
    <div className="mb-10 flex justify-center">
      <div className="inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 shadow-card max-w-full">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
        </span>
        <Ticket className="h-4 w-4 text-primary shrink-0" />
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-2 text-xs sm:text-sm text-foreground min-w-0"
          >
            <Flag team={current.country} size={16} />
            <span className="font-semibold truncate">{current.name}</span>
            <span className="text-muted-foreground hidden sm:inline">just purchased</span>
            <span className="text-muted-foreground sm:hidden">·</span>
            <span className="font-medium text-primary truncate">{current.match}</span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
