"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";

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

export default function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingColumnId, setAddingColumnId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
      return;
    }
    if (!authLoading && user) {
      loadColumns();
      const unsub = subscribeRealtime();
      return unsub;
    }
  }, [authLoading, user]);

  async function loadColumns() {
    const { data } = await supabase
      .from("columns")
      .select("*, cards(*)")
      .eq("board_id", id)
      .order("position");

    if (data) {
      setColumns(
        data.map((col) => ({
          ...col,
          cards: (col.cards as Card[]).sort((a, b) => a.position - b.position),
        }))
      );
    }
    setLoading(false);
  }

  function subscribeRealtime() {
    const channel = supabase
      .channel(`board:${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "kanban", table: "cards" },
        (payload) => {
          const card = payload.new as Card;
          setColumns((prev) =>
            prev.map((col) =>
              col.id === card.column_id
                ? {
                    ...col,
                    cards: [...col.cards.filter((c) => c.id !== card.id), card].sort(
                      (a, b) => a.position - b.position
                    ),
                  }
                : col
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "kanban", table: "cards" },
        (payload) => {
          const card = payload.new as Card;
          const oldCard = payload.old as Pick<Card, "id" | "column_id">;
          setColumns((prev) =>
            prev.map((col) => {
              const isOldCol = col.id === oldCard.column_id;
              const isNewCol = col.id === card.column_id;

              if (isOldCol && isNewCol) {
                // 같은 컬럼 내 위치 변경: 제자리 업데이트
                return {
                  ...col,
                  cards: col.cards
                    .map((c) => (c.id === card.id ? card : c))
                    .sort((a, b) => a.position - b.position),
                };
              }
              if (isOldCol) {
                // 이전 컬럼에서 제거
                return { ...col, cards: col.cards.filter((c) => c.id !== card.id) };
              }
              if (isNewCol) {
                // 새 컬럼에 추가
                return {
                  ...col,
                  cards: [...col.cards.filter((c) => c.id !== card.id), card].sort(
                    (a, b) => a.position - b.position
                  ),
                };
              }
              return col;
            })
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "kanban", table: "cards" },
        (payload) => {
          const deleted = payload.old as Pick<Card, "id" | "column_id">;
          setColumns((prev) =>
            prev.map((col) => ({
              ...col,
              cards: col.cards.filter((c) => c.id !== deleted.id),
            }))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  async function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    const srcCol = columns.find((c) => c.id === source.droppableId)!;
    const dstCol = columns.find((c) => c.id === destination.droppableId)!;
    const card = srcCol.cards[source.index];

    // 낙관적 업데이트
    setColumns((prev) => {
      const next = prev.map((col) => ({ ...col, cards: [...col.cards] }));
      const src = next.find((c) => c.id === source.droppableId)!;
      const dst = next.find((c) => c.id === destination.droppableId)!;
      src.cards.splice(source.index, 1);
      dst.cards.splice(destination.index, 0, {
        ...card,
        column_id: destination.droppableId,
      });
      return next;
    });

    // DB 업데이트
    const updates: PromiseLike<unknown>[] = [];

    if (source.droppableId !== destination.droppableId) {
      updates.push(
        supabase
          .from("cards")
          .update({ column_id: destination.droppableId, position: destination.index })
          .eq("id", draggableId)
      );
    }

    // 목적지 컬럼의 position 재정렬
    const newDstCards = [...dstCol.cards];
    newDstCards.splice(
      source.droppableId === destination.droppableId ? source.index : dstCol.cards.length,
      source.droppableId === destination.droppableId ? 1 : 0
    );
    newDstCards.splice(destination.index, 0, card);

    newDstCards.forEach((c, i) => {
      updates.push(
        supabase.from("cards").update({ position: i }).eq("id", c.id)
      );
    });

    await Promise.all(updates);
  }

  async function handleAddCard(columnId: string) {
    const title = newCardTitle.trim();
    if (!title) return;

    const col = columns.find((c) => c.id === columnId);
    const position = col ? col.cards.length : 0;

    await supabase
      .from("cards")
      .insert({ column_id: columnId, title, position })
      .select()
      .single();

    // Realtime이 INSERT를 처리하므로 로컬 상태 직접 업데이트 불필요
    setNewCardTitle("");
    setAddingColumnId(null);
  }

  async function handleDeleteCard(cardId: string) {
    await supabase.from("cards").delete().eq("id", cardId);
    // Realtime이 DELETE를 처리
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center text-gray-400">
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="bg-white border-b border-gray-100 px-6 py-2 flex items-center justify-between">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
          ← 홈으로
        </Link>
        <Link href={`/board/${id}/members`} className="text-sm text-gray-500 hover:text-blue-600 transition-colors">
          멤버 관리
        </Link>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 p-6 overflow-x-auto">
          {columns.map((col) => (
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

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex flex-col gap-2 min-h-[4px] rounded-lg transition-colors ${
                      snapshot.isDraggingOver ? "bg-blue-100" : ""
                    }`}
                  >
                    {col.cards.map((card, index) => (
                      <Draggable key={card.id} draggableId={card.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-white rounded-lg p-3 shadow-sm border border-gray-100 transition-shadow ${
                              snapshot.isDragging ? "shadow-lg rotate-1" : ""
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm text-gray-800">{card.title}</p>
                              <button
                                onClick={() => handleDeleteCard(card.id)}
                                className="text-xs text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                                aria-label="카드 삭제"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

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
                      onClick={() => { setAddingColumnId(null); setNewCardTitle(""); }}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setAddingColumnId(col.id); setNewCardTitle(""); }}
                  className="text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-300 rounded-lg px-3 py-2 text-left transition-colors"
                >
                  + 카드 추가
                </button>
              )}
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
