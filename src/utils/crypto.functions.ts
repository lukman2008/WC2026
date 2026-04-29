import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

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

// ============ Result Types ============
export type CreateResult =
  | { ok: true; paymentId: string; chain: "btc" | "eth"; depositAddress: string; cryptoAmount: string; usdAmount: number; rate: number; expiresAt: string; minConfirmations: number }
  | { ok: false; error: string };

export type VerifyApiResult =
  | { ok: true; status: "completed"; ticketCodes: string[] }
  | { ok: true; status: "confirming"; confirmations: number; needed: number }
  | { ok: false; error: string };

// ============ API Callers ============
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

    const response = await fetch(import.meta.env.DEV ? "http://localhost:3001/api/payment/create" : "/api/payment/create", {
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
      return { ok: false, error: errorData.message || errorData.error || "Failed to create payment" };
    }

    return await response.json();
  } catch (e) {
    console.error("createCryptoPayment error:", e);
    return { ok: false, error: e instanceof Error ? e.message : "Unexpected error" };
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

    const response = await fetch(import.meta.env.DEV ? "http://localhost:3001/api/payment/verify" : "/api/payment/verify", {
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
