-- profiles에 email 컬럼 추가
ALTER TABLE kanban.profiles ADD COLUMN IF NOT EXISTS email text;

-- 트리거 함수 업데이트: email도 저장
CREATE OR REPLACE FUNCTION kanban.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = kanban
AS $$
BEGIN
  INSERT INTO kanban.profiles (id, display_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name', NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = NEW.email;
  RETURN NEW;
END;
$$;

-- 이메일로 멤버 초대하는 RPC
CREATE OR REPLACE FUNCTION kanban.invite_member(target_board_id uuid, invitee_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = kanban
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  SELECT id INTO target_user_id
  FROM kanban.profiles
  WHERE email = invitee_email
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: %', invitee_email;
  END IF;

  INSERT INTO kanban.board_members (board_id, user_id, role)
  VALUES (target_board_id, target_user_id, 'member');
END;
$$;

GRANT EXECUTE ON FUNCTION kanban.invite_member(uuid, text) TO anon;
