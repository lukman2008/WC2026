import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

// ============ Inputs ============
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

const verifyInput = z.object({
  paymentId: z.string().uuid(),
  txHash: z.string().min(10).max(200),
});

// ============ Result Types ============
export type CreateResult =
  | { ok: true; paymentId: string; chain: "btc" | "eth"; depositAddress: string; cryptoAmount: string; usdAmount: number; rate: number; expiresAt: string; minConfirmations: number }
  | { ok: false; error: string };

export type VerifyApiResult =
  | { ok: true; status: "completed"; ticketCodes: string[]; emailSent?: boolean }
  | { ok: true; status: "confirming"; confirmations: number; needed: number }
  | { ok: false; error: string };

export type DetectApiResult =
  | { ok: true; status: "awaiting_payment" }
  | { ok: true; status: "confirming"; txHash?: string; confirmations: number; needed: number }
  | { ok: true; status: "completed"; ticketCodes: string[]; emailSent?: boolean }
  | { ok: false; error: string };

// ============ API Callers ============
const PROD_API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://wc2026-fawn.vercel.app";
const LOCAL_API_BASE = "http://localhost:3000";

function buildApiUrl(base: string, path: string) {
  return base ? `${base}${path}` : path;
}

async function fetchApi(path: string, init: RequestInit) {
  if (import.meta.env.DEV) {
    try {
      const localRes = await fetch(buildApiUrl(LOCAL_API_BASE, path), init);
      if (localRes.ok) return localRes;
      if (localRes.status >= 500) throw new Error(`Local API error (${localRes.status})`);
      return localRes;
    } catch (_err) {
      return fetch(buildApiUrl(PROD_API_BASE, path), init);
    }
  }

  return fetch(path, init);
}

async function getUsdRate(chain: "btc" | "eth") {
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

function getDepositAddress(chain: "btc" | "eth") {
  const btc =
    import.meta.env.VITE_BTC_DEPOSIT_ADDRESS ||
    "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
  const eth =
    import.meta.env.VITE_ETH_DEPOSIT_ADDRESS ||
    "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
  return chain === "btc" ? btc : eth;
}

async function createCryptoPaymentViaSupabase(
  input: z.infer<typeof createInput>,
  token?: string
): Promise<CreateResult> {
  if (!token) return { ok: false, error: "You must be signed in to create a payment." };

  const parsed = createInput.parse(input);
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  const user = userData.user;
  if (userErr || !user) return { ok: false, error: "Invalid session. Please sign in again." };

  const { data: match, error: matchErr } = await supabase
    .from("matches")
    .select("price_vip, price_regular, price_economy, available_vip, available_regular, available_economy")
    .eq("id", parsed.matchId)
    .maybeSingle();

  if (matchErr) return { ok: false, error: matchErr.message };
  if (!match) return { ok: false, error: "Match not found" };

  const priceMap = {
    vip: Number(match.price_vip),
    regular: Number(match.price_regular),
    economy: Number(match.price_economy),
  } as const;
  const availMap = {
    vip: match.available_vip,
    regular: match.available_regular,
    economy: match.available_economy,
  } as const;

  if (availMap[parsed.category] < parsed.quantity) {
    return { ok: false, error: `Only ${availMap[parsed.category]} ${parsed.category} tickets left.` };
  }

  const seatMultiplier = parsed.seatMultiplier ?? 1;
  const usdAmount = +(priceMap[parsed.category] * parsed.quantity * seatMultiplier).toFixed(2);
  const rate = await getUsdRate(parsed.chain);
  const cryptoAmount = +(usdAmount / rate).toFixed(8);
  const depositAddress = getDepositAddress(parsed.chain);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const payloadWithExtras: any = {
    user_id: user.id,
    match_id: parsed.matchId,
    category: parsed.category,
    quantity: parsed.quantity,
    chain: parsed.chain,
    deposit_address: depositAddress,
    usd_amount: usdAmount,
    crypto_amount: cryptoAmount,
    rate_usd_per_unit: rate,
    seat_section: parsed.seatSection ?? null,
    seat_multiplier: parsed.seatMultiplier ?? null,
    display_currency: parsed.displayCurrency ?? null,
    display_total: parsed.displayTotal ?? null,
    expires_at: expiresAt,
  };

  let insertRes = await supabase.from("crypto_payments").insert(payloadWithExtras).select("id").single();
  if (insertRes.error?.message?.includes("schema cache")) {
    const payloadBase: any = {
      user_id: user.id,
      match_id: parsed.matchId,
      category: parsed.category,
      quantity: parsed.quantity,
      chain: parsed.chain,
      deposit_address: depositAddress,
      usd_amount: usdAmount,
      crypto_amount: cryptoAmount,
      rate_usd_per_unit: rate,
      expires_at: expiresAt,
    };
    insertRes = await supabase.from("crypto_payments").insert(payloadBase).select("id").single();
  }

  const { data: row, error: insErr } = insertRes;

  if (insErr || !row) return { ok: false, error: insErr?.message || "Could not create payment" };

  return {
    ok: true,
    paymentId: row.id,
    chain: parsed.chain,
    depositAddress,
    cryptoAmount: cryptoAmount.toString(),
    usdAmount,
    rate,
    expiresAt,
    minConfirmations: parsed.chain === "btc" ? 1 : 6,
  };
}

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const createCryptoPayment = async (
  input: z.infer<typeof createInput>,
  token?: string
): Promise<CreateResult> => {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    } else {
      const authHeaders = await getAuthHeaders();
      Object.assign(headers, authHeaders);
    }

    const response = await fetchApi("/api/payment/create", {
      method: "POST",
      headers,
      body: JSON.stringify(createInput.parse(input)),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: `Server error: ${response.statusText}` };
      }
      if (response.status >= 500) {
        return await createCryptoPaymentViaSupabase(input, token);
      }
      return { ok: false, error: errorData.message || errorData.error || "Failed to create payment" };
    }

    return await response.json();
  } catch (e) {
    try {
      return await createCryptoPaymentViaSupabase(input, token);
    } catch (fallbackErr) {
      console.error("createCryptoPayment error:", e);
      console.error("createCryptoPayment fallback error:", fallbackErr);
      return { ok: false, error: e instanceof Error ? e.message : "Unexpected error" };
    }
  }
};

export const verifyCryptoPayment = async (
  input: z.infer<typeof verifyInput>,
  token?: string
): Promise<VerifyApiResult> => {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    } else {
      const authHeaders = await getAuthHeaders();
      Object.assign(headers, authHeaders);
    }

    const response = await fetchApi("/api/payment/verify", {
      method: "POST",
      headers,
      body: JSON.stringify(verifyInput.parse(input)),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: `Server error: ${response.statusText}` };
      }
      return { ok: false, error: errorData.message || errorData.error || "Failed to verify payment" };
    }

    return await response.json();
  } catch (e) {
    console.error("verifyCryptoPayment error:", e);
    return { ok: false, error: e instanceof Error ? e.message : "Unexpected error" };
  }
};

export const detectCryptoPayment = async (
  input: { paymentId: string },
  token?: string
): Promise<DetectApiResult> => {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    } else {
      const authHeaders = await getAuthHeaders();
      Object.assign(headers, authHeaders);
    }

    const response = await fetchApi("/api/payment/detect", {
      method: "POST",
      headers,
      body: JSON.stringify({ paymentId: input.paymentId }),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (_e) {
        errorData = { error: `Server error: ${response.statusText}` };
      }
      return { ok: false, error: errorData.message || errorData.error || "Failed to detect payment" };
    }

    return await response.json();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unexpected error" };
  }
};
