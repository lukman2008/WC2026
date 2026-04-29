import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const verifyInput = z.object({
  paymentId: z.string().uuid(),
  txHash: z.string().min(10).max(200),
});

const MIN_CONFIRMATIONS = { btc: 1, eth: 6 } as const;

async function verifyBtcTx(txHash: string, expectedAddress: string) {
  const txRes = await fetch(`https://mempool.space/api/tx/${txHash}`);
  if (!txRes.ok) {
    if (txRes.status === 404) return { ok: false, confirmations: 0, amountReceived: 0, toMatched: false, error: "Transaction not found on Bitcoin network" };
    return { ok: false, confirmations: 0, amountReceived: 0, toMatched: false, error: `Mempool.space error (${txRes.status})` };
  }
  const tx = (await txRes.json()) as any;

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

async function verifyEthTx(txHash: string, expectedAddress: string) {
  const apiKey = process.env.ALCHEMY_API_KEY || process.env.VITE_ALCHEMY_API_KEY;
  if (!apiKey) {
    console.error("ALCHEMY_API_KEY is missing from environment variables.");
    throw new Error("Server configuration error: Missing Alchemy API Key for Ethereum verification");
  }
  const url = `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;

  const rpc = async (method: string, params: unknown[]) => {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    if (!r.ok) throw new Error(`Alchemy error ${r.status}`);
    const j = (await r.json()) as any;
    if (j.error) throw new Error(j.error.message);
    return j.result;
  };

  const tx = (await rpc("eth_getTransactionByHash", [txHash])) as any;
  if (!tx) return { ok: false, confirmations: 0, amountReceived: 0, toMatched: false, error: "Transaction not found on Ethereum network" };

  const toMatched = (tx.to || "").toLowerCase() === expectedAddress.toLowerCase();
  const wei = BigInt(tx.value || "0x0");
  const amountEth = Number(wei) / 1e18;

  let confirmations = 0;
  if (tx.blockNumber) {
    const receipt = (await rpc("eth_getTransactionReceipt", [txHash])) as any;
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

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
    const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables");
      return res.status(500).json({ error: "Server configuration error: Missing database credentials" });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: "Invalid token" });

    const body = verifyInput.parse(req.body);

    const { data: payment, error: pErr } = await supabase
      .from("crypto_payments")
      .select("*")
      .eq("id", body.paymentId)
      .maybeSingle();
    
    if (pErr || !payment) return res.status(404).json({ error: "Payment not found" });
    if (payment.user_id !== user.id) return res.status(403).json({ error: "Not your payment" });

    if (payment.status === "completed" && payment.transaction_id) {
      const { data: tickets } = await supabase
        .from("tickets")
        .select("ticket_code")
        .eq("transaction_id", payment.transaction_id);
      return res.status(200).json({ ok: true, status: "completed", ticketCodes: (tickets || []).map((t: any) => t.ticket_code) });
    }

    if (new Date(payment.expires_at).getTime() < Date.now() && payment.status === "awaiting_payment") {
      await supabase.from("crypto_payments").update({ status: "expired" }).eq("id", payment.id);
      return res.status(400).json({ error: "Payment window expired. Please start a new payment." });
    }

    const chain = payment.chain as "btc" | "eth";
    const verify = chain === "btc"
      ? await verifyBtcTx(body.txHash, payment.deposit_address)
      : await verifyEthTx(body.txHash, payment.deposit_address);

    if (!verify.toMatched) {
      return res.status(400).json({ error: verify.error || `Transaction does not pay our ${chain.toUpperCase()} address.` });
    }

    const required = Number(payment.crypto_amount);
    const minRequired = required * 0.99;
    if (verify.amountReceived + 1e-9 < minRequired) {
      return res.status(400).json({ error: `Insufficient amount: received ${verify.amountReceived} ${chain.toUpperCase()}, expected ${required}.` });
    }

    const needed = MIN_CONFIRMATIONS[chain];
    const newStatus = verify.confirmations >= needed ? "confirming" : "submitted";

    await supabase.from("crypto_payments").update({
      tx_hash: body.txHash,
      confirmations: verify.confirmations,
      status: newStatus,
    }).eq("id", payment.id);

    if (verify.confirmations < needed) {
      return res.status(200).json({ ok: true, status: "confirming", confirmations: verify.confirmations, needed });
    }

    // Complete: issue tickets (using a service role key if needed, or if complete_crypto_payment is SECURITY DEFINER)
    // Here we use the standard key, but the RPC must be security definer.
    const { data: complete, error: cErr } = await supabase.rpc("complete_crypto_payment", { _payment_id: payment.id });
    if (cErr) {
      console.error("complete_crypto_payment failed:", cErr);
      await supabase.from("crypto_payments").update({ status: "failed", error_message: cErr.message }).eq("id", payment.id);
      return res.status(500).json({ error: cErr.message });
    }

    const codes = complete?.[0]?.ticket_codes ?? [];
    return res.status(200).json({ ok: true, status: "completed", ticketCodes: codes });
  } catch (e: any) {
    console.error("API verify payment error:", e);
    return res.status(500).json({ error: e.message || "Internal server error" });
  }
}
