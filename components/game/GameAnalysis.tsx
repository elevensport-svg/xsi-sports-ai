"use client";

import DesktopGameAnalysis from "./DesktopGameAnalysis";
import MobileGameAnalysis from "./MobileGameAnalysis";

type Props = {
  data: any;
};

export default function GameAnalysis({
  data,
}: Props) {
  return (
    <>
      <div className="hidden md:block">
        <DesktopGameAnalysis data={data} />
      </div>

      <div className="block md:hidden">
        <MobileGameAnalysis data={data} />
      </div>
    </>
  );
}