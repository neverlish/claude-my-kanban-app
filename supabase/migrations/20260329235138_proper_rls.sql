-- =============================================
-- 기존 "allow all" 정책 제거
-- =============================================
DROP POLICY IF EXISTS "allow all" ON kanban.boards;
DROP POLICY IF EXISTS "allow all" ON kanban.columns;
DROP POLICY IF EXISTS "allow all" ON kanban.cards;
DROP POLICY IF EXISTS "allow all" ON kanban.profiles;
DROP POLICY IF EXISTS "allow all" ON kanban.board_members;
DROP POLICY IF EXISTS "allow all authenticated" ON kanban.boards;
DROP POLICY IF EXISTS "allow all authenticated" ON kanban.columns;
DROP POLICY IF EXISTS "allow all authenticated" ON kanban.cards;
DROP POLICY IF EXISTS "allow all authenticated" ON kanban.profiles;
DROP POLICY IF EXISTS "allow all authenticated" ON kanban.board_members;

-- =============================================
-- boards: 멤버만 조회, 오너만 삭제/수정
-- (생성은 create_board SECURITY DEFINER 처리)
-- =============================================
CREATE POLICY "members can view boards" ON kanban.boards
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kanban.board_members
      WHERE board_id = kanban.boards.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "owners can update boards" ON kanban.boards
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kanban.board_members
      WHERE board_id = kanban.boards.id AND user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "owners can delete boards" ON kanban.boards
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kanban.board_members
      WHERE board_id = kanban.boards.id AND user_id = auth.uid() AND role = 'owner'
    )
  );

-- =============================================
-- columns: 보드 멤버만 조회/관리
-- =============================================
CREATE POLICY "members can view columns" ON kanban.columns
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kanban.board_members
      WHERE board_id = kanban.columns.board_id AND user_id = auth.uid()
    )
  );

-- =============================================
-- cards: 보드 멤버만 조회/추가/수정/삭제
-- =============================================
CREATE POLICY "members can manage cards" ON kanban.cards
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kanban.board_members bm
      JOIN kanban.columns c ON bm.board_id = c.board_id
      WHERE c.id = kanban.cards.column_id AND bm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kanban.board_members bm
      JOIN kanban.columns c ON bm.board_id = c.board_id
      WHERE c.id = kanban.cards.column_id AND bm.user_id = auth.uid()
    )
  );

-- =============================================
-- board_members: 멤버 조회, 오너만 수정/삭제
-- (초대는 invite_member SECURITY DEFINER 처리)
-- =============================================
CREATE POLICY "members can view board_members" ON kanban.board_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kanban.board_members bm2
      WHERE bm2.board_id = kanban.board_members.board_id AND bm2.user_id = auth.uid()
    )
  );

CREATE POLICY "owners can update roles" ON kanban.board_members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kanban.board_members bm2
      WHERE bm2.board_id = kanban.board_members.board_id
        AND bm2.user_id = auth.uid()
        AND bm2.role = 'owner'
    )
  );

CREATE POLICY "owners can remove members" ON kanban.board_members
  FOR DELETE TO authenticated
  USING (
    kanban.board_members.user_id != auth.uid()
    AND EXISTS (
      SELECT 1 FROM kanban.board_members bm2
      WHERE bm2.board_id = kanban.board_members.board_id
        AND bm2.user_id = auth.uid()
        AND bm2.role = 'owner'
    )
  );

-- =============================================
-- profiles: 인증된 사용자 조회, 본인만 수정
-- =============================================
CREATE POLICY "authenticated can view profiles" ON kanban.profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "users can update own profile" ON kanban.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
