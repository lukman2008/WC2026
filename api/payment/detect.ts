import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const detectInput = z.object({
  paymentId: z.string().uuid(),
});

const MIN_CONFIRMATIONS = { btc: 1, eth: 6 } as const;

function getEnv() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const alchemyKey = process.env.ALCHEMY_API_KEY || process.env.VITE_ALCHEMY_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM_EMAIL;
  return { supabaseUrl, serviceRoleKey, anonKey, alchemyKey, resendKey, resendFrom };
}

async function findBtcTxHash(args: { address: string; minAmountBtc: number }) {
  const res = await fetch(`https://mempool.space/api/address/${args.address}/txs`);
  if (!res.ok) throw new Error(`Mempool.space error (${res.status})`);
  const txs = (await res.json()) as any[];
  for (const tx of txs || []) {
    let satsToAddr = 0;
    for (const out of tx.vout || []) {
      if (out.scriptpubkey_address === args.address) {
        satsToAddr += out.value;
      }
    }
    const amount = satsToAddr / 1e8;
    if (amount + 1e-9 >= args.minAmountBtc) {
      return { txHash: tx.txid as string, amountReceived: amount };
    }
  }
  return null;
}

async function findEthTxHash(args: { address: string; minAmountEth: number; alchemyKey?: string }) {
  if (!args.alchemyKey) return null;
  const url = `https://eth-mainnet.g.alchemy.com/v2/${args.alchemyKey}`;
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

  const transfers = (await rpc("alchemy_getAssetTransfers", [{
    fromBlock: "0x0",
    toBlock: "latest",
    toAddress: args.address,
    category: ["external"],
    withMetadata: true,
    maxCount: "0x14",
    order: "desc",
  }])) as any;

  const list = transfers?.transfers || [];
  for (const t of list) {
    const value = Number(t.value || 0);
    if (value + 1e-9 >= args.minAmountEth) {
      return { txHash: t.hash as string, amountReceived: value };
    }
  }
  return null;
}

async function verifyBtcConfirmations(txHash: string) {
  const txRes = await fetch(`https://mempool.space/api/tx/${txHash}`);
  if (!txRes.ok) return 0;
  const tx = (await txRes.json()) as any;
  if (!tx.status?.confirmed || !tx.status?.block_height) return 0;
  const tipRes = await fetch("https://mempool.space/api/blocks/tip/height");
  if (!tipRes.ok) return 0;
  const tip = parseInt(await tipRes.text(), 10);
  return Math.max(0, tip - tx.status.block_height + 1);
}

async function verifyEthConfirmations(txHash: string, alchemyKey?: string) {
  if (!alchemyKey) return 0;
  const url = `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`;
  const rpc = async (method: string, params: unknown[]) => {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as any;
    if (j.error) return null;
    return j.result;
  };
  const tx = (await rpc("eth_getTransactionByHash", [txHash])) as any;
  if (!tx || !tx.blockNumber) return 0;
  const receipt = (await rpc("eth_getTransactionReceipt", [txHash])) as any;
  if (!receipt || receipt.status !== "0x1") return 0;
  const tipHex = (await rpc("eth_blockNumber", [])) as string;
  if (!tipHex) return 0;
  const tip = parseInt(tipHex, 16);
  const block = parseInt(tx.blockNumber, 16);
  return Math.max(0, tip - block + 1);
}

async function sendTicketsEmail(args: { resendKey: string; resendFrom: string; to: string; subject: string; html: string }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: args.resendFrom,
      to: args.to,
      subject: args.subject,
      html: args.html,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Email provider error (${res.status}): ${t}`);
  }
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

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];

  const { supabaseUrl, serviceRoleKey, anonKey, alchemyKey, resendKey, resendFrom } = getEnv();
  if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
    return res.status(500).json({ error: "Server configuration error: Missing database credentials" });
  }

  try {
    const body = detectInput.parse(req.body);
    const authClient = createClient(supabaseUrl, serviceRoleKey || anonKey!);
    const { data: authData, error: authErr } = await authClient.auth.getUser(token);
    const user = authData.user;
    if (authErr || !user) return res.status(401).json({ error: "Invalid token" });

    const supabase = serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey)
      : createClient(supabaseUrl, anonKey!, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        });

    const { data: payment, error: pErr } = await supabase
      .from("crypto_payments")
      .select("*")
      .eq("id", body.paymentId)
      .maybeSingle();

    if (pErr || !payment) return res.status(404).json({ error: "Payment not found" });
    if (payment.user_id !== user.id) return res.status(403).json({ error: "Not your payment" });

    if (payment.status === "completed" && payment.transaction_id) {
      const { data: tickets } = await supabase.from("tickets").select("ticket_code").eq("transaction_id", payment.transaction_id);
      return res.status(200).json({ ok: true, status: "completed", ticketCodes: (tickets || []).map((t: any) => t.ticket_code), emailSent: false });
    }

    if (new Date(payment.expires_at).getTime() < Date.now() && payment.status === "awaiting_payment") {
      await supabase.from("crypto_payments").update({ status: "expired" }).eq("id", payment.id);
      return res.status(400).json({ error: "Payment window expired. Please start a new payment." });
    }

    const chain = payment.chain as "btc" | "eth";
    const required = Number(payment.crypto_amount);
    const minRequired = required * 0.99;

    let found: { txHash: string; amountReceived: number } | null = null;
    if (chain === "btc") {
      found = await findBtcTxHash({ address: payment.deposit_address, minAmountBtc: minRequired });
    } else {
      found = await findEthTxHash({ address: payment.deposit_address, minAmountEth: minRequired, alchemyKey });
    }

    if (!found) {
      return res.status(200).json({ ok: true, status: "awaiting_payment" });
    }

    const confirmations = chain === "btc"
      ? await verifyBtcConfirmations(found.txHash)
      : await verifyEthConfirmations(found.txHash, alchemyKey);

    const needed = MIN_CONFIRMATIONS[chain];
    const status = confirmations <= 0 ? "submitted" : confirmations < needed ? "confirming" : "confirming";

    await supabase.from("crypto_payments").update({
      tx_hash: found.txHash,
      confirmations,
      status,
      error_message: null,
    }).eq("id", payment.id);

    if (confirmations < needed) {
      return res.status(200).json({ ok: true, status: "confirming", txHash: found.txHash, confirmations, needed });
    }

    const { data: complete, error: cErr } = await supabase.rpc("complete_crypto_payment", { _payment_id: payment.id });
    if (cErr) {
      await supabase.from("crypto_payments").update({ status: "failed", error_message: cErr.message }).eq("id", payment.id);
      return res.status(500).json({ error: cErr.message });
    }

    const codes: string[] = complete?.[0]?.ticket_codes ?? [];
    let emailSent = false;
    if (resendKey && resendFrom && user.email && codes.length > 0) {
      try {
        const seatSection = payment.seat_section ? `<p><strong>Section:</strong> ${payment.seat_section}</p>` : "";
        await sendTicketsEmail({
          resendKey,
          resendFrom,
          to: user.email,
          subject: "Your World Cup 2026 Tickets",
          html: `<div><h2>Tickets confirmed</h2>${seatSection}<p><strong>Ticket codes:</strong></p><ul>${codes.map(c => `<li>${c}</li>`).join("")}</ul><p>You can also view them in My Tickets.</p></div>`,
        });
        emailSent = true;
      } catch (_e) {
        emailSent = false;
      }
    }

    return res.status(200).json({ ok: true, status: "completed", ticketCodes: codes, emailSent });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Internal server error" });
  }
}
