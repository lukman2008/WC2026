-- Create payments table for crypto transactions
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('vip', 'regular', 'economy')),
  quantity INTEGER NOT NULL CHECK (quantity >= 1 AND quantity <= 10),
  chain TEXT NOT NULL CHECK (chain IN ('btc', 'eth')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirming', 'completed', 'failed')),
  crypto_amount TEXT NOT NULL,
  usd_amount NUMERIC(10, 2) NOT NULL,
  rate NUMERIC(20, 2) NOT NULL,
  tx_hash TEXT,
  deposit_address TEXT NOT NULL,
  payment_id TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own payments
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own payments
CREATE POLICY "Users can create payments" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own payments
CREATE POLICY "Users can update own payments" ON public.payments
  FOR UPDATE USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_match_id ON public.payments(match_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);