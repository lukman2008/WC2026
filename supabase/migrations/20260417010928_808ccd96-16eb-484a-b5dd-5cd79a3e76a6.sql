
CREATE TYPE public.pending_purchase_status AS ENUM ('pending', 'completed', 'expired', 'failed');

CREATE TABLE public.pending_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  category public.ticket_category NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity >= 1 AND quantity <= 10),
  total_amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  coinbase_charge_id TEXT NOT NULL UNIQUE,
  coinbase_charge_code TEXT NOT NULL,
  hosted_url TEXT NOT NULL,
  status public.pending_purchase_status NOT NULL DEFAULT 'pending',
  transaction_id UUID REFERENCES public.transactions(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_pending_purchases_user ON public.pending_purchases(user_id);
CREATE INDEX idx_pending_purchases_charge ON public.pending_purchases(coinbase_charge_id);

ALTER TABLE public.pending_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pending purchases"
ON public.pending_purchases
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all pending purchases"
ON public.pending_purchases
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_pending_purchases_updated_at
BEFORE UPDATE ON public.pending_purchases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
