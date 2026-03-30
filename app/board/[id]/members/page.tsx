"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";

type Member = {
  id: string;
  user_id: string;
  role: string;
  email: string | null;
  display_name: string | null;
};

export default function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: boardId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const isOwner = members.find((m) => m.user_id === user?.id)?.role === "owner";

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
      return;
    }
    if (!authLoading && user) loadMembers();
  }, [authLoading, user]);

  async function loadMembers() {
    const { data } = await supabase
      .from("board_members")
      .select("id, user_id, role, profiles(email, display_name)")
      .eq("board_id", boardId);

    if (data) {
      setMembers(
        data.map((m) => {
          const profile = (m.profiles as unknown) as
            | { email: string | null; display_name: string | null }
            | null;
          return {
            id: m.id,
            user_id: m.user_id,
            role: m.role,
            email: profile?.email ?? null,
            display_name: profile?.display_name ?? null,
          };
        })
      );
    }
    setLoading(false);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    setInviteLoading(true);

    const { error } = await supabase.rpc("invite_member", {
      target_board_id: boardId,
      invitee_email: inviteEmail.trim(),
    });

    if (error) {
      if (error.message.includes("User not found")) {
        setInviteError("해당 이메일로 가입된 사용자가 없습니다.");
      } else if (error.message.includes("unique")) {
        setInviteError("이미 멤버로 등록된 사용자입니다.");
      } else {
        setInviteError("초대 중 오류가 발생했습니다.");
      }
    } else {
      setInviteEmail("");
      await loadMembers();
    }
    setInviteLoading(false);
  }

  async function handleRoleChange(memberId: string, currentRole: string) {
    const newRole = currentRole === "owner" ? "member" : "owner";

    // 강등 시: 다른 owner가 있어야 함
    if (newRole === "member") {
      const ownerCount = members.filter((m) => m.role === "owner").length;
      if (ownerCount <= 1) return;
    }

    await supabase
      .from("board_members")
      .update({ role: newRole })
      .eq("id", memberId);

    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
    );
  }

  async function handleRemove(memberId: string) {
    await supabase.from("board_members").delete().eq("id", memberId);
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="bg-white border-b border-gray-100 px-6 py-2 flex items-center gap-3">
        <Link
          href={`/board/${boardId}`}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← 보드로 돌아가기
        </Link>
      </div>

      <div className="max-w-xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">멤버 관리</h1>

        {/* 멤버 목록 */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between px-5 py-4 border-b border-gray-100 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {member.email ?? "(이메일 없음)"}
                  {member.user_id === user?.id && (
                    <span className="ml-2 text-xs text-gray-400">(나)</span>
                  )}
                </p>
                {member.display_name && (
                  <p className="text-xs text-gray-400">{member.display_name}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    member.role === "owner"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {member.role === "owner" ? "소유자" : "멤버"}
                </span>
                {isOwner && member.user_id !== user?.id && (
                  <>
                    <button
                      onClick={() => handleRoleChange(member.id, member.role)}
                      disabled={
                        member.role === "owner" &&
                        members.filter((m) => m.role === "owner").length <= 1
                      }
                      className="text-xs text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-gray-200 rounded px-2 py-0.5"
                      title={
                        member.role === "owner" ? "멤버로 강등" : "소유자로 승격"
                      }
                    >
                      {member.role === "owner" ? "강등" : "승격"}
                    </button>
                    {member.role !== "owner" && (
                      <button
                        onClick={() => handleRemove(member.id)}
                        className="text-xs text-gray-300 hover:text-red-500 transition-colors"
                        aria-label="멤버 제거"
                      >
                        ✕
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 초대 폼 */}
        {isOwner && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              멤버 초대
            </h2>
            <form onSubmit={handleInvite} className="flex flex-col gap-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  setInviteError("");
                }}
                placeholder="초대할 사용자의 이메일"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {inviteError && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {inviteError}
                </p>
              )}
              <button
                type="submit"
                disabled={inviteLoading}
                className="bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {inviteLoading ? "초대 중..." : "초대하기"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
