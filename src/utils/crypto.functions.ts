import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

// Attach Supabase access token to server-fn requests
const attachAuthHeader = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
});

// ============ Inputs ============
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

const PAYMENT_TTL_MS = 30 * 60 * 1000; // 30 min
const MIN_CONFIRMATIONS = { btc: 1, eth: 6 } as const;

// ============ Helpers ============
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

// ============ Verify on-chain ============
interface VerifyResult {
  ok: boolean;
  confirmations: number;
  amountReceived: number; // in BTC or ETH
  toMatched: boolean;
  error?: string;
}

async function verifyBtcTx(txHash: string, expectedAddress: string): Promise<VerifyResult> {
  const txRes = await fetch(`https://mempool.space/api/tx/${txHash}`);
  if (!txRes.ok) {
    if (txRes.status === 404) return { ok: false, confirmations: 0, amountReceived: 0, toMatched: false, error: "Transaction not found on Bitcoin network" };
    return { ok: false, confirmations: 0, amountReceived: 0, toMatched: false, error: `Mempool.space error (${txRes.status})` };
  }
  const tx = (await txRes.json()) as {
    vout: Array<{ scriptpubkey_address?: string; value: number }>;
    status: { confirmed: boolean; block_height?: number };
  };

  let satsToAddr = 0;
  let toMatched = false;
  for (const out of tx.vout) {
    if (out.scriptpubkey_address === expectedAddress) {
      satsToAddr += out.value;
      toMatched = true;
    }
  }
  const amountBtc = satsToAddr / 1e8;

  let confirmations = 0;
  if (tx.status.confirmed && tx.status.block_height) {
    const tipRes = await fetch("https://mempool.space/api/blocks/tip/height");
    if (tipRes.ok) {
      const tip = parseInt(await tipRes.text(), 10);
      confirmations = Math.max(0, tip - tx.status.block_height + 1);
    }
  }

  return { ok: toMatched, confirmations, amountReceived: amountBtc, toMatched };
}

async function verifyEthTx(txHash: string, expectedAddress: string): Promise<VerifyResult> {
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) throw new Error("ALCHEMY_API_KEY not configured");
  const url = `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;

  const rpc = async (method: string, params: unknown[]) => {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    if (!r.ok) throw new Error(`Alchemy error ${r.status}`);
    const j = (await r.json()) as { result?: unknown; error?: { message: string } };
    if (j.error) throw new Error(j.error.message);
    return j.result;
  };

  const tx = (await rpc("eth_getTransactionByHash", [txHash])) as null | {
    to: string | null;
    value: string;
    blockNumber: string | null;
  };
  if (!tx) return { ok: false, confirmations: 0, amountReceived: 0, toMatched: false, error: "Transaction not found on Ethereum network" };

  const toMatched = (tx.to || "").toLowerCase() === expectedAddress.toLowerCase();
  const wei = BigInt(tx.value || "0x0");
  const amountEth = Number(wei) / 1e18;

  let confirmations = 0;
  if (tx.blockNumber) {
    const receipt = (await rpc("eth_getTransactionReceipt", [txHash])) as null | { status: string };
    if (!receipt || receipt.status !== "0x1") {
      return { ok: false, confirmations: 0, amountReceived: amountEth, toMatched, error: "Transaction failed on-chain" };
    }
    const tipHex = (await rpc("eth_blockNumber", [])) as string;
    const tip = parseInt(tipHex, 16);
    const block = parseInt(tx.blockNumber, 16);
    confirmations = Math.max(0, tip - block + 1);
  }

  return { ok: toMatched, confirmations, amountReceived: amountEth, toMatched };
}

// ============ Create payment intent ============
type CreateResult =
  | { ok: true; paymentId: string; chain: "btc" | "eth"; depositAddress: string; cryptoAmount: string; usdAmount: number; rate: number; expiresAt: string; minConfirmations: number }
  | { ok: false; error: string };

export const createCryptoPayment = createServerFn({ method: "POST" })
  .middleware([attachAuthHeader, requireSupabaseAuth])
  .inputValidator((input: unknown) => createInput.parse(input))
  .handler(async ({ data, context }): Promise<CreateResult> => {
    try {
      const { userId, supabase: db } = context;

      const { data: match, error: matchErr } = await db
        .from("matches")
        .select("price_vip, price_regular, price_economy, available_vip, available_regular, available_economy")
        .eq("id", data.matchId)
        .maybeSingle();
      if (matchErr || !match) return { ok: false, error: "Match not found" };

      const priceMap = { vip: Number(match.price_vip), regular: Number(match.price_regular), economy: Number(match.price_economy) };
      const availMap = { vip: match.available_vip, regular: match.available_regular, economy: match.available_economy };
      if (availMap[data.category] < data.quantity) {
        return { ok: false, error: `Only ${availMap[data.category]} ${data.category} tickets left.` };
      }

      const usd = +(priceMap[data.category] * data.quantity).toFixed(2);
      const rate = await getUsdRate(data.chain);
      const cryptoAmount = +(usd / rate).toFixed(8);
      const depositAddress = getDepositAddress(data.chain);
      const expiresAt = new Date(Date.now() + PAYMENT_TTL_MS).toISOString();

      const { data: row, error: insErr } = await db
        .from("crypto_payments")
        .insert({
          user_id: userId,
          match_id: data.matchId,
          category: data.category,
          quantity: data.quantity,
          chain: data.chain,
          deposit_address: depositAddress,
          usd_amount: usd,
          crypto_amount: cryptoAmount,
          rate_usd_per_unit: rate,
          expires_at: expiresAt,
        })
        .select("id")
        .single();

      if (insErr || !row) return { ok: false, error: insErr?.message || "Could not create payment" };

      return {
        ok: true,
        paymentId: row.id,
        chain: data.chain,
        depositAddress,
        cryptoAmount: cryptoAmount.toString(),
        usdAmount: usd,
        rate,
        expiresAt,
        minConfirmations: MIN_CONFIRMATIONS[data.chain],
      };
    } catch (e) {
      console.error("createCryptoPayment error:", e);
      return { ok: false, error: e instanceof Error ? e.message : "Unexpected error" };
    }
  });

// ============ Verify + complete ============
type VerifyApiResult =
  | { ok: true; status: "completed"; ticketCodes: string[] }
  | { ok: true; status: "confirming"; confirmations: number; needed: number }
  | { ok: false; error: string };

export const verifyCryptoPayment = createServerFn({ method: "POST" })
  .middleware([attachAuthHeader, requireSupabaseAuth])
  .inputValidator((input: unknown) => verifyInput.parse(input))
  .handler(async ({ data, context }): Promise<VerifyApiResult> => {
    try {
      const { userId } = context;

      const { data: payment, error: pErr } = await supabaseAdmin
        .from("crypto_payments")
        .select("*")
        .eq("id", data.paymentId)
        .maybeSingle();
      if (pErr || !payment) return { ok: false, error: "Payment not found" };
      if (payment.user_id !== userId) return { ok: false, error: "Not your payment" };

      // Idempotent completion
      if (payment.status === "completed" && payment.transaction_id) {
        const { data: tickets } = await supabaseAdmin
          .from("tickets")
          .select("ticket_code")
          .eq("transaction_id", payment.transaction_id);
        return { ok: true, status: "completed", ticketCodes: (tickets || []).map(t => t.ticket_code) };
      }

      if (new Date(payment.expires_at).getTime() < Date.now() && payment.status === "awaiting_payment") {
        await supabaseAdmin.from("crypto_payments").update({ status: "expired" }).eq("id", payment.id);
        return { ok: false, error: "Payment window expired. Please start a new payment." };
      }

      // Reject hash already used by a different payment
      const { data: dupe } = await supabaseAdmin
        .from("crypto_payments")
        .select("id")
        .eq("chain", payment.chain)
        .eq("tx_hash", data.txHash)
        .neq("id", payment.id)
        .maybeSingle();
      if (dupe) return { ok: false, error: "This transaction hash is already used for another order." };

      const chain = payment.chain as "btc" | "eth";
      const verify = chain === "btc"
        ? await verifyBtcTx(data.txHash, payment.deposit_address)
        : await verifyEthTx(data.txHash, payment.deposit_address);

      if (!verify.toMatched) {
        return { ok: false, error: verify.error || `Transaction does not pay our ${chain.toUpperCase()} address.` };
      }

      const required = Number(payment.crypto_amount);
      // Allow 1% slippage to account for rate fluctuation between quote and pay.
      const minRequired = required * 0.99;
      if (verify.amountReceived + 1e-9 < minRequired) {
        return { ok: false, error: `Insufficient amount: received ${verify.amountReceived} ${chain.toUpperCase()}, expected ${required}.` };
      }

      const needed = MIN_CONFIRMATIONS[chain];
      const newStatus = verify.confirmations >= needed ? "confirming" : "submitted";

      await supabaseAdmin.from("crypto_payments").update({
        tx_hash: data.txHash,
        confirmations: verify.confirmations,
        status: newStatus,
      }).eq("id", payment.id);

      if (verify.confirmations < needed) {
        return { ok: true, status: "confirming", confirmations: verify.confirmations, needed };
      }

      // Complete: issue tickets
      const { data: complete, error: cErr } = await supabaseAdmin.rpc("complete_crypto_payment", { _payment_id: payment.id });
      if (cErr) {
        console.error("complete_crypto_payment failed:", cErr);
        await supabaseAdmin.from("crypto_payments").update({ status: "failed", error_message: cErr.message }).eq("id", payment.id);
        return { ok: false, error: cErr.message };
      }
      const codes = complete?.[0]?.ticket_codes ?? [];
      return { ok: true, status: "completed", ticketCodes: codes };
    } catch (e) {
      console.error("verifyCryptoPayment error:", e);
      return { ok: false, error: e instanceof Error ? e.message : "Unexpected error" };
    }
  });
