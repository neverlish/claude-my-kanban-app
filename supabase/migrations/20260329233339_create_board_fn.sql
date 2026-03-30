CREATE OR REPLACE FUNCTION kanban.create_board(board_name text, owner_id uuid)
RETURNS kanban.boards
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = kanban
AS $$
DECLARE
  new_board kanban.boards;
BEGIN
  -- 보드 생성
  INSERT INTO kanban.boards (name)
  VALUES (board_name)
  RETURNING * INTO new_board;

  -- 기본 컬럼 3개 생성
  INSERT INTO kanban.columns (board_id, name, position) VALUES
    (new_board.id, '할 일',   0),
    (new_board.id, '진행 중', 1),
    (new_board.id, '완료',   2);

  -- 생성자를 owner로 등록
  INSERT INTO kanban.board_members (board_id, user_id, role)
  VALUES (new_board.id, owner_id, 'owner');

  RETURN new_board;
END;
$$;

GRANT EXECUTE ON FUNCTION kanban.create_board(text, uuid) TO anon;
