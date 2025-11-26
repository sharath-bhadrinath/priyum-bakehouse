-- Combined Migration File
-- Generated: 2025-11-26T05:22:32.364Z
-- Total migrations: 18
-- 
-- Instructions:
-- 1. Copy this entire file
-- 2. Go to Supabase Dashboard > SQL Editor
-- 3. Paste and run
--

-- ============================================================================
-- Migration: 20250730023412_147d338f_3608_43be_b42b_dad7ec6fee46.sql
-- ============================================================================

-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  image TEXT,
  category TEXT,
  stock INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT,
  subtotal DECIMAL(10,2) NOT NULL,
  shipping_charges DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  order_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_items table for individual items in each order
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Products policies (public read, admin only write)
CREATE POLICY "Anyone can view products" 
ON public.products 
FOR SELECT 
USING (true);

-- Profiles policies
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Orders policies
CREATE POLICY "Users can view own orders" 
ON public.orders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders" 
ON public.orders 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Order items policies
CREATE POLICY "Users can view own order items" 
ON public.order_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create own order items" 
ON public.order_items 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- Migration: 20250730023436_d8f11072_f5be_4135_9d0e_2e3c0afe5062.sql
-- ============================================================================

-- Fix security warnings by setting search_path for functions

-- Update the timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Update the user profile creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- ============================================================================
-- Migration: 20250915000100_create_categories.sql
-- ============================================================================

-- Create categories table for dynamic category management

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_on_categories ON public.categories;
CREATE TRIGGER set_timestamp_on_categories
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE PROCEDURE public.set_timestamp();

-- Seed a few defaults if none exist
INSERT INTO public.categories (name, display_name)
SELECT v.name, v.display_name
FROM (
  VALUES ('cookies','Cookies'), ('brownies','Brownies'), ('eggless brownies','Eggless Brownies')
) AS v(name, display_name)
WHERE NOT EXISTS (SELECT 1 FROM public.categories);

-- Helpful index
CREATE INDEX IF NOT EXISTS categories_name_idx ON public.categories (name);




-- ============================================================================
-- Migration: 20250807025513_51dc5a95-f70f-4db0-b8a4-1cff240bdfac.sql
-- ============================================================================

-- Create invoice_settings table to persist settings
CREATE TABLE public.invoice_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_name TEXT NOT NULL DEFAULT '❤️ PRIYUM',
  business_subtitle TEXT NOT NULL DEFAULT 'Cakes & Bakes',
  phone TEXT NOT NULL DEFAULT '+91 98765 43210',
  email TEXT NOT NULL DEFAULT 'orders@priyumbakes.com',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own invoice settings" 
ON public.invoice_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own invoice settings" 
ON public.invoice_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoice settings" 
ON public.invoice_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add trigger for timestamps
CREATE TRIGGER update_invoice_settings_updated_at
BEFORE UPDATE ON public.invoice_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add order_date and invoice_date to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS custom_order_date DATE,
ADD COLUMN IF NOT EXISTS custom_invoice_date DATE;

-- ============================================================================
-- Migration: 20250829180000_add_tags_and_info_to_products.sql
-- ============================================================================

-- Create tags table
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product_tags junction table for many-to-many relationship
CREATE TABLE public.product_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, tag_id)
);

-- Add info column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS info TEXT;

-- Add comment to document the new column
COMMENT ON COLUMN public.products.info IS 'Additional information about the product';

-- Enable Row Level Security for new tables
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_tags ENABLE ROW LEVEL SECURITY;

-- Tags policies (public read, admin only write)
CREATE POLICY "Anyone can view tags" 
ON public.tags 
FOR SELECT 
USING (true);

CREATE POLICY "Admin can manage tags" 
ON public.tags 
FOR ALL 
USING (auth.uid() IN (
  SELECT user_id FROM public.profiles 
  WHERE email = 'admin@priyumbakes.com'
));

-- Product tags policies (public read, admin only write)
CREATE POLICY "Anyone can view product tags" 
ON public.product_tags 
FOR SELECT 
USING (true);

CREATE POLICY "Admin can manage product tags" 
ON public.product_tags 
FOR ALL 
USING (auth.uid() IN (
  SELECT user_id FROM public.profiles 
  WHERE email = 'admin@priyumbakes.com'
));

-- Create trigger for tags timestamp updates
CREATE TRIGGER update_tags_updated_at
  BEFORE UPDATE ON public.tags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default tags
INSERT INTO public.tags (name, color) VALUES
  ('Popular', '#EF4444'),
  ('New', '#10B981'),
  ('Seasonal', '#F59E0B'),
  ('Gluten-Free', '#8B5CF6'),
  ('Vegan', '#06B6D4'),
  ('Birthday', '#EC4899'),
  ('Wedding', '#F97316'),
  ('Custom', '#6B7280')
ON CONFLICT (name) DO NOTHING;


-- ============================================================================
-- Migration: 20251102000000_create_base_categories.sql
-- ============================================================================

-- Create base_categories table

CREATE TABLE IF NOT EXISTS public.base_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS set_timestamp_on_base_categories ON public.base_categories;
CREATE TRIGGER set_timestamp_on_base_categories
BEFORE UPDATE ON public.base_categories
FOR EACH ROW
EXECUTE PROCEDURE public.set_timestamp();

-- Helpful index
CREATE INDEX IF NOT EXISTS base_categories_name_idx ON public.base_categories (name);

-- Enable Row Level Security
ALTER TABLE public.base_categories ENABLE ROW LEVEL SECURITY;

-- Policies (public read, admin only write)
CREATE POLICY "Anyone can view base categories" 
ON public.base_categories 
FOR SELECT 
USING (true);

CREATE POLICY "Admin can manage base categories" 
ON public.base_categories 
FOR ALL 
USING (auth.uid() IN (
  SELECT user_id FROM public.profiles 
  WHERE email = 'admin@priyumbakes.com'
));



-- ============================================================================
-- Migration: 20250804072226_1eb2cb6d-587e-4149-9e41-cc3917319d32.sql
-- ============================================================================

-- Add RLS policies to allow authenticated users to manage products
CREATE POLICY "Authenticated users can insert products" 
ON public.products 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update products" 
ON public.products 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can delete products" 
ON public.products 
FOR DELETE 
TO authenticated 
USING (true);

-- ============================================================================
-- Migration: 20250808044325_96588e1e-e610-4083-a389-6e5716065f8e.sql
-- ============================================================================

-- Add DELETE policies for orders and order_items tables

-- Allow users to delete their own orders
CREATE POLICY "Users can delete own orders" 
ON public.orders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Allow users to delete order items that belong to their orders
CREATE POLICY "Users can delete own order items" 
ON public.order_items 
FOR DELETE 
USING (EXISTS ( 
  SELECT 1
  FROM orders
  WHERE ((orders.id = order_items.order_id) AND (orders.user_id = auth.uid()))
));

-- ============================================================================
-- Migration: 20251102000002_fix_base_categories_rls.sql
-- ============================================================================

-- Fix RLS policy for base_categories to properly handle INSERT operations
-- Drop the existing policy
DROP POLICY IF EXISTS "Admin can manage base categories" ON public.base_categories;

-- Create separate policies for better control
-- Policy for SELECT (already covered by "Anyone can view base categories")

-- Policy for INSERT
CREATE POLICY "Admin can insert base categories" 
ON public.base_categories 
FOR INSERT 
WITH CHECK (auth.uid() IN (
  SELECT user_id FROM public.profiles 
  WHERE email = 'admin@priyumbakes.com'
));

-- Policy for UPDATE
CREATE POLICY "Admin can update base categories" 
ON public.base_categories 
FOR UPDATE 
USING (auth.uid() IN (
  SELECT user_id FROM public.profiles 
  WHERE email = 'admin@priyumbakes.com'
))
WITH CHECK (auth.uid() IN (
  SELECT user_id FROM public.profiles 
  WHERE email = 'admin@priyumbakes.com'
));

-- Policy for DELETE
CREATE POLICY "Admin can delete base categories" 
ON public.base_categories 
FOR DELETE 
USING (auth.uid() IN (
  SELECT user_id FROM public.profiles 
  WHERE email = 'admin@priyumbakes.com'
));



-- ============================================================================
-- Migration: 20251102000003_fix_base_categories_rls_authenticated.sql
-- ============================================================================

-- Fix RLS policy to allow any authenticated user to manage base_categories
-- This is more permissive for admin operations
-- Drop existing policies
DROP POLICY IF EXISTS "Admin can insert base categories" ON public.base_categories;
DROP POLICY IF EXISTS "Admin can update base categories" ON public.base_categories;
DROP POLICY IF EXISTS "Admin can delete base categories" ON public.base_categories;

-- Create policies that allow any authenticated user (since Admin panel requires auth)
CREATE POLICY "Authenticated users can insert base categories" 
ON public.base_categories 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update base categories" 
ON public.base_categories 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete base categories" 
ON public.base_categories 
FOR DELETE 
TO authenticated
USING (true);



-- ============================================================================
-- Migration: 20250115000000_split_price_into_mrp_and_selling_price.sql
-- ============================================================================

-- Split price column into mrp and selling_price
-- This migration splits the existing price column into two separate columns:
-- - mrp: Maximum Retail Price (for display purposes, strikethrough in UI)
-- - selling_price: Actual selling price (used for calculations)

-- Add new columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS mrp DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10,2);

-- Migrate existing price data to both columns
-- For existing products, set both mrp and selling_price to the current price
-- This ensures no data loss and maintains current functionality
UPDATE public.products 
SET 
  mrp = price,
  selling_price = price
WHERE mrp IS NULL OR selling_price IS NULL;

-- Make selling_price NOT NULL since it's used for calculations
ALTER TABLE public.products 
ALTER COLUMN selling_price SET NOT NULL;

-- Add comment to document the new columns
COMMENT ON COLUMN public.products.mrp IS 'Maximum Retail Price - displayed as strikethrough in UI for marketing purposes';
COMMENT ON COLUMN public.products.selling_price IS 'Actual selling price - used for all calculations and cart logic';

-- Update weight_options JSON structure
-- This will be handled in the application code
-- Note: weight_options column will be added in a later migration (20250731062042)
-- The comment will be added after the column is created

-- Create index on selling_price for better query performance
CREATE INDEX IF NOT EXISTS products_selling_price_idx ON public.products(selling_price);

-- Note: The weight_options JSON structure will be updated by the application
-- to change from {weight, price, unit} to {weight, mrp, selling_price, unit}


-- ============================================================================
-- Migration: 20250731062042_3d72ea19-5e7c-4d0b-b723-05525781a967.sql
-- ============================================================================

-- Add weight-based pricing structure to products
ALTER TABLE public.products 
ADD COLUMN weight_options JSONB DEFAULT '[]'::jsonb,
ADD COLUMN base_weight NUMERIC DEFAULT 500,
ADD COLUMN weight_unit TEXT DEFAULT 'grams';

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

-- Create storage policies for product images
CREATE POLICY "Product images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update product images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete product images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- ============================================================================
-- Migration: 20250806061837_ef854c19-8d20-477b-9a4c-4225dc21ed77.sql
-- ============================================================================

-- Add weight and unit columns to order_items table
ALTER TABLE public.order_items 
ADD COLUMN weight NUMERIC,
ADD COLUMN weight_unit TEXT;

-- ============================================================================
-- Migration: 20250810063011_add_delivery_date_to_orders.sql
-- ============================================================================

-- Add delivery_date column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS delivery_date DATE;


-- ============================================================================
-- Migration: 20250811193000_add_shipment_number_to_orders.sql
-- ============================================================================

-- Add shipment_number column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS shipment_number TEXT;

-- Add comment to document the column
COMMENT ON COLUMN public.orders.shipment_number IS 'Tracking number or shipment ID for order delivery'; 

-- ============================================================================
-- Migration: 20250915000000_add_site_display_to_products.sql
-- ============================================================================

-- Add a boolean column to control whether a product is shown on the site
-- Safe to run multiple times: check existence before adding

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'site_display'
  ) THEN
    ALTER TABLE public.products
      ADD COLUMN site_display boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Optional: ensure all existing rows default to visible
UPDATE public.products SET site_display = COALESCE(site_display, true);

-- Optional: create an index to speed up filtered fetches
CREATE INDEX IF NOT EXISTS products_site_display_idx
  ON public.products (site_display);




-- ============================================================================
-- Migration: 20250915000200_products_category_fk.sql
-- ============================================================================

-- Add category_id foreign key to products and migrate data from text category

DO $$
BEGIN
  -- Add column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='products' AND column_name='category_id'
  ) THEN
    ALTER TABLE public.products ADD COLUMN category_id uuid;
  END IF;
END $$;

-- Try to map existing products.category (text) to categories.name
UPDATE public.products p
SET category_id = c.id
FROM public.categories c
WHERE p.category_id IS NULL
  AND p.category IS NOT NULL
  AND lower(p.category) = lower(c.name);

-- Create FK and index
ALTER TABLE public.products
  ADD CONSTRAINT products_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.categories(id)
  ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS products_category_id_idx ON public.products(category_id);




-- ============================================================================
-- Migration: 20251102000001_add_base_category_id_to_categories.sql
-- ============================================================================

-- Add base_category_id foreign key to categories table

-- Add column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='categories' AND column_name='base_category_id'
  ) THEN
    ALTER TABLE public.categories ADD COLUMN base_category_id uuid;
  END IF;
END $$;

-- Create FK and index (only if constraint doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'categories_base_category_id_fkey'
  ) THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_base_category_id_fkey
      FOREIGN KEY (base_category_id) REFERENCES public.base_categories(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS categories_base_category_id_idx ON public.categories(base_category_id);



