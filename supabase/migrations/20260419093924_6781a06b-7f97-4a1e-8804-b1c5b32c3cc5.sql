-- Allow users to create and update their own crypto payment intents.
CREATE POLICY "Users can create their own crypto payments"
ON public.crypto_payments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own crypto payments"
ON public.crypto_payments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
