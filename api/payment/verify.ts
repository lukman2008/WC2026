import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const verifyInput = z.object({
  paymentId: z.string().uuid(),
  txHash: z.string().min(10).max(200),
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

async function verifyBtcTx(txHash: string, expectedAddress: string) {
  const txRes = await fetch(`https://mempool.space/api/tx/${txHash}`);
  if (!txRes.ok) {
    if (txRes.status === 404) {
      return { ok: false, confirmations: 0, amountReceived: 0, toMatched: false, error: "Transaction not found on Bitcoin network" };
    }
    return { ok: false, confirmations: 0, amountReceived: 0, toMatched: false, error: `Mempool.space error (${txRes.status})` };
  }
  const tx = (await txRes.json()) as any;

  let satsToAddr = 0;
  let toMatched = false;
  for (const out of tx.vout || []) {
    if (out.scriptpubkey_address === expectedAddress) {
      satsToAddr += out.value;
      toMatched = true;
    }
  }
  const amountBtc = satsToAddr / 1e8;

  let confirmations = 0;
  if (tx.status?.confirmed && tx.status?.block_height) {
    const tipRes = await fetch("https://mempool.space/api/blocks/tip/height");
    if (tipRes.ok) {
      const tip = parseInt(await tipRes.text(), 10);
      confirmations = Math.max(0, tip - tx.status.block_height + 1);
    }
  }

  return { ok: toMatched, confirmations, amountReceived: amountBtc, toMatched };
}

async function verifyEthTx(txHash: string, expectedAddress: string, alchemyKey: string | undefined) {
  if (!alchemyKey) {
    return { ok: false, confirmations: 0, amountReceived: 0, toMatched: false, error: "Ethereum verification is not configured on the server" };
  }

  const url = `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`;
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
    const body = verifyInput.parse(req.body);
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
    const verify = chain === "btc"
      ? await verifyBtcTx(body.txHash, payment.deposit_address)
      : await verifyEthTx(body.txHash, payment.deposit_address, alchemyKey);

    if (!verify.toMatched) {
      await supabase.from("crypto_payments").update({
        tx_hash: body.txHash,
        confirmations: verify.confirmations,
        status: "failed",
        error_message: verify.error || `Transaction does not pay our ${chain.toUpperCase()} address.`,
      }).eq("id", payment.id);
      return res.status(400).json({ error: verify.error || `Transaction does not pay our ${chain.toUpperCase()} address.` });
    }

    const required = Number(payment.crypto_amount);
    const minRequired = required * 0.99;
    if (verify.amountReceived + 1e-9 < minRequired) {
      await supabase.from("crypto_payments").update({
        tx_hash: body.txHash,
        confirmations: verify.confirmations,
        status: "failed",
        error_message: `Insufficient amount: received ${verify.amountReceived} ${chain.toUpperCase()}, expected ${required}.`,
      }).eq("id", payment.id);
      return res.status(400).json({ error: `Insufficient amount: received ${verify.amountReceived} ${chain.toUpperCase()}, expected ${required}.` });
    }

    const needed = MIN_CONFIRMATIONS[chain];
    const status = verify.confirmations <= 0 ? "submitted" : verify.confirmations < needed ? "confirming" : "confirming";
    await supabase.from("crypto_payments").update({
      tx_hash: body.txHash,
      confirmations: verify.confirmations,
      status,
      error_message: null,
    }).eq("id", payment.id);

    if (verify.confirmations < needed) {
      return res.status(200).json({ ok: true, status: "confirming", confirmations: verify.confirmations, needed });
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
