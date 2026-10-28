-- Calculadora de Gastos del Hogar - PostgreSQL Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency VARCHAR(3) NOT NULL DEFAULT 'CLP',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS income_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expense_categories (
  id SERIAL PRIMARY KEY,
  key VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  emoji VARCHAR(10),
  color VARCHAR(20)
);

INSERT INTO expense_categories (key, label, emoji, color) VALUES
  ('housing',       'Vivienda',          '🏠', '#6366f1'),
  ('food',          'Alimentación',      '🛒', '#f59e0b'),
  ('transport',     'Transporte',        '🚗', '#10b981'),
  ('utilities',     'Servicios Básicos', '💡', '#3b82f6'),
  ('health',        'Salud',             '🏥', '#ef4444'),
  ('education',     'Educación',         '📚', '#8b5cf6'),
  ('entertainment', 'Entretenimiento',   '🎮', '#ec4899'),
  ('others',        'Otros',             '📦', '#6b7280')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS expense_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  category_key VARCHAR(50) NOT NULL REFERENCES expense_categories(key),
  name VARCHAR(255) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_income_sources_household ON income_sources(household_id);
CREATE INDEX IF NOT EXISTS idx_expense_items_household ON expense_items(household_id);
CREATE INDEX IF NOT EXISTS idx_expense_items_category ON expense_items(category_key);

-- View: financial summary per household
CREATE OR REPLACE VIEW household_summary AS
SELECT
  h.id AS household_id,
  h.currency,
  COALESCE(SUM(DISTINCT i.amount), 0) AS total_income,
  COALESCE(SUM(DISTINCT e.amount), 0) AS total_expenses,
  COALESCE(SUM(DISTINCT i.amount), 0) - COALESCE(SUM(DISTINCT e.amount), 0) AS balance,
  CASE
    WHEN COALESCE(SUM(DISTINCT i.amount), 0) = 0 THEN 0
    ELSE ROUND(
      (COALESCE(SUM(DISTINCT e.amount), 0) / COALESCE(SUM(DISTINCT i.amount), 0)) * 100, 2
    )
  END AS expense_ratio_pct
FROM households h
LEFT JOIN income_sources i ON i.household_id = h.id
LEFT JOIN expense_items e ON e.household_id = h.id
GROUP BY h.id, h.currency;

-- View: expenses grouped by category per household
CREATE OR REPLACE VIEW expenses_by_category AS
SELECT
  e.household_id,
  e.category_key,
  c.label AS category_label,
  c.emoji,
  c.color,
  SUM(e.amount) AS total_amount,
  COUNT(*) AS item_count
FROM expense_items e
JOIN expense_categories c ON c.key = e.category_key
GROUP BY e.household_id, e.category_key, c.label, c.emoji, c.color;
