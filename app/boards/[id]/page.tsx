import Link from "next/link";

export default function BoardPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-6">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← 내 보드
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          보드 #{params.id}
        </h1>
        <p className="text-gray-400 text-sm mt-1">칸반 보드 페이지 (준비 중)</p>
      </div>
    </div>
  );
}
