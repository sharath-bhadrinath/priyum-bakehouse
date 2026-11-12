-- Public order tracking.
--
-- Row level security on public.orders only lets the signed-in owner read an
-- order, so the "Track order" box on the storefront cannot find anything for a
-- visitor. This function exposes a minimal, read-only view of a single order
-- to anyone who knows its (unguessable) id, without opening up the table.

CREATE OR REPLACE FUNCTION public.track_order(p_order_id uuid)
RETURNS TABLE (
  id uuid,
  customer_name text,
  status text,
  shipment_number text,
  total numeric,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id,
         -- First name only: enough to reassure the customer, not their full name.
         split_part(o.customer_name, ' ', 1),
         o.status,
         o.shipment_number,
         o.total,
         o.created_at
  FROM public.orders o
  WHERE o.id = p_order_id;
$$;

REVOKE ALL ON FUNCTION public.track_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_order(uuid) TO anon, authenticated;
