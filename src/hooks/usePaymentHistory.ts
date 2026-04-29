import { useState, useEffect, useCallback } from "react";

export interface PaymentRecord {
  id: string;
  matchId: string;
  category: "vip" | "regular" | "economy";
  quantity: number;
  chain: "btc" | "eth";
  cryptoAmount: string;
  usdAmount: number;
  depositAddress: string;
  txHash: string;
  status: "pending" | "completed" | "failed";
  createdAt: string;
  completedAt?: string;
}

const STORAGE_KEY = "goal-getter-payments";

function getStoredPayments(): PaymentRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function savePayments(payments: PaymentRecord[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payments));
  }
}

export function usePaymentHistory() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  // Load on mount
  useEffect(() => {
    setPayments(getStoredPayments());
  }, []);

  const addPayment = useCallback((payment: Omit<PaymentRecord, "id" | "status" | "createdAt">) => {
    const newPayment: PaymentRecord = {
      ...payment,
      id: crypto.randomUUID(),
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    
    setPayments(prev => {
      const updated = [newPayment, ...prev];
      savePayments(updated);
      return updated;
    });
    return newPayment;
  }, []);

  const completePayment = useCallback((id: string, txHash: string) => {
    setPayments(prev => {
      const updated = prev.map(p => 
        p.id === id 
          ? { ...p, status: "completed" as const, txHash, completedAt: new Date().toISOString() }
          : p
      );
      savePayments(updated);
      return updated;
    });
  }, []);

  const failPayment = useCallback((id: string) => {
    setPayments(prev => {
      const updated = prev.map(p => 
        p.id === id 
          ? { ...p, status: "failed" as const }
          : p
      );
      savePayments(updated);
      return updated;
    });
  }, []);

  const getPaymentsByMatch = useCallback((matchId: string) => {
    return payments.filter(p => p.matchId === matchId);
  }, [payments]);

  const getUserPayments = useCallback(() => {
    return payments;
  }, [payments]);

  return {
    payments,
    addPayment,
    completePayment,
    failPayment,
    getPaymentsByMatch,
    getUserPayments,
  };
}