import { createFileRoute, Link } from "@tanstack/react-router";
import { Ticket, ArrowRight } from "lucide-react";

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
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-foreground">My Tickets</h1>
      <p className="mt-2 text-muted-foreground">View and manage your purchased tickets</p>

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
    </div>
  );
}
