import HistoryWinRateCard from "../../components/cards/HistoryWinRateCard";


export default function HistoryPage(){

return (

<main className="min-h-screen bg-black p-8 text-white">

<h1 className="text-4xl font-black text-yellow-400">
📊 XSI AI 歷史戰績
</h1>


<p className="mt-2 text-zinc-400">
所有 AI 預測紀錄統計
</p>


<div className="mt-8 max-w-xl">

<HistoryWinRateCard
 total={328}
 wins={208}
 losses={120}
 spreadRate={58.8}
 overUnderRate={61.2}
 maxWinStreak={8}
/>

</div>


</main>

);

}