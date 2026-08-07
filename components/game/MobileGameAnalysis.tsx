"use client";

import DesktopGameAnalysis from "./DesktopGameAnalysis";
import MobileGameAnalysis from "./MobileGameAnalysis";

type Props = {
  data: any;
};

export default function GameAnalysis({
  data,
}: Props) {

    console.log("MOBILE LOAD");


  return (

    <div className="bg-red-500 p-5 text-white">
 MOBILE TEST
</div>
    
    <>

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