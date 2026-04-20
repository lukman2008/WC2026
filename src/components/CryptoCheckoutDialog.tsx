import { useEffect, useState } from "react";
import { Loader2, Copy, Check, Bitcoin, AlertCircle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { createCryptoPayment, verifyCryptoPayment } from "@/utils/crypto.functions";

type Chain = "btc" | "eth";
type Category = "vip" | "regular" | "economy";

interface Props {
  open: boolean;
  onClose: () => void;
  matchId: string;
  category: Category;
  quantity: number;
  usdTotal: number;
}

interface Payment {
  paymentId: string;
  chain: Chain;
  depositAddress: string;
  cryptoAmount: string;
  usdAmount: number;
  rate: number;
  expiresAt: string;
  minConfirmations: number;
}

const chainMeta: Record<Chain, { label: string; symbol: string; color: string }> = {
  btc: { label: "Bitcoin", symbol: "BTC", color: "text-orange-500" },
  eth: { label: "Ethereum", symbol: "ETH", color: "text-indigo-400" },
};

export function CryptoCheckoutDialog({ open, onClose, matchId, category, quantity, usdTotal }: Props) {
  const navigate = useNavigate();
  const create = useServerFn(createCryptoPayment);
  const verify = useServerFn(verifyCryptoPayment);

  const [chain, setChain] = useState<Chain>("btc");
  const [creating, setCreating] = useState(false);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [txHash, setTxHash] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState<"addr" | "amt" | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [pendingMsg, setPendingMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPayment(null);
      setTxHash("");
      setPendingMsg(null);
    }
  }, [open]);

  useEffect(() => {
    if (!payment) return;
    const tick = () => setRemainingMs(Math.max(0, new Date(payment.expiresAt).getTime() - Date.now()));
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [payment]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await create({ data: { matchId, category, quantity, chain } });
      if (!res.ok) { toast.error(res.error); return; }
      setPayment({
        paymentId: res.paymentId,
        chain: res.chain,
        depositAddress: res.depositAddress,
        cryptoAmount: res.cryptoAmount,
        usdAmount: res.usdAmount,
        rate: res.rate,
        expiresAt: res.expiresAt,
        minConfirmations: res.minConfirmations,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start payment");
    } finally {
      setCreating(false);
    }
  };

  const handleVerify = async () => {
    if (!payment) return;
    const trimmed = txHash.trim();
    if (trimmed.length < 10) { toast.error("Enter a valid transaction hash (at least 10 characters)"); return; }
    setVerifying(true);
    setPendingMsg(null);
    try {
      const res = await verify({ data: { paymentId: payment.paymentId, txHash: txHash.trim() } });
      if (!res.ok) { toast.error(res.error); return; }
      if (res.status === "completed") {
        toast.success("Payment confirmed! Tickets issued.", {
          description: res.ticketCodes[0] ? `First code: ${res.ticketCodes[0]}` : undefined,
        });
        onClose();
        navigate({ to: "/my-tickets" });
        return;
      }
      setPendingMsg(`Transaction found. Waiting for confirmations: ${res.confirmations}/${res.needed}. Try verifying again in a minute.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const copy = async (value: string, key: "addr" | "amt") => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  if (!open) return null;

  const mm = Math.floor(remainingMs / 60000);
  const ss = Math.floor((remainingMs % 60000) / 1000);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-card p-6 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground text-sm">✕</button>

        {!payment ? (
          <>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Bitcoin className="h-5 w-5 text-primary" /> Pay with Crypto
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">Total: ${usdTotal.toLocaleString()} USD</p>

            <label className="mt-5 block text-sm font-medium text-foreground">Choose network</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(Object.keys(chainMeta) as Chain[]).map(c => {
                const m = chainMeta[c];
                const sel = chain === c;
                return (
                  <button
                    key={c}
                    onClick={() => setChain(c)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all ${
                      sel ? "border-primary bg-primary/5 shadow-glow-primary" : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <span className={`text-xs font-bold ${m.color}`}>{m.symbol}</span>
                    <span className="text-xs font-semibold text-foreground">{m.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleCreate}
              disabled={creating}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow-primary transition-all hover:opacity-90 disabled:opacity-60"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bitcoin className="h-4 w-4" />}
              {creating ? "Locking rate..." : `Continue with ${chainMeta[chain].label}`}
            </button>

            <p className="mt-3 text-[11px] text-muted-foreground text-center">
              Live rate via CoinGecko · Locked for 30 minutes
            </p>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Bitcoin className="h-5 w-5 text-primary" /> Send {chainMeta[payment.chain].symbol}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Expires in <span className="font-mono font-semibold text-foreground">{mm}:{ss.toString().padStart(2, "0")}</span>
            </p>

            <div className="mt-5 space-y-3">
              <div className="rounded-lg bg-secondary/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Amount to send</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-base font-bold text-foreground break-all">{payment.cryptoAmount} {chainMeta[payment.chain].symbol}</span>
                  <button onClick={() => copy(payment.cryptoAmount, "amt")} className="shrink-0 text-muted-foreground hover:text-foreground">
                    {copied === "amt" ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">≈ ${payment.usdAmount.toFixed(2)} @ ${payment.rate.toLocaleString()}/{chainMeta[payment.chain].symbol}</p>
              </div>

              <div className="rounded-lg bg-secondary/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">To address</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-foreground break-all">{payment.depositAddress}</span>
                  <button onClick={() => copy(payment.depositAddress, "addr")} className="shrink-0 text-muted-foreground hover:text-foreground">
                    {copied === "addr" ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-[11px] text-foreground">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Send the <strong>exact amount</strong> from a wallet you control. After sending, paste your transaction hash below to verify.</span>
              </div>
            </div>

            <label className="mt-5 block text-sm font-medium text-foreground">Transaction hash</label>
            <input
              type="text"
              value={txHash}
              onChange={e => setTxHash(e.target.value)}
              placeholder={payment.chain === "btc" ? "e.g. 4a5e1e..." : "e.g. 0xabc123..."}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />

            {pendingMsg && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-primary/10 border border-primary/30 p-3 text-xs text-foreground">
                <Loader2 className="h-4 w-4 text-primary shrink-0 mt-0.5 animate-spin" />
                <span>{pendingMsg}</span>
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={verifying || !txHash.trim()}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow-primary transition-all hover:opacity-90 disabled:opacity-60"
            >
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {verifying ? "Verifying on-chain..." : "Verify payment"}
            </button>

            <p className="mt-3 text-[11px] text-muted-foreground text-center">
              Requires {payment.minConfirmations} confirmation{payment.minConfirmations > 1 ? "s" : ""}.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
