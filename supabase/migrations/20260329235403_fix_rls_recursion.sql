-- board_members 자기참조 재귀 방지용 SECURITY DEFINER 헬퍼 함수
CREATE OR REPLACE FUNCTION kanban.is_board_member(check_board_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = kanban
AS $$
  SELECT EXISTS (
    SELECT 1 FROM kanban.board_members
    WHERE board_id = check_board_id AND user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION kanban.is_board_member(uuid) TO authenticated;

-- 기존 재귀 정책 제거
DROP POLICY IF EXISTS "members can view board_members" ON kanban.board_members;
DROP POLICY IF EXISTS "members can view boards" ON kanban.boards;
DROP POLICY IF EXISTS "owners can update boards" ON kanban.boards;
DROP POLICY IF EXISTS "owners can delete boards" ON kanban.boards;
DROP POLICY IF EXISTS "members can view columns" ON kanban.columns;
DROP POLICY IF EXISTS "members can manage cards" ON kanban.cards;
DROP POLICY IF EXISTS "owners can update roles" ON kanban.board_members;
DROP POLICY IF EXISTS "owners can remove members" ON kanban.board_members;

-- board_members: 헬퍼 함수로 재귀 없이 체크
CREATE POLICY "members can view board_members" ON kanban.board_members
  FOR SELECT TO authenticated
  USING (kanban.is_board_member(board_id));

CREATE POLICY "owners can update roles" ON kanban.board_members
  FOR UPDATE TO authenticated
  USING (
    kanban.is_board_member(board_id) AND
    EXISTS (
      SELECT 1 FROM kanban.board_members
      WHERE board_id = kanban.board_members.board_id
        AND user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "owners can remove members" ON kanban.board_members
  FOR DELETE TO authenticated
  USING (
    user_id != auth.uid() AND
    kanban.is_board_member(board_id) AND
    EXISTS (
      SELECT 1 FROM kanban.board_members
      WHERE board_id = kanban.board_members.board_id
        AND user_id = auth.uid() AND role = 'owner'
    )
  );

-- boards: 헬퍼 함수 사용
CREATE POLICY "members can view boards" ON kanban.boards
  FOR SELECT TO authenticated
  USING (kanban.is_board_member(id));

CREATE POLICY "owners can update boards" ON kanban.boards
  FOR UPDATE TO authenticated
  USING (
    kanban.is_board_member(id) AND
    EXISTS (
      SELECT 1 FROM kanban.board_members
      WHERE board_id = id AND user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "owners can delete boards" ON kanban.boards
  FOR DELETE TO authenticated
  USING (
    kanban.is_board_member(id) AND
    EXISTS (
      SELECT 1 FROM kanban.board_members
      WHERE board_id = id AND user_id = auth.uid() AND role = 'owner'
    )
  );

-- columns: 헬퍼 함수 사용
CREATE POLICY "members can view columns" ON kanban.columns
  FOR SELECT TO authenticated
  USING (kanban.is_board_member(board_id));

-- cards: 헬퍼 함수 사용
CREATE POLICY "members can manage cards" ON kanban.cards
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kanban.columns c
      WHERE c.id = kanban.cards.column_id AND kanban.is_board_member(c.board_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kanban.columns c
      WHERE c.id = kanban.cards.column_id AND kanban.is_board_member(c.board_id)
    )
  );
