-- Migration: Sync subscription plans to match official Australian pricing tiers
-- 1. Archive legacy generic SaaS tiers
UPDATE public.subscription_plans
SET status = 'archived'
WHERE slug IN ('free', 'pro', 'business');

-- 2. Update Landlord Starter tier
UPDATE public.subscription_plans
SET name = 'Landlord Starter',
    description = 'For private investors & self-managed landlords',
    display_order = 1,
    price_cents = 2900,
    status = 'active'
WHERE slug = 'landlord';

-- 3. Update Portfolio Pro tier
UPDATE public.subscription_plans
SET name = 'Portfolio Pro',
    description = 'For growing portfolios & active property managers',
    display_order = 2,
    price_cents = 7900,
    status = 'active'
WHERE slug = 'manager';

-- 4. Upsert Agency & Enterprise tier
INSERT INTO public.subscription_plans ("id", "name", "slug", "description", "status", "display_order", "price_cents", "billing_interval")
VALUES (
  '00000000-0000-0000-0000-000000000006',
  'Agency & Enterprise',
  'agency',
  'For real-estate agencies & institutional portfolios',
  'active',
  3,
  0,
  'monthly'
)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    display_order = EXCLUDED.display_order,
    price_cents = EXCLUDED.price_cents;
