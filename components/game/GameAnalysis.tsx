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
      {/* ======================================
          可愛版回上一頁
      ====================================== */}

      <button
        type="button"
        onClick={() =>
          router.back()
        }
        className="
          fixed
          left-4
          top-4
          z-50
          flex
          items-center
          gap-2
          rounded-full
          border
          border-[#eadcc8]
          bg-white/95
          px-3
          py-2
          text-sm
          font-black
          text-[#6f645c]
          shadow-[0_8px_22px_rgba(95,75,55,0.12)]
          backdrop-blur-xl
          transition
          duration-200
          hover:-translate-y-0.5
          hover:border-[#ffc94a]
          hover:bg-[#fff9e8]
          hover:text-[#a56e14]
          sm:px-4
          sm:py-2.5
        "
      >
        <span
          className="
            flex
            h-7
            w-7
            items-center
            justify-center
            rounded-full
            bg-[#fff1bd]
            text-base
            transition
            duration-200
            group-hover:-translate-x-0.5
          "
        >
          ←
        </span>

        <span>
          回上一頁
        </span>
      </button>

      {/* ======================================
          桌機版
      ====================================== */}

      <div className="hidden md:block">
        <DesktopGameAnalysis
          data={data}
        />
      </div>

      {/* ======================================
          手機版
      ====================================== */}

      <div className="block md:hidden">
        <MobileGameAnalysis
          data={data}
        />
      </div>
    </>
  );
}