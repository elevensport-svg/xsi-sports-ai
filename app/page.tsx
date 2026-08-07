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

  // 尚未登入 → 直接前往登入頁
  if (!membership.isLoggedIn) {
  redirect("/login");
}

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-yellow-500/20 bg-black">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-black text-yellow-400">
              十一體育分析 AI
            </h1>

            <p className="text-sm text-zinc-400">
              運動數據智慧平台
            </p>
          </div>

          <div className="rounded-lg border border-yellow-500/30 bg-zinc-900 px-4 py-2">
            {membership.isVip ? "VIP 會員" : "Free 會員"}
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="min-h-[calc(100vh-73px)] w-64 border-r border-yellow-500/20 bg-zinc-950 p-4">
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.label}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left hover:bg-yellow-400 hover:text-black"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="flex-1 p-8">
          <h2 className="text-4xl font-bold">
            MLB 明日賽事
          </h2>

          <p className="mt-3 text-zinc-400">
            以下時間皆為台灣時間
          </p>

          <MlbTomorrowGames />
        </section>
      </div>
    </main>
  );
}