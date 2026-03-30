-- profiles 테이블
CREATE TABLE kanban.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE kanban.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON kanban.profiles FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON kanban.profiles TO anon;

-- board_members 테이블
CREATE TABLE kanban.board_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES kanban.boards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES kanban.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'member')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (board_id, user_id)
);

ALTER TABLE kanban.board_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON kanban.board_members FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON kanban.board_members TO anon;

-- auth.users 트리거: 회원가입 시 자동 프로필 생성
CREATE OR REPLACE FUNCTION kanban.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = kanban
AS $$
BEGIN
  INSERT INTO kanban.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION kanban.handle_new_user();
