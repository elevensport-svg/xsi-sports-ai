import Link from "next/link";
import { redirect } from "next/navigation";

import MlbTomorrowGames from "../../components/MlbTomorrowGames";
import { getCurrentUserMembership } from "../../lib/membership";

export default async function MlbPage() {
  const membership =
    await getCurrentUserMembership();

  if (!membership.isLoggedIn) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-white sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-[1500px]">

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-bold text-white transition hover:border-yellow-400 hover:text-yellow-400"
        >
          ← 回首頁
        </Link>

        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-400">
            XSI MLB
          </p>

          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            ⚾ MLB 賽事分析
          </h1>

          <p className="mt-3 text-sm text-zinc-400">
            明日 MLB 賽程・XSI AI 完整賽事分析
          </p>
        </div>

        <div className="mt-8">
          <MlbTomorrowGames />
        </div>

      </div>
    </main>
  );
}