import { redirect } from "next/navigation";

import MlbTomorrowGames from "../components/MlbTomorrowGames";
import { getCurrentUserMembership } from "../lib/membership";

const menuItems = [
  { icon: "🏠", label: "首頁" },
  { icon: "⚾", label: "MLB" },
  { icon: "🏀", label: "NBA" },
  { icon: "⚽", label: "足球" },
  { icon: "🎮", label: "電競" },
  { icon: "🤖", label: "AI 工具" },
  { icon: "📊", label: "歷史戰績" },
  { icon: "⚙️", label: "設定" },
];

export default async function Home() {
  const membership = await getCurrentUserMembership();

  if (!membership.isLoggedIn) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-white">
      {/* Header */}
      <header className="border-b border-yellow-500/20 bg-black">
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black text-yellow-400 sm:text-2xl">
              十一體育分析 AI
            </h1>

            <p className="mt-1 hidden text-sm text-zinc-400 sm:block">
              運動數據智慧平台
            </p>
          </div>

          <div className="shrink-0 rounded-lg border border-yellow-500/30 bg-zinc-900 px-3 py-2 text-xs font-bold sm:px-4 sm:text-sm">
            {membership.isVip
              ? "VIP 會員"
              : membership.name}
          </div>
        </div>

        {/* 手機版選單 */}
        <nav className="border-t border-zinc-900 px-3 py-3 md:hidden">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {menuItems.map((item) => (
              <button
                key={item.label}
                className="flex shrink-0 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-bold text-zinc-300 transition hover:border-yellow-400 hover:bg-yellow-400 hover:text-black"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </header>

      <div className="flex min-w-0">
        {/* 桌機版 Sidebar */}
        <aside className="hidden min-h-[calc(100vh-73px)] w-64 shrink-0 border-r border-yellow-500/20 bg-zinc-950 p-4 md:block">
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.label}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition hover:bg-yellow-400 hover:text-black"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <section className="min-w-0 flex-1 px-4 py-6 sm:px-6 md:p-8">
          <div className="mx-auto w-full max-w-[1500px]">
            <h2 className="text-3xl font-black leading-tight sm:text-4xl">
              MLB 明日賽事
            </h2>

            <p className="mt-2 text-sm text-zinc-400 sm:mt-3">
              以下時間皆為台灣時間
            </p>

            <MlbTomorrowGames />
          </div>
        </section>
      </div>
    </main>
  );
}