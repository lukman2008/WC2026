import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import crypto from "crypto";

interface CoinbaseEvent {
  id: string;
  type: string;
  data: {
    id: string;
    code: string;
    metadata: {
      user_id?: string;
      match_id?: string;
      category?: "vip" | "regular" | "economy";
      quantity?: string;
    };
  };
}

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const computed = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/coinbase-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET;
        if (!secret) {
          console.error("Webhook secret not configured");
          return new Response("Server misconfigured", { status: 500 });
        }

        const rawBody = await request.text();
        const signature = request.headers.get("x-cc-webhook-signature");

        if (!verifySignature(rawBody, signature, secret)) {
          console.warn("Invalid Coinbase webhook signature");
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: { event: CoinbaseEvent };
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const event = payload.event;
        const chargeId = event.data.id;

        // Look up the pending purchase
        const { data: pending } = await supabaseAdmin
          .from("pending_purchases")
          .select("*")
          .eq("coinbase_charge_id", chargeId)
          .maybeSingle();

        if (!pending) {
          console.warn("No pending purchase for charge", chargeId);
          return new Response("OK", { status: 200 });
        }

        // Already processed → idempotent ack
        if (pending.status === "completed") {
          return new Response("OK", { status: 200 });
        }

        if (event.type === "charge:confirmed" || event.type === "charge:resolved") {
          // Execute the atomic ticket purchase
          const { data: result, error: rpcErr } = await supabaseAdmin.rpc("purchase_tickets", {
            _user_id: pending.user_id,
            _match_id: pending.match_id,
            _category: pending.category,
            _quantity: pending.quantity,
          });

          if (rpcErr || !result?.[0]) {
            console.error("purchase_tickets failed in webhook:", rpcErr);
            await supabaseAdmin
              .from("pending_purchases")
              .update({ status: "failed" })
              .eq("id", pending.id);
            return new Response("Ticket creation failed", { status: 500 });
          }

          await supabaseAdmin
            .from("pending_purchases")
            .update({
              status: "completed",
              transaction_id: result[0].transaction_id,
            })
            .eq("id", pending.id);

          return new Response("OK", { status: 200 });
        }

        if (event.type === "charge:failed") {
          await supabaseAdmin
            .from("pending_purchases")
            .update({ status: "failed" })
            .eq("id", pending.id);
        } else if (event.type === "charge:expired") {
          await supabaseAdmin
            .from("pending_purchases")
            .update({ status: "expired" })
            .eq("id", pending.id);
        }

        return new Response("OK", { status: 200 });
      },
    },
  },
});
