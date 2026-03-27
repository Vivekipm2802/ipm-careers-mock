-- ============================================
-- user_roles table — database-driven admin check
-- ============================================
-- Run this in the Supabase SQL Editor if the
-- /api/setup-roles endpoint can't create it automatically.
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_roles (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email, role)
);

-- Enable RLS (service-role key bypasses it; good practice for future policies)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Index for fast lookups by email + role
CREATE INDEX IF NOT EXISTS idx_user_roles_email_role
  ON public.user_roles (email, role);

-- Grant select to anon/authenticated so RLS policies can be added later
GRANT SELECT ON public.user_roles TO anon, authenticated;

-- ============================================
-- Seed current admin emails
-- ============================================
INSERT INTO public.user_roles (email, role) VALUES
  ('rishabhsingh0363@gmail.com', 'admin'),
  ('ipmcareeronline@gmail.com', 'admin')
ON CONFLICT (email, role) DO NOTHING;
