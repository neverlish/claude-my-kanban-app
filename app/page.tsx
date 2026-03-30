"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";

type Board = {
  id: string;
  name: string;
  created_at: string;
};

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBoardName, setNewBoardName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
      return;
    }
    if (!authLoading && user) loadBoards();
  }, [authLoading, user]);

  async function loadBoards() {
    if (!user) return;
    const { data: memberships } = await supabase
      .from("board_members")
      .select("board_id")
      .eq("user_id", user.id);

    const boardIds = memberships?.map((m) => m.board_id) ?? [];
    if (boardIds.length === 0) {
      setBoards([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("boards")
      .select("*")
      .in("id", boardIds)
      .order("created_at", { ascending: false });

    if (data) setBoards(data);
    setLoading(false);
  }

  async function handleAddBoard() {
    const name = newBoardName.trim();
    if (!name || !user) return;

    const { data: board } = await supabase.rpc("create_board", {
      board_name: name,
      owner_id: user.id,
    });

    if (!board) return;
    setBoards((prev) => [board, ...prev]);
    setNewBoardName("");
    setIsAdding(false);
  }

  async function handleDelete(id: string) {
    await supabase.from("boards").delete().eq("id", id);
    setBoards((prev) => prev.filter((b) => b.id !== id));
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">
        로딩 중...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">내 보드</h1>
          <button
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + 새 보드 추가
          </button>
        </div>

        {isAdding && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
            <p className="text-sm font-medium text-gray-700 mb-2">보드 이름</p>
            <input
              type="text"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddBoard()}
              placeholder="보드 이름을 입력하세요"
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddBoard}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                추가
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewBoardName("");
                }}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-400">불러오는 중...</div>
        ) : boards.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">보드가 없습니다.</p>
            <p className="text-sm mt-1">새 보드를 추가해보세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board) => (
              <div
                key={board.id}
                className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow group relative"
              >
                <Link href={`/board/${board.id}`} className="block">
                  <h2 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors mb-1">
                    {board.name}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {board.created_at.slice(0, 10)}
                  </p>
                </Link>
                <button
                  onClick={() => handleDelete(board.id)}
                  className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors text-sm"
                  aria-label="보드 삭제"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
