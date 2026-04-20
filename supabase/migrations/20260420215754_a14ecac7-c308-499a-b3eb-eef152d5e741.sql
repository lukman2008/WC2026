-- Function to fetch recent ticket purchases (anonymized) for public ticker display
CREATE OR REPLACE FUNCTION public.get_recent_purchases(_limit integer DEFAULT 20)
RETURNS TABLE(
  ticket_id uuid,
  created_at timestamptz,
  category ticket_category,
  display_name text,
  country text,
  home_team text,
  away_team text,
  home_flag text,
  away_flag text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id AS ticket_id,
    t.created_at,
    t.category,
    -- Anonymize display name: first name + last initial
    COALESCE(
      split_part(p.display_name, ' ', 1) ||
        CASE
          WHEN position(' ' in p.display_name) > 0
          THEN ' ' || left(split_part(p.display_name, ' ', 2), 1) || '.'
          ELSE ''
        END,
      'A fan'
    ) AS display_name,
    p.country,
    m.home_team,
    m.away_team,
    m.home_flag,
    m.away_flag
  FROM public.tickets t
  JOIN public.matches m ON m.id = t.match_id
  LEFT JOIN public.profiles p ON p.user_id = t.user_id
  ORDER BY t.created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 50));
$$;

GRANT EXECUTE ON FUNCTION public.get_recent_purchases(integer) TO anon, authenticated;

-- Enable realtime on tickets so new purchases broadcast
ALTER TABLE public.tickets REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;