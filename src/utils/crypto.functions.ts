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

export const createCryptoPayment = async (input: z.infer<typeof createInput>): Promise<CreateResult> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch("/api/payment/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(createInput.parse(input)),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { ok: false, error: errorData.error || `Request failed with status ${response.status}` };
    }

    return await response.json();
  } catch (e) {
    console.error("createCryptoPayment error:", e);
    return { ok: false, error: e instanceof Error ? e.message : "Unexpected error" };
  }
};

export const verifyCryptoPayment = async (input: z.infer<typeof verifyInput>): Promise<VerifyApiResult> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch("/api/payment/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(verifyInput.parse(input)),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { ok: false, error: errorData.error || `Request failed with status ${response.status}` };
    }

    return await response.json();
  } catch (e) {
    console.error("verifyCryptoPayment error:", e);
    return { ok: false, error: e instanceof Error ? e.message : "Unexpected error" };
  }
};
