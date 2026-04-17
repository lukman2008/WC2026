import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const createChargeInput = z.object({
  matchId: z.string().uuid(),
  category: z.enum(["vip", "regular", "economy"]),
  quantity: z.number().int().min(1).max(10),
  origin: z.string().url(),
});

interface CoinbaseCharge {
  id: string;
  code: string;
  hosted_url: string;
  pricing: { local: { amount: string; currency: string } };
}

export const createCryptoCharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createChargeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const apiKey = process.env.COINBASE_COMMERCE_API_KEY;
    if (!apiKey) {
      throw new Error("Crypto payments are not configured (missing API key).");
    }

    // Look up match for pricing + name
    const { data: match, error: matchErr } = await supabaseAdmin
      .from("matches")
      .select("id, home_team, away_team, price_vip, price_regular, price_economy, available_vip, available_regular, available_economy")
      .eq("id", data.matchId)
      .maybeSingle();

    if (matchErr || !match) {
      throw new Error("Match not found");
    }

    const priceMap = {
      vip: Number(match.price_vip),
      regular: Number(match.price_regular),
      economy: Number(match.price_economy),
    };
    const availMap = {
      vip: match.available_vip,
      regular: match.available_regular,
      economy: match.available_economy,
    };

    if (availMap[data.category] < data.quantity) {
      throw new Error(`Only ${availMap[data.category]} ${data.category} tickets left.`);
    }

    const total = +(priceMap[data.category] * data.quantity).toFixed(2);

    const chargePayload = {
      name: `${match.home_team} vs ${match.away_team}`,
      description: `${data.quantity} × ${data.category.toUpperCase()} ticket(s)`,
      pricing_type: "fixed_price",
      local_price: { amount: total.toFixed(2), currency: "USD" },
      metadata: {
        user_id: userId,
        match_id: data.matchId,
        category: data.category,
        quantity: String(data.quantity),
      },
      redirect_url: `${data.origin}/checkout/success`,
      cancel_url: `${data.origin}/matches/${data.matchId}`,
    };

    const res = await fetch("https://api.commerce.coinbase.com/charges", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CC-Api-Key": apiKey,
        "X-CC-Version": "2018-03-22",
      },
      body: JSON.stringify(chargePayload),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Coinbase charge creation failed:", res.status, errBody);
      throw new Error("Failed to create crypto charge. Please try again.");
    }

    const { data: charge } = (await res.json()) as { data: CoinbaseCharge };

    // Persist pending purchase
    const { error: insertErr } = await supabaseAdmin.from("pending_purchases").insert({
      user_id: userId,
      match_id: data.matchId,
      category: data.category,
      quantity: data.quantity,
      total_amount: total,
      currency: "USD",
      coinbase_charge_id: charge.id,
      coinbase_charge_code: charge.code,
      hosted_url: charge.hosted_url,
      status: "pending",
    });

    if (insertErr) {
      console.error("Failed to persist pending purchase:", insertErr);
      throw new Error("Could not initialize checkout. Please try again.");
    }

    return {
      hostedUrl: charge.hosted_url,
      chargeCode: charge.code,
      total,
    };
  });
