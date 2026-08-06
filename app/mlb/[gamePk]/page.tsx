type PageProps = {
  params: Promise<{
    gamePk: string;
  }>;
};

export default async function GamePage({ params }: PageProps) {
  const { gamePk } = await params;

  return (
    <main className="min-h-screen bg-[#0b0b0b] p-10 text-white">
      <div className="mx-auto max-w-6xl">
        <a
          href="/"
          className="inline-block rounded-lg border border-yellow-500/30 px-4 py-2 text-yellow-400"
        >
          ← 返回明日賽事
        </a>

        <section className="mt-8 rounded-2xl border border-yellow-500/30 bg-zinc-900 p-8">
          <p className="text-sm font-bold text-yellow-400">MLB 賽事分析</p>

          <h1 className="mt-3 text-4xl font-bold">
            賽事分析頁
          </h1>

          <p className="mt-4 text-zinc-400">
            Game ID：{gamePk}
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <div className="rounded-xl bg-zinc-800 p-5">
              <p className="text-sm text-zinc-400">先發投手</p>
              <p className="mt-2 text-xl font-bold">資料準備中</p>
            </div>

            <div className="rounded-xl bg-zinc-800 p-5">
              <p className="text-sm text-zinc-400">XSI Score</p>
              <p className="mt-2 text-xl font-bold text-yellow-400">
                尚未計算
              </p>
            </div>

            <div className="rounded-xl bg-zinc-800 p-5">
              <p className="text-sm text-zinc-400">推薦玩法</p>
              <p className="mt-2 text-xl font-bold">尚未分析</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}