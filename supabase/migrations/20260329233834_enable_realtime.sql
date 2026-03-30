ALTER TABLE kanban.cards REPLICA IDENTITY FULL;
ALTER TABLE kanban.columns REPLICA IDENTITY FULL;
ALTER TABLE kanban.boards REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE kanban.cards;
ALTER PUBLICATION supabase_realtime ADD TABLE kanban.columns;
ALTER PUBLICATION supabase_realtime ADD TABLE kanban.boards;
