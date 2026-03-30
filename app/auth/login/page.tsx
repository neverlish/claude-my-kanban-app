"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Mode = "login" | "signup";

const ERROR_MESSAGES: Record<string, string> = {
  "Invalid login credentials": "이메일 또는 비밀번호가 올바르지 않습니다.",
  "User already registered": "이미 사용 중인 이메일입니다.",
  "Password should be at least 6 characters": "비밀번호는 6자 이상이어야 합니다.",
  "Email not confirmed": "이메일 인증이 필요합니다. 메일함을 확인해주세요.",
};

function parseError(message: string): string {
  return ERROR_MESSAGES[message] ?? "오류가 발생했습니다. 다시 시도해주세요.";
}

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setError(parseError(error.message));
          return;
        }
        if (data.user && !data.session) {
          setInfo("이메일로 인증 링크를 보냈습니다. 메일함을 확인해주세요.");
          return;
        }
        router.push("/");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setError(parseError(error.message));
          return;
        }
        router.push("/");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-sm p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {mode === "login" ? "로그인" : "회원가입"}
        </h1>
        <p className="text-sm text-gray-400 mb-6">
          {mode === "login" ? "계정에 로그인하세요" : "새 계정을 만드세요"}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {info && (
            <p className="text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          {mode === "login" ? "계정이 없으신가요?" : "이미 계정이 있으신가요?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
              setInfo("");
            }}
            className="text-blue-600 font-medium hover:underline"
          >
            {mode === "login" ? "회원가입" : "로그인"}
          </button>
        </p>
      </div>
    </div>
  );
}
