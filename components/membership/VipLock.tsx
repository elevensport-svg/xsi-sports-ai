type Props = {
  title: string;
  description?: string;
};

export default function VipLock({
  title,
  description = "此功能為 XSI VIP 會員限定",
}: Props) {
  return (
    <div className="rounded-2xl border border-yellow-500/30 bg-zinc-950 p-6">
      <p className="text-xs font-black text-yellow-400">
        VIP ONLY
      </p>

      <h3 className="mt-3 text-xl font-black text-white">
        {title}
      </h3>

      <p className="mt-2 text-sm text-zinc-400">
        {description}
      </p>

      <button className="mt-5 rounded-xl bg-yellow-400 px-5 py-2 font-black text-black">
        升級 VIP
      </button>
    </div>
  );
}