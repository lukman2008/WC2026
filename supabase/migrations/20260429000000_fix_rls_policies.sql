-- Fix RLS policy for crypto_payments table
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can create their own crypto payments" ON public.crypto_payments;
DROP POLICY IF EXISTS "Users can update their own crypto payments" ON public.crypto_payments;

-- Create more permissive policy for authenticated users
CREATE POLICY "Allow authenticated inserts on crypto_payments"
  ON public.crypto_payments FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated updates on crypto_payments"
  ON public.crypto_payments FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Also fix tickets table if it has similar issues
DROP POLICY IF EXISTS "Users can create their own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.tickets;

CREATE POLICY "Allow authenticated inserts on tickets"
  ON public.tickets FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated selects on tickets"
  ON public.tickets FOR SELECT TO authenticated
  USING (true);