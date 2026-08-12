export default function Header() {
  return (
    <header className="border-b border-yellow-500/20 bg-black">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-yellow-400">
            XSI SPORTS AI
          </h1>
          <p className="text-sm text-zinc-400">
            體育數據分析平台
          </p>
        </div>

        <div className="rounded-lg border border-yellow-500/30 bg-zinc-900 px-4 py-2 text-sm">
          管理員
        </div>
      </div>
    </header>
  );
}