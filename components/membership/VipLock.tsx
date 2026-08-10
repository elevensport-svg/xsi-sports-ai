type Props = {
  title: string;
  description?: string;
};

const LINE_URL = "https://lin.ee/r8t6pBB4";

export default function VipLock({
  title,
  description = "此功能為 XSI VIP 會員限定",
}: Props) {
  return (
    <div className="rounded-2xl border border-yellow-500/20 bg-zinc-900 p-6 text-center">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-400">
        VIP ONLY
      </p>

      <h3 className="mt-3 text-xl font-black text-white">
        {title}
      </h3>

      <p className="mt-2 text-sm text-zinc-400">
        {description}
      </p>

      <a
        href={LINE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex items-center justify-center rounded-xl bg-yellow-400 px-5 py-2 font-black text-black transition hover:bg-yellow-300"
      >
        升級 VIP
      </a>
    </div>
  );
}