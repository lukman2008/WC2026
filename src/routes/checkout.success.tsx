import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Ticket, Clock } from "lucide-react";

export const Route = createFileRoute("/checkout/success")({
  head: () => ({ meta: [{ title: "Payment received — FIFA World Cup 2026" }] }),
  component: CheckoutSuccess,
});

function CheckoutSuccess() {
  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="rounded-2xl border border-border bg-card shadow-card p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
          <CheckCircle2 className="h-9 w-9 text-primary" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-foreground">Payment received!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Thanks for paying with crypto. Your transaction is being confirmed on-chain.
        </p>
        <div className="mt-6 flex items-start gap-3 rounded-lg bg-secondary/50 p-4 text-left">
          <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground">
            Tickets are issued automatically as soon as the network confirms the payment
            (usually within a few minutes). They'll appear in <span className="font-semibold text-foreground">My Tickets</span>.
          </div>
        </div>
        <Link
          to="/my-tickets"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow-primary transition-all hover:opacity-90"
        >
          <Ticket className="h-4 w-4" />
          Go to My Tickets
        </Link>
      </div>
    </div>
  );
}
