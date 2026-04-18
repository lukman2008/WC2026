
-- Enums
CREATE TYPE public.crypto_chain AS ENUM ('btc', 'eth');
CREATE TYPE public.crypto_payment_status AS ENUM ('awaiting_payment', 'submitted', 'confirming', 'completed', 'failed', 'expired');

-- Table
CREATE TABLE public.crypto_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  match_id uuid NOT NULL REFERENCES public.matches(id),
  category public.ticket_category NOT NULL,
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 10),
  chain public.crypto_chain NOT NULL,
  deposit_address text NOT NULL,
  usd_amount numeric(10,2) NOT NULL,
  crypto_amount numeric(30,12) NOT NULL,
  rate_usd_per_unit numeric(30,12) NOT NULL,
  tx_hash text,
  confirmations integer NOT NULL DEFAULT 0,
  status public.crypto_payment_status NOT NULL DEFAULT 'awaiting_payment',
  error_message text,
  transaction_id uuid REFERENCES public.transactions(id),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX crypto_payments_chain_txhash_unique
  ON public.crypto_payments(chain, tx_hash) WHERE tx_hash IS NOT NULL;
CREATE INDEX crypto_payments_user_idx ON public.crypto_payments(user_id);
CREATE INDEX crypto_payments_status_idx ON public.crypto_payments(status);

ALTER TABLE public.crypto_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own crypto payments"
  ON public.crypto_payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all crypto payments"
  ON public.crypto_payments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_crypto_payments_updated
  BEFORE UPDATE ON public.crypto_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC: completes a verified crypto payment by issuing tickets atomically.
-- Caller (server, service role) is responsible for verifying the on-chain tx
-- before calling this. Uses the existing purchase_tickets logic.
CREATE OR REPLACE FUNCTION public.complete_crypto_payment(_payment_id uuid)
RETURNS TABLE(transaction_id uuid, ticket_codes text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _p RECORD;
  _result RECORD;
BEGIN
  SELECT * INTO _p FROM public.crypto_payments WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Crypto payment not found';
  END IF;

  IF _p.status = 'completed' AND _p.transaction_id IS NOT NULL THEN
    -- Idempotent: return existing tickets
    RETURN QUERY
      SELECT _p.transaction_id,
             ARRAY(SELECT ticket_code FROM public.tickets WHERE tickets.transaction_id = _p.transaction_id);
    RETURN;
  END IF;

  IF _p.status NOT IN ('confirming','submitted','awaiting_payment') THEN
    RAISE EXCEPTION 'Crypto payment in non-completable state: %', _p.status;
  END IF;

  -- Issue tickets via existing flow
  SELECT pt.transaction_id, pt.ticket_codes INTO _result
  FROM public.purchase_tickets(_p.user_id, _p.match_id, _p.category, _p.quantity) pt;

  -- Mark transaction with crypto reference
  UPDATE public.transactions
    SET payment_method = 'crypto_' || _p.chain::text,
        payment_reference = _p.tx_hash
    WHERE id = _result.transaction_id;

  UPDATE public.crypto_payments
    SET status = 'completed',
        transaction_id = _result.transaction_id
    WHERE id = _payment_id;

  RETURN QUERY SELECT _result.transaction_id, _result.ticket_codes;
END;
$$;
