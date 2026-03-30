-- 스키마 접근 권한
GRANT USAGE ON SCHEMA kanban TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA kanban TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA kanban TO authenticated;

-- RLS 정책 (authenticated 역할)
CREATE POLICY "allow all authenticated" ON kanban.boards FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow all authenticated" ON kanban.columns FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow all authenticated" ON kanban.cards FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow all authenticated" ON kanban.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow all authenticated" ON kanban.board_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 함수 실행 권한
GRANT EXECUTE ON FUNCTION kanban.create_board(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION kanban.invite_member(uuid, text) TO authenticated;
