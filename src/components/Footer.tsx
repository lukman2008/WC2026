import { Trophy } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
              <Trophy className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">WC2026 Tickets</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link to="/matches" className="hover:text-foreground transition-colors">Matches</Link>
            <Link to="/my-tickets" className="hover:text-foreground transition-colors">My Tickets</Link>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026 FIFA World Cup Tickets. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
