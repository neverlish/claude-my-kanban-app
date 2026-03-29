CREATE SCHEMA IF NOT EXISTS kanban;

CREATE TABLE IF NOT EXISTS kanban.boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kanban.columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES kanban.boards(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kanban.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id uuid NOT NULL REFERENCES kanban.columns(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE kanban.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban.columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban.cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow all" ON kanban.boards FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON kanban.columns FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON kanban.cards FOR ALL TO anon USING (true) WITH CHECK (true);
