"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/auth/login");
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <span className="font-semibold text-gray-800">내 보드</span>
      {user && (
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user.email}</span>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-red-500 transition-colors"
          >
            로그아웃
          </button>
        </div>
      )}
    </header>
  );
}
