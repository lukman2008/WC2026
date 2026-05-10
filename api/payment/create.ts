import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const createInput = z.object({
  matchId: z.string().uuid(),
  category: z.enum(["vip", "regular", "economy"]),
  quantity: z.number().int().min(1).max(10),
  chain: z.enum(["btc", "eth"]),
  seatSection: z.string().min(1).max(80).optional(),
  seatMultiplier: z.number().min(0.8).max(2.0).optional(),
  displayCurrency: z.string().min(3).max(6).optional(),
  displayTotal: z.number().min(0).optional(),
});

const PAYMENT_TTL_MS = 30 * 60 * 1000; // 30 min
const MIN_CONFIRMATIONS = { btc: 1, eth: 6 } as const;

async function getUsdRate(chain: "btc" | "eth"): Promise<number> {
  const id = chain === "btc" ? "bitcoin" : "ethereum";
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
      { headers: { accept: "application/json" } }
    );
    if (!res.ok) throw new Error(`CoinGecko price fetch failed (${res.status})`);
    const json = (await res.json()) as Record<string, { usd: number }>;
    const rate = json[id]?.usd;
    if (!rate || rate <= 0) throw new Error("Invalid price from CoinGecko");
    return rate;
  } catch (err: any) {
    console.error(`Error fetching USD rate for ${chain}:`, err);
    throw new Error(`Failed to get conversion rate: ${err.message}`);
  }
}

function getDepositAddress(chain: "btc" | "eth"): string {
  const addr = chain === "btc" 
    ? (process.env.BTC_DEPOSIT_ADDRESS || process.env.VITE_BTC_DEPOSIT_ADDRESS || "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh")
    : (process.env.ETH_DEPOSIT_ADDRESS || process.env.VITE_ETH_DEPOSIT_ADDRESS || "0x742d35Cc6634C0532925a3b844Bc454e4438f44e");
  
  if (!addr) {
    console.error(`Missing deposit address for ${chain.toUpperCase()}`);
    throw new Error(`Server configuration error: Missing ${chain.toUpperCase()} deposit address`);
  }
  return addr;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS, POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
      console.error("Missing Supabase environment variables");
      return res.status(500).json({ error: "Server configuration error: Missing database credentials" });
    }

    const authClient = createClient(supabaseUrl, serviceRoleKey || anonKey!);
    const { data: { user }, error: authErr } = await authClient.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: "Invalid token" });

    const supabase = serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey)
      : createClient(supabaseUrl, anonKey!, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        });

    const body = createInput.parse(req.body);
    console.log("Parsed request body:", body);

    const { data: match, error: matchErr } = await supabase
      .from("matches")
      .select("price_vip, price_regular, price_economy, available_vip, available_regular, available_economy")
      .eq("id", body.matchId)
      .maybeSingle();
    
    if (matchErr) {
      console.error("Database error fetching match:", matchErr);
      return res.status(500).json({ error: "Database error fetching match details" });
    }
    if (!match) {
      console.warn("Match not found:", body.matchId);
      return res.status(404).json({ error: "Match not found" });
    }

    console.log("Found match details:", match);

    const priceMap = { vip: Number(match.price_vip), regular: Number(match.price_regular), economy: Number(match.price_economy) };
    const availMap = { vip: match.available_vip, regular: match.available_regular, economy: match.available_economy };
    
    if (availMap[body.category] < body.quantity) {
      return res.status(400).json({ error: `Only ${availMap[body.category]} ${body.category} tickets left.` });
    }

    const seatMultiplier = body.seatMultiplier ?? 1;
    const usd = +(priceMap[body.category] * body.quantity * seatMultiplier).toFixed(2);
    console.log(`Calculating payment for ${body.quantity} ${body.category} tickets. USD Total: ${usd}`);

    const rate = await getUsdRate(body.chain);
    console.log(`Current ${body.chain.toUpperCase()} rate: ${rate}`);

    const cryptoAmount = +(usd / rate).toFixed(8);
    const depositAddress = getDepositAddress(body.chain);
    const expiresAt = new Date(Date.now() + PAYMENT_TTL_MS).toISOString();

    console.log("Attempting to insert crypto_payment record...");

    const payloadWithExtras: any = {
      user_id: user.id,
      match_id: body.matchId,
      category: body.category,
      quantity: body.quantity,
      chain: body.chain,
      deposit_address: depositAddress,
      usd_amount: usd,
      crypto_amount: cryptoAmount,
      rate_usd_per_unit: rate,
      seat_section: body.seatSection ?? null,
      seat_multiplier: body.seatMultiplier ?? null,
      display_currency: body.displayCurrency ?? null,
      display_total: body.displayTotal ?? null,
      expires_at: expiresAt,
    };

    let insertRes = await supabase.from("crypto_payments").insert(payloadWithExtras).select("id").single();
    if (insertRes.error?.message?.includes("schema cache")) {
      const payloadBase: any = {
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
      };
      insertRes = await supabase.from("crypto_payments").insert(payloadBase).select("id").single();
    }

    const { data: row, error: insErr } = insertRes;

    if (insErr || !row) {
      console.error("Database error inserting crypto_payment:", insErr);
      return res.status(500).json({ error: insErr?.message || "Could not create payment record in database" });
    }

    console.log("Successfully created crypto_payment record:", row.id);

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
  } catch (err: any) {
    console.error("Error in /api/payment/create:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
