import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PaymentRecord {
  id: string;
  matchId: string;
  category: "vip" | "regular" | "economy";
  quantity: number;
  chain: "btc" | "eth";
  cryptoAmount: string;
  usdAmount: number;
  depositAddress: string;
  txHash: string | null;
  confirmations: number;
  status: "awaiting_payment" | "submitted" | "confirming" | "completed" | "failed" | "expired";
  createdAt: string;
  seatSection: string | null;
  displayCurrency: string | null;
  displayTotal: number | null;
}

export function usePaymentHistory() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const full = await supabase
      .from("crypto_payments")
      .select("id, match_id, category, quantity, chain, crypto_amount, usd_amount, deposit_address, tx_hash, confirmations, status, created_at, seat_section, display_currency, display_total")
      .order("created_at", { ascending: false });

    const needsFallback = full.error?.message?.includes("schema cache");
    const base = needsFallback
      ? await supabase
          .from("crypto_payments")
          .select("id, match_id, category, quantity, chain, crypto_amount, usd_amount, deposit_address, tx_hash, confirmations, status, created_at")
          .order("created_at", { ascending: false })
      : null;

    const { data, error } = needsFallback && base ? base : full;

    if (error || !data) {
      setPayments([]);
      setLoading(false);
      return;
    }

    setPayments(
      data.map((p: any) => ({
        id: p.id,
        matchId: p.match_id,
        category: p.category,
        quantity: p.quantity,
        chain: p.chain,
        cryptoAmount: String(p.crypto_amount),
        usdAmount: Number(p.usd_amount),
        depositAddress: p.deposit_address,
        txHash: p.tx_hash,
        confirmations: Number(p.confirmations ?? 0),
        status: p.status,
        createdAt: p.created_at,
        seatSection: p.seat_section ?? null,
        displayCurrency: p.display_currency ?? null,
        displayTotal: p.display_total ?? null,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    payments,
    loading,
    refresh,
  };
}
