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

export default function Sidebar() {
  return (
    <aside className="min-h-[calc(100vh-73px)] w-64 border-r border-yellow-500/20 bg-zinc-950 p-4">
      <nav className="space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-zinc-300 transition hover:bg-yellow-400 hover:text-black"
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}