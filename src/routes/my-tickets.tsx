import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Ticket, ArrowRight, Loader2, MapPin, Calendar, QrCode, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface TicketRow {
  id: string;
  ticket_code: string;
  category: "vip" | "regular" | "economy";
  price: number;
  status: "active" | "used" | "cancelled";
  qr_data: string;
  created_at: string;
  matches: {
    home_team: string;
    away_team: string;
    home_flag: string;
    away_flag: string;
    stadium: string;
    city: string;
    match_date: string;
    stage: string;
  };
}

export const Route = createFileRoute("/my-tickets")({
  head: () => ({
    meta: [
      { title: "My Tickets — FIFA World Cup 2026" },
      { name: "description", content: "View and manage your World Cup 2026 tickets." },
    ],
  }),
  component: MyTicketsPage,
});

function MyTicketsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/my-tickets", mode: "signin" } });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("tickets")
        .select("id, ticket_code, category, price, status, qr_data, created_at, matches(home_team, away_team, home_flag, away_flag, stadium, city, match_date, stage)")
        .order("created_at", { ascending: false });
      setTickets((data as TicketRow[]) ?? []);
      setLoading(false);
    })();
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-foreground">My Tickets</h1>
      <p className="mt-2 text-muted-foreground">{tickets.length} ticket{tickets.length !== 1 ? "s" : ""} purchased</p>

      {tickets.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center text-center py-10">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary mb-6">
            <Ticket className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">No tickets yet</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            Browse the match schedule and purchase your first ticket to see it here.
          </p>
          <Link
            to="/matches"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow-primary transition-all hover:opacity-90"
          >
            Browse Matches
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {tickets.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
            >
              <div className="grid sm:grid-cols-[1fr_auto] gap-0">
                {/* Left: ticket info */}
                <div className="p-5 sm:p-6 border-b sm:border-b-0 sm:border-r border-dashed border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      t.category === "vip" ? "bg-gradient-gold text-gold-foreground" :
                      t.category === "regular" ? "bg-primary/15 text-primary" :
                      "bg-secondary text-secondary-foreground"
                    }`}>
                      {t.category.toUpperCase()}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{t.matches.stage}</span>
                    <div className="ml-auto flex items-center gap-1.5">
                      {t.status === "active" && <><CheckCircle2 className="h-3.5 w-3.5 text-primary" /><span className="text-xs font-medium text-primary">Active</span></>}
                      {t.status === "used" && <span className="text-xs font-medium text-muted-foreground">Used</span>}
                      {t.status === "cancelled" && <><XCircle className="h-3.5 w-3.5 text-destructive" /><span className="text-xs font-medium text-destructive">Cancelled</span></>}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{t.matches.home_flag}</span>
                      <span className="font-bold text-foreground">{t.matches.home_team}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">VS</span>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{t.matches.away_flag}</span>
                      <span className="font-bold text-foreground">{t.matches.away_team}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(t.matches.match_date).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      {t.matches.stadium}, {t.matches.city}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ticket Code</p>
                      <p className="font-mono text-sm font-bold text-foreground">{t.ticket_code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Price</p>
                      <p className="text-sm font-bold text-foreground">${Number(t.price).toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Right: QR placeholder */}
                <div className="p-5 sm:p-6 flex flex-col items-center justify-center bg-secondary/30 sm:w-40">
                  <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-foreground">
                    <QrCode className="h-16 w-16 text-background" />
                  </div>
                  <p className="mt-2 text-[10px] text-center text-muted-foreground">Scan at gate</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
