-- ============================================================
--  SlabHub AZ — Supabase Database Schema
--  
--  How to run this:
--  1. Go to https://app.supabase.com → Your project
--  2. Click "SQL Editor" in the left sidebar
--  3. Paste this entire file and click "Run"
-- ============================================================


-- ── SLABS TABLE ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS slabs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  material_type TEXT,
  color         TEXT,
  thickness     TEXT,
  size          TEXT,
  finish        TEXT,
  description   TEXT,
  price         DECIMAL(10,2),
  show_price    BOOLEAN DEFAULT true,
  availability  TEXT DEFAULT 'In Stock',
  published     BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update the updated_at timestamp on edits
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER slabs_updated_at
  BEFORE UPDATE ON slabs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── SLAB IMAGES TABLE ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS slab_images (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slab_id     UUID REFERENCES slabs(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,
  is_primary  BOOLEAN DEFAULT false,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ── INQUIRIES TABLE ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inquiries (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slab_id        UUID REFERENCES slabs(id) ON DELETE SET NULL,
  slab_name      TEXT,
  customer_name  TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  message        TEXT,
  status         TEXT DEFAULT 'new',   -- new | contacted | closed
  created_at     TIMESTAMPTZ DEFAULT NOW()
);


-- ── ROW LEVEL SECURITY ───────────────────────────────────────
-- Public visitors: read published slabs only
-- Authenticated admin: full access to everything

ALTER TABLE slabs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE slab_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries   ENABLE ROW LEVEL SECURITY;

-- Slabs: public read (published only)
CREATE POLICY "Public can read published slabs"
  ON slabs FOR SELECT
  USING (published = true);

-- Slabs: admin full access
CREATE POLICY "Admin full access to slabs"
  ON slabs FOR ALL
  USING (auth.role() = 'authenticated');

-- Slab images: public read
CREATE POLICY "Public can read slab images"
  ON slab_images FOR SELECT
  USING (true);

-- Slab images: admin full access
CREATE POLICY "Admin full access to slab images"
  ON slab_images FOR ALL
  USING (auth.role() = 'authenticated');

-- Inquiries: public can insert (contact form submissions)
CREATE POLICY "Public can submit inquiries"
  ON inquiries FOR INSERT
  WITH CHECK (true);

-- Inquiries: admin can read, update, delete
CREATE POLICY "Admin full access to inquiries"
  ON inquiries FOR ALL
  USING (auth.role() = 'authenticated');


-- ── STORAGE BUCKET ───────────────────────────────────────────
-- Run this separately in the SQL editor after creating
-- the "slab-images" bucket in Storage settings.

-- Allow public to read images
INSERT INTO storage.buckets (id, name, public)
VALUES ('slab-images', 'slab-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view slab images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'slab-images');

CREATE POLICY "Admins can upload slab images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'slab-images' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can delete slab images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'slab-images' AND auth.role() = 'authenticated');
