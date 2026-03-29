"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Card = {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  position: number;
};

type Column = {
  id: string;
  name: string;
  position: number;
  cards: Card[];
};

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingColumnId, setAddingColumnId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");

  useEffect(() => {
    loadColumns();
  }, []);

  async function loadColumns() {
    const { data } = await supabase
      .from("columns")
      .select("*, cards(*)")
      .eq("board_id", id)
      .order("position");

    if (data) {
      const sorted = data.map((col) => ({
        ...col,
        cards: (col.cards as Card[]).sort((a, b) => a.position - b.position),
      }));
      setColumns(sorted);
    }
    setLoading(false);
  }

  async function handleAddCard(columnId: string) {
    const title = newCardTitle.trim();
    if (!title) return;

    const col = columns.find((c) => c.id === columnId);
    const position = col ? col.cards.length : 0;

    const { data: card } = await supabase
      .from("cards")
      .insert({ column_id: columnId, title, position })
      .select()
      .single();

    if (!card) return;

    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId
          ? { ...col, cards: [...col.cards, card as Card] }
          : col
      )
    );
    setNewCardTitle("");
    setAddingColumnId(null);
  }

  async function handleDeleteCard(columnId: string, cardId: string) {
    await supabase.from("cards").delete().eq("id", cardId);
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId
          ? { ...col, cards: col.cards.filter((c) => c.id !== cardId) }
          : col
      )
    );
  }

  async function handleMoveCard(
    columnId: string,
    cardId: string,
    direction: -1 | 1
  ) {
    const colIndex = columns.findIndex((col) => col.id === columnId);
    const targetIndex = colIndex + direction;
    if (targetIndex < 0 || targetIndex >= columns.length) return;

    const targetColumnId = columns[targetIndex].id;
    const card = columns[colIndex].cards.find((c) => c.id === cardId);
    if (!card) return;

    await supabase
      .from("cards")
      .update({ column_id: targetColumnId })
      .eq("id", cardId);

    setColumns((prev) => {
      const next = prev.map((col) => ({ ...col, cards: [...col.cards] }));
      next[colIndex].cards = next[colIndex].cards.filter((c) => c.id !== cardId);
      next[targetIndex].cards = [...next[targetIndex].cards, { ...card, column_id: targetColumnId }];
      return next;
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center text-gray-400">
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← 홈으로
        </Link>
        <h1 className="text-xl font-bold text-gray-900">보드</h1>
      </header>

      <div className="flex gap-4 p-6 overflow-x-auto">
        {columns.map((col, colIndex) => (
          <div
            key={col.id}
            className="flex-shrink-0 w-72 bg-gray-200 rounded-xl p-3 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between px-1 mb-1">
              <h2 className="font-semibold text-gray-700 text-sm">{col.name}</h2>
              <span className="text-xs text-gray-400 bg-gray-300 rounded-full px-2 py-0.5">
                {col.cards.length}
              </span>
            </div>

            {col.cards.map((card) => (
              <div
                key={card.id}
                className="bg-white rounded-lg p-3 shadow-sm border border-gray-100"
              >
                <p className="text-sm text-gray-800 mb-2">{card.title}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {colIndex > 0 && (
                      <button
                        onClick={() => handleMoveCard(col.id, card.id, -1)}
                        className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
                        aria-label="이전 컬럼으로 이동"
                      >
                        ◀
                      </button>
                    )}
                    {colIndex < columns.length - 1 && (
                      <button
                        onClick={() => handleMoveCard(col.id, card.id, 1)}
                        className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
                        aria-label="다음 컬럼으로 이동"
                      >
                        ▶
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteCard(col.id, card.id)}
                    className="text-xs text-gray-300 hover:text-red-500 transition-colors px-1"
                    aria-label="카드 삭제"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}

            {addingColumnId === col.id ? (
              <div className="bg-white rounded-lg p-3 shadow-sm border border-blue-300">
                <input
                  type="text"
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddCard(col.id);
                    if (e.key === "Escape") {
                      setAddingColumnId(null);
                      setNewCardTitle("");
                    }
                  }}
                  placeholder="카드 제목 입력"
                  autoFocus
                  className="w-full text-sm border-none outline-none mb-2 placeholder-gray-400"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddCard(col.id)}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                  >
                    추가
                  </button>
                  <button
                    onClick={() => {
                      setAddingColumnId(null);
                      setNewCardTitle("");
                    }}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAddingColumnId(col.id);
                  setNewCardTitle("");
                }}
                className="text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-300 rounded-lg px-3 py-2 text-left transition-colors"
              >
                + 카드 추가
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
