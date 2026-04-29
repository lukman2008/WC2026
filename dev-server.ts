import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// ============ Input Validation ============
const createInput = z.object({
  matchId: z.string().uuid(),
  category: z.enum(["vip", "regular", "economy"]),
  quantity: z.number().int().min(1).max(10),
  chain: z.enum(["btc", "eth"]),
});

const verifyInput = z.object({
  paymentId: z.string().uuid(),
  txHash: z.string().min(10).max(200),
});

const PAYMENT_TTL_MS = 30 * 60 * 1000;
const MIN_CONFIRMATIONS = { btc: 1, eth: 6 } as const;

// ============ Environment ============
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://kjpujehklquxjzlaijbl.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqcHVqZWhrbHF1eGp6bGFpamJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjYwMTMsImV4cCI6MjA5MTg0MjAxM30.G2JNCllreOYm5OQTX2g-_PhNe-0LCE5qozU05Js-N08";
const BTC_DEPOSIT_ADDRESS = process.env.VITE_BTC_DEPOSIT_ADDRESS || "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
const ETH_DEPOSIT_ADDRESS = process.env.VITE_ETH_DEPOSIT_ADDRESS || "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";

// ============ Helpers ============
async function getUsdRate(chain) {
  const id = chain === "btc" ? "bitcoin" : "ethereum";
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
    if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
    const json = await res.json();
    const rate = json[id]?.usd;
    if (!rate || rate <= 0) throw new Error("Invalid price");
    return rate;
  } catch (err) {
    console.error("Rate fetch error:", err);
    throw new Error(`Failed to get conversion rate: ${err.message}`);
  }
}

function getDepositAddress(chain) {
  return chain === "btc" ? BTC_DEPOSIT_ADDRESS : ETH_DEPOSIT_ADDRESS;
}

async function getSupabaseUser(token) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error("Invalid token");
  return user;
}

async function getMatch(supabase, matchId) {
  const { data: match, error } = await supabase
    .from("matches")
    .select("price_vip, price_regular, price_economy, available_vip, available_regular, available_economy")
    .eq("id", matchId)
    .maybeSingle();
  
  if (error) throw new Error("Database error: " + error.message);
  if (!match) throw new Error("Match not found");
  return match;
}

// ============ API Routes ============
async function handlePaymentCreate(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.writeHead(401).end(JSON.stringify({ error: "Unauthorized" }));
  }
  const token = authHeader.split(" ")[1];

  try {
    const body = await new Promise((resolve) => {
      let data = "";
      req.on("data", (chunk) => (data += chunk));
      req.on("end", () => resolve(JSON.parse(data)));
    });

    const { matchId, category, quantity, chain } = createInput.parse(body);
    const user = await getSupabaseUser(token);
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const match = await getMatch(supabase, matchId);

    const priceMap = { vip: Number(match.price_vip), regular: Number(match.price_regular), economy: Number(match.price_economy) };
    const usdTotal = priceMap[category] * quantity;
    const rate = await getUsdRate(chain);
    const cryptoAmount = (usdTotal / rate).toFixed(8);
    const expiresAt = new Date(Date.now() + PAYMENT_TTL_MS).toISOString();

    // Create payment record
    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .insert({
        user_id: user.id,
        match_id: matchId,
        category,
        quantity,
        chain,
        status: "pending",
        crypto_amount: cryptoAmount,
        usd_amount: usdTotal,
        rate,
        tx_hash: null,
        deposit_address: getDepositAddress(chain),
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (payErr) throw new Error("Failed to create payment: " + payErr.message);

    res.writeHead(200).end(JSON.stringify({
      ok: true,
      paymentId: payment.id,
      chain,
      depositAddress: getDepositAddress(chain),
      cryptoAmount,
      usdAmount: usdTotal,
      rate,
      expiresAt,
      minConfirmations: MIN_CONFIRMATIONS[chain],
    }));
  } catch (err) {
    console.error("Payment create error:", err);
    const status = err.message.includes("Unauthorized") ? 401 : err.message.includes("not found") ? 404 : 500;
    res.writeHead(status).end(JSON.stringify({ ok: false, error: err.message }));
  }
}

async function handlePaymentVerify(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.writeHead(401).end(JSON.stringify({ error: "Unauthorized" }));
  }
  const token = authHeader.split(" ")[1];

  try {
    const body = await new Promise((resolve) => {
      let data = "";
      req.on("data", (chunk) => (data += chunk));
      req.on("end", () => resolve(JSON.parse(data)));
    });

    const { paymentId, txHash } = verifyInput.parse(body);
    const user = await getSupabaseUser(token);
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Update payment with tx hash
    const { error: upErr } = await supabase
      .from("payments")
      .update({ tx_hash: txHash, status: "confirming" })
      .eq("id", paymentId)
      .eq("user_id", user.id);

    if (upErr) throw new Error("Failed to update payment: " + upErr.message);

    // For demo, auto-confirm after short delay
    res.writeHead(200).end(JSON.stringify({
      ok: true,
      status: "completed",
      ticketCodes: [`TICKET-${paymentId.slice(0, 8).toUpperCase()}`],
    }));
  } catch (err) {
    console.error("Payment verify error:", err);
    const status = err.message.includes("Unauthorized") ? 401 : 500;
    res.writeHead(status).end(JSON.stringify({ ok: false, error: err.message }));
  }
}

// ============ Server ============
const PORT = 3001;
const server = createServer(async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");

  if (req.method === "OPTIONS") {
    return res.writeHead(200).end();
  }

  const url = req.url || "";

  try {
    if (url === "/api/payment/create" && req.method === "POST") {
      await handlePaymentCreate(req, res);
    } else if (url === "/api/payment/verify" && req.method === "POST") {
      await handlePaymentVerify(req, res);
    } else {
      res.writeHead(404).end(JSON.stringify({ error: "Not found" }));
    }
  } catch (err) {
    console.error("Server error:", err);
    res.writeHead(500).end(JSON.stringify({ error: "Internal server error" }));
  }
});

server.listen(PORT, () => {
  console.log(`✅ API server running on http://localhost:${PORT}`);
});