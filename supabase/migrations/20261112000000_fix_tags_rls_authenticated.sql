-- Let signed-in staff manage tags.
--
-- The original policies only allowed writes from the account whose profile
-- email is 'admin@priyumbakes.com'. Any other staff account could read tags
-- but not save them: inserts failed with a row level security error, while
-- updates and deletes "succeeded" without changing anything.
--
-- This brings tags and product_tags in line with products, categories and
-- base_categories, which already allow any authenticated user to write.
-- Public read access is unchanged.

DROP POLICY IF EXISTS "Admin can manage tags" ON public.tags;
DROP POLICY IF EXISTS "Admin can manage product tags" ON public.product_tags;

DROP POLICY IF EXISTS "Authenticated users can insert tags" ON public.tags;
DROP POLICY IF EXISTS "Authenticated users can update tags" ON public.tags;
DROP POLICY IF EXISTS "Authenticated users can delete tags" ON public.tags;

CREATE POLICY "Authenticated users can insert tags"
ON public.tags
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update tags"
ON public.tags
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tags"
ON public.tags
FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert product tags" ON public.product_tags;
DROP POLICY IF EXISTS "Authenticated users can delete product tags" ON public.product_tags;

CREATE POLICY "Authenticated users can insert product tags"
ON public.product_tags
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete product tags"
ON public.product_tags
FOR DELETE
TO authenticated
USING (true);
