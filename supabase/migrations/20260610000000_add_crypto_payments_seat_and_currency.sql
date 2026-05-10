ALTER TABLE public.crypto_payments
ADD COLUMN IF NOT EXISTS seat_section text,
ADD COLUMN IF NOT EXISTS seat_multiplier numeric(10,4),
ADD COLUMN IF NOT EXISTS display_currency text,
ADD COLUMN IF NOT EXISTS display_total numeric(10,2);
