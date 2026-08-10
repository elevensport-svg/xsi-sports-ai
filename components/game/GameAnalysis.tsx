"use client";

import { useRouter } from "next/navigation";

import DesktopGameAnalysis from "./DesktopGameAnalysis";
import MobileGameAnalysis from "./MobileGameAnalysis";

type Props = {
  data: any;
};

export default function GameAnalysis({
  data,
}: Props) {
  const router = useRouter();

  return (
    <>
      {/* 回上一頁 */}
      <button
        type="button"
        onClick={() => router.back()}
        className="
          fixed
          left-4
          top-4
          z-50
          flex
          items-center
          gap-2
          rounded-xl
          border
          border-zinc-700
          bg-zinc-900/95
          px-4
          py-2.5
          text-sm
          font-bold
          text-white
          shadow-lg
          backdrop-blur
          transition
          hover:border-yellow-400
          hover:bg-zinc-800
          hover:text-yellow-400
        "
      >
        <span className="text-lg">←</span>
        <span>回上一頁</span>
      </button>

      {/* 桌機版 */}
      <div className="hidden md:block">
        <DesktopGameAnalysis data={data} />
      </div>

      {/* 手機版 */}
      <div className="block md:hidden">
        <MobileGameAnalysis data={data} />
      </div>
    </>
  );
}