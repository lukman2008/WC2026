import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const createInput = z.object({
  matchId: z.string().uuid(),
  category: z.enum(["vip", "regular", "economy"]),
  quantity: z.number().int().min(1).max(10),
  chain: z.enum(["btc", "eth"]),
});

const PAYMENT_TTL_MS = 30 * 60 * 1000; // 30 min
const MIN_CONFIRMATIONS = { btc: 1, eth: 6 } as const;

async function getUsdRate(chain: "btc" | "eth"): Promise<number> {
  const id = chain === "btc" ? "bitcoin" : "ethereum";
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
    { headers: { accept: "application/json" } }
  );
  if (!res.ok) throw new Error(`CoinGecko price fetch failed (${res.status})`);
  const json = (await res.json()) as Record<string, { usd: number }>;
  const rate = json[id]?.usd;
  if (!rate || rate <= 0) throw new Error("Invalid price from CoinGecko");
  return rate;
}

function getDepositAddress(chain: "btc" | "eth"): string {
  const addr = chain === "btc" ? process.env.BTC_DEPOSIT_ADDRESS : process.env.ETH_DEPOSIT_ADDRESS;
  if (!addr) throw new Error(`Missing deposit address for ${chain.toUpperCase()}`);
  return addr;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: "Invalid token" });

    const body = createInput.parse(req.body);

    const { data: match, error: matchErr } = await supabase
      .from("matches")
      .select("price_vip, price_regular, price_economy, available_vip, available_regular, available_economy")
      .eq("id", body.matchId)
      .maybeSingle();
    
    if (matchErr || !match) return res.status(404).json({ error: "Match not found" });

    const priceMap = { vip: Number(match.price_vip), regular: Number(match.price_regular), economy: Number(match.price_economy) };
    const availMap = { vip: match.available_vip, regular: match.available_regular, economy: match.available_economy };
    
    if (availMap[body.category] < body.quantity) {
      return res.status(400).json({ error: `Only ${availMap[body.category]} ${body.category} tickets left.` });
    }

    const usd = +(priceMap[body.category] * body.quantity).toFixed(2);
    const rate = await getUsdRate(body.chain);
    const cryptoAmount = +(usd / rate).toFixed(8);
    const depositAddress = getDepositAddress(body.chain);
    const expiresAt = new Date(Date.now() + PAYMENT_TTL_MS).toISOString();

    const { data: row, error: insErr } = await supabase
      .from("crypto_payments")
      .insert({
        user_id: user.id,
        match_id: body.matchId,
        category: body.category,
        quantity: body.quantity,
        chain: body.chain,
        deposit_address: depositAddress,
        usd_amount: usd,
        crypto_amount: cryptoAmount,
        rate_usd_per_unit: rate,
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (insErr || !row) return res.status(500).json({ error: insErr?.message || "Could not create payment" });

    return res.status(200).json({
      ok: true,
      paymentId: row.id,
      chain: body.chain,
      depositAddress,
      cryptoAmount: cryptoAmount.toString(),
      usdAmount: usd,
      rate,
      expiresAt,
      minConfirmations: MIN_CONFIRMATIONS[body.chain],
    });
  } catch (e: any) {
    console.error("API create payment error:", e);
    return res.status(500).json({ error: e.message || "Internal server error" });
  }
}
