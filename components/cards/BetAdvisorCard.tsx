type Props = {
  isVip: boolean;

  recommendation: string;
  confidence: number;
  score: number;

  reasons: string[];
  risk: string;

  awayTeamName: string;
  homeTeamName: string;

  /*
   * XSI 最終模型方向
   */
  selectedTeamName: string;
};

function getStars(
  confidence: number,
) {
  if (confidence >= 80) {
    return "★★★★★";
  }

  if (confidence >= 70) {
    return "★★★★☆";
  }

  if (confidence >= 60) {
    return "★★★☆☆";
  }

  return "★★☆☆☆";
}

/*
 * ==========================================
 * 推薦文字
 *
 * 球隊方向完全跟 selectedTeamName
 *
 * 不再：
 * 獨贏 = 主隊
 * 受讓 = 客隊
 * 讓分 = 主隊
 *
 * 避免跟 Win Probability / XSI 方向衝突
 * ==========================================
 */
function formatRecommendation(
  recommendation: string,
  selectedTeamName: string,
) {
  const text =
    recommendation.trim();

  /*
   * 如果 recommendation 本身
   * 已經包含完整球隊名稱
   * 直接保留
   */
  if (
    text.includes(
      selectedTeamName,
    )
  ) {
    return text
      .replace(
        "讓分 +1.5",
        "受讓 +1.5",
      );
  }

  /*
   * ========================================
   * 受讓
   * ========================================
   */
  if (
    text ===
      "受讓 +1.5" ||
    text ===
      "Run Line +1.5"
  ) {
    return `${selectedTeamName} 受讓 +1.5`;
  }

  /*
   * ========================================
   * 讓分
   * ========================================
   */
  if (
    text === "讓分" ||
    text ===
      "讓分 -1.5" ||
    text ===
      "Run Line -1.5"
  ) {
    return `${selectedTeamName} 讓分 -1.5`;
  }

  /*
   * ========================================
   * 獨贏
   * ========================================
   */
  if (
    text === "獨贏" ||
    text ===
      "Moneyline"
  ) {
    return `${selectedTeamName} 獨贏`;
  }

  /*
   * 其他格式保留球隊方向
   */
  return `${selectedTeamName} ${text}`;
}

export default function BetAdvisorCard({
  isVip,

  recommendation,
  confidence,
  score,

  reasons,
  risk,

  awayTeamName,
  homeTeamName,

  selectedTeamName,
}: Props) {
  /*
   * awayTeamName / homeTeamName
   * 保留 Props，
   * 方便未來玩法顯示需要使用。
   */
  void awayTeamName;
  void homeTeamName;

  const displayRecommendation =
    formatRecommendation(
      recommendation,
      selectedTeamName,
    );

  return (
    <section className="mt-10 overflow-hidden rounded-3xl border border-yellow-500/30 bg-gradient-to-br from-yellow-400/10 via-zinc-950 to-black p-6 md:p-8">
      <p className="text-sm font-black uppercase tracking-[0.25em] text-yellow-400">
        XSI Bet Advisor
      </p>

      {!isVip ? (
        <div className="mt-6 rounded-2xl bg-zinc-900 p-6 text-center">
          <p className="text-xl font-black text-white">
            🔒 VIP 投注策略分析
          </p>

          <p className="mt-3 text-sm text-zinc-400">
            解鎖 Moneyline、讓分、受讓價值比較
          </p>

          <div className="mt-5 space-y-3 text-left">
            {[
              "最佳玩法推薦",
              "盤口價值分析",
              "AI信心評分",
              "投注風險評估",
            ].map(
              (
                item,
              ) => (
                <div
                  key={
                    item
                  }
                  className="rounded-xl bg-black/40 p-3 text-sm text-zinc-400"
                >
                  🔒 {item}
                </div>
              ),
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl bg-zinc-900 p-6">
              <p className="text-xs text-zinc-500">
                AI 最佳玩法
              </p>

              <p className="mt-3 text-3xl font-black text-yellow-400">
                {
                  displayRecommendation
                }
              </p>

              <p className="mt-4 text-2xl tracking-widest text-yellow-400">
                {
                  getStars(
                    confidence,
                  )
                }
              </p>
            </div>

            <div className="rounded-2xl bg-zinc-900 p-6">
              <p className="text-xs text-zinc-500">
                信心評分
              </p>

              <p className="mt-3 text-5xl font-black text-white">
                {score}
              </p>

              <p className="mt-2 text-sm text-zinc-400">
                風險：{risk}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-zinc-900 p-6">
            <p className="font-black text-yellow-400">
              AI 判斷原因
            </p>

            <div className="mt-4 space-y-3">
              {reasons.map(
                (
                  reason,
                ) => (
                  <div
                    key={
                      reason
                    }
                    className="rounded-xl bg-black/40 p-4 text-sm text-zinc-300"
                  >
                    ✓ {reason}
                  </div>
                ),
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}