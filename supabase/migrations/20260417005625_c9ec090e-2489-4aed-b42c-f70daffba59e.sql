-- =========================================
-- ENUMS
-- =========================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.ticket_category AS ENUM ('vip', 'regular', 'economy');
CREATE TYPE public.ticket_status AS ENUM ('active', 'used', 'cancelled');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded');
CREATE TYPE public.match_stage AS ENUM ('Group Stage', 'Round of 16', 'Quarter-Final', 'Semi-Final', 'Third Place', 'Final');

-- =========================================
-- TIMESTAMP TRIGGER FUNCTION
-- =========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =========================================
-- PROFILES
-- =========================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  country TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- USER ROLES (separate table for security)
-- =========================================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- MATCHES
-- =========================================
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_flag TEXT NOT NULL DEFAULT '🏆',
  away_flag TEXT NOT NULL DEFAULT '🏆',
  stadium TEXT NOT NULL,
  city TEXT NOT NULL,
  match_date TIMESTAMPTZ NOT NULL,
  stage public.match_stage NOT NULL DEFAULT 'Group Stage',
  group_name TEXT,
  price_vip NUMERIC(10,2) NOT NULL CHECK (price_vip >= 0),
  price_regular NUMERIC(10,2) NOT NULL CHECK (price_regular >= 0),
  price_economy NUMERIC(10,2) NOT NULL CHECK (price_economy >= 0),
  available_vip INTEGER NOT NULL DEFAULT 0 CHECK (available_vip >= 0),
  available_regular INTEGER NOT NULL DEFAULT 0 CHECK (available_regular >= 0),
  available_economy INTEGER NOT NULL DEFAULT 0 CHECK (available_economy >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view matches"
  ON public.matches FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert matches"
  ON public.matches FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update matches"
  ON public.matches FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete matches"
  ON public.matches FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_matches_date ON public.matches(match_date);
CREATE INDEX idx_matches_stage ON public.matches(stage);

-- =========================================
-- TRANSACTIONS
-- =========================================
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status public.transaction_status NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL DEFAULT 'mock',
  payment_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_transactions_user ON public.transactions(user_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);

-- =========================================
-- TICKETS
-- =========================================
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_code TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE RESTRICT,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE RESTRICT,
  category public.ticket_category NOT NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  status public.ticket_status NOT NULL DEFAULT 'active',
  qr_data TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tickets"
  ON public.tickets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets"
  ON public.tickets FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_tickets_user ON public.tickets(user_id);
CREATE INDEX idx_tickets_match ON public.tickets(match_id);
CREATE INDEX idx_tickets_transaction ON public.tickets(transaction_id);

-- =========================================
-- ATOMIC PURCHASE FUNCTION (prevents overbooking)
-- =========================================
CREATE OR REPLACE FUNCTION public.purchase_tickets(
  _user_id UUID,
  _match_id UUID,
  _category public.ticket_category,
  _quantity INTEGER
)
RETURNS TABLE (transaction_id UUID, ticket_codes TEXT[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _match RECORD;
  _price NUMERIC(10,2);
  _available INTEGER;
  _total NUMERIC(10,2);
  _txn_id UUID;
  _codes TEXT[] := ARRAY[]::TEXT[];
  _code TEXT;
  _i INTEGER;
BEGIN
  IF _quantity < 1 OR _quantity > 10 THEN
    RAISE EXCEPTION 'Quantity must be between 1 and 10';
  END IF;

  -- Lock the match row to prevent race conditions
  SELECT * INTO _match FROM public.matches WHERE id = _match_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  -- Check inventory + price for category
  IF _category = 'vip' THEN
    _price := _match.price_vip;
    _available := _match.available_vip;
  ELSIF _category = 'regular' THEN
    _price := _match.price_regular;
    _available := _match.available_regular;
  ELSE
    _price := _match.price_economy;
    _available := _match.available_economy;
  END IF;

  IF _available < _quantity THEN
    RAISE EXCEPTION 'Not enough tickets available. Only % left.', _available;
  END IF;

  _total := _price * _quantity;

  -- Decrement inventory
  IF _category = 'vip' THEN
    UPDATE public.matches SET available_vip = available_vip - _quantity WHERE id = _match_id;
  ELSIF _category = 'regular' THEN
    UPDATE public.matches SET available_regular = available_regular - _quantity WHERE id = _match_id;
  ELSE
    UPDATE public.matches SET available_economy = available_economy - _quantity WHERE id = _match_id;
  END IF;

  -- Create transaction (mock succeeded)
  INSERT INTO public.transactions (user_id, total_amount, currency, status, payment_method, payment_reference)
  VALUES (_user_id, _total, 'USD', 'succeeded', 'mock', 'MOCK-' || substr(md5(random()::text), 1, 12))
  RETURNING id INTO _txn_id;

  -- Create individual tickets
  FOR _i IN 1.._quantity LOOP
    _code := 'WC2026-' || upper(substr(md5(random()::text || _i::text || clock_timestamp()::text), 1, 10));
    INSERT INTO public.tickets (ticket_code, user_id, match_id, transaction_id, category, price, status, qr_data)
    VALUES (_code, _user_id, _match_id, _txn_id, _category, _price, 'active', _code);
    _codes := array_append(_codes, _code);
  END LOOP;

  RETURN QUERY SELECT _txn_id, _codes;
END;
$$;

-- =========================================
-- SEED MATCHES
-- =========================================
INSERT INTO public.matches (home_team, away_team, home_flag, away_flag, stadium, city, match_date, stage, group_name, price_vip, price_regular, price_economy, available_vip, available_regular, available_economy) VALUES
('USA', 'England', '🇺🇸', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'MetLife Stadium', 'New York', '2026-06-11 18:00:00+00', 'Group Stage', 'Group A', 750, 350, 125, 120, 800, 2000),
('Brazil', 'Germany', '🇧🇷', '🇩🇪', 'SoFi Stadium', 'Los Angeles', '2026-06-12 20:00:00+00', 'Group Stage', 'Group B', 850, 400, 150, 85, 600, 1800),
('France', 'Argentina', '🇫🇷', '🇦🇷', 'AT&T Stadium', 'Dallas', '2026-06-13 19:00:00+00', 'Group Stage', 'Group C', 900, 420, 160, 95, 700, 2200),
('Spain', 'Netherlands', '🇪🇸', '🇳🇱', 'Hard Rock Stadium', 'Miami', '2026-06-14 17:00:00+00', 'Group Stage', 'Group D', 700, 320, 120, 110, 750, 1900),
('Portugal', 'Italy', '🇵🇹', '🇮🇹', 'Lumen Field', 'Seattle', '2026-06-15 21:00:00+00', 'Group Stage', 'Group E', 800, 380, 140, 70, 500, 1600),
('Mexico', 'Japan', '🇲🇽', '🇯🇵', 'Estadio Azteca', 'Mexico City', '2026-06-16 16:00:00+00', 'Group Stage', 'Group F', 650, 300, 100, 130, 900, 2500),
('Belgium', 'Croatia', '🇧🇪', '🇭🇷', 'BMO Field', 'Toronto', '2026-06-17 18:00:00+00', 'Group Stage', 'Group G', 680, 310, 115, 100, 650, 1700),
('Morocco', 'Colombia', '🇲🇦', '🇨🇴', 'Lincoln Financial Field', 'Philadelphia', '2026-06-18 19:00:00+00', 'Group Stage', 'Group H', 620, 280, 105, 90, 550, 1500),
('Canada', 'Senegal', '🇨🇦', '🇸🇳', 'BC Place', 'Vancouver', '2026-06-19 20:00:00+00', 'Group Stage', 'Group A', 580, 260, 95, 140, 850, 2100),
('Argentina', 'Brazil', '🇦🇷', '🇧🇷', 'MetLife Stadium', 'New York', '2026-07-15 20:00:00+00', 'Semi-Final', NULL, 1500, 750, 350, 50, 300, 1000),
('France', 'Spain', '🇫🇷', '🇪🇸', 'AT&T Stadium', 'Dallas', '2026-07-16 20:00:00+00', 'Semi-Final', NULL, 1600, 800, 380, 45, 280, 900),
('TBD', 'TBD', '🏆', '🏆', 'MetLife Stadium', 'New York', '2026-07-19 18:00:00+00', 'Final', NULL, 2500, 1200, 500, 30, 200, 800);