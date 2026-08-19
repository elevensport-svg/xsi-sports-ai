import {
  getCurrentMlbSchedule,
  isMlbTomorrowSchedule,
} from "../lib/api/mlb";

import MlbGamesList from "./MlbGamesList";

export default async function MlbTomorrowGames() {
  const games =
    await getCurrentMlbSchedule();

  const isTomorrow =
    isMlbTomorrowSchedule();

  const englishTitle =
    isTomorrow
      ? "Tomorrow Schedule"
      : "Today Schedule";

  const chineseTitle =
    isTomorrow
      ? "明日 MLB 賽事"
      : "今日 MLB 賽事";

  const emptyTitle =
    isTomorrow
      ? "目前查不到明日 MLB 賽程"
      : "目前查不到今日 MLB 賽程";

  return (
    <section className="w-full min-w-0">
      {/* ======================================
          Header
      ====================================== */}

      <div
        className="
          mb-6
          rounded-[26px]
          border
          border-[#eee0cd]
          bg-gradient-to-r
          from-[#fff8df]
          via-white
          to-[#edf9ff]
          p-5
          shadow-[0_8px_24px_rgba(95,75,55,0.06)]
          sm:p-6
        "
      >
        <div
          className="
            flex
            flex-col
            gap-4
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div
            className="
              flex
              items-start
              gap-4
            "
          >
            {/* Baseball Icon */}

            <div
              className="
                flex
                h-14
                w-14
                shrink-0
                items-center
                justify-center
                rounded-[20px]
                border
                border-[#eee3d6]
                bg-white
                text-3xl
                shadow-sm
              "
            >
              ⚾
            </div>

            <div>
              <div
                className="
                  flex
                  flex-wrap
                  items-center
                  gap-2
                "
              >
                <p
                  className="
                    text-[10px]
                    font-black
                    uppercase
                    tracking-[0.22em]
                    text-[#c68418]
                  "
                >
                  {englishTitle}
                </p>

                <span
                  className="
                    rounded-full
                    bg-[#fff1bd]
                    px-2.5
                    py-1
                    text-[9px]
                    font-black
                    text-[#9f711e]
                  "
                >
                  XSI MLB
                </span>
              </div>

              <h2
                className="
                  mt-2
                  text-2xl
                  font-black
                  tracking-tight
                  text-[#4a4038]
                  sm:text-3xl
                "
              >
                {chineseTitle}
              </h2>

              <p
                className="
                  mt-2
                  text-xs
                  font-medium
                  text-[#9c9085]
                "
              >
                🕒 每日下午 3:00 自動切換隔日賽程
              </p>
            </div>
          </div>

          {/* Match Count */}

          {games.length > 0 && (
            <div
              className="
                flex
                w-fit
                items-center
                gap-2
                rounded-full
                border
                border-[#ccebdc]
                bg-[#ecfff5]
                px-4
                py-2
              "
            >
              <span>
                📅
              </span>

              <span
                className="
                  text-xs
                  font-black
                  text-[#478169]
                "
              >
                今日共
                {" "}
                {games.length}
                {" "}
                場
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ======================================
          Empty State
      ====================================== */}

      {games.length === 0 ? (
        <div
          className="
            relative
            overflow-hidden
            rounded-[28px]
            border
            border-[#eee0cd]
            bg-white
            p-8
            text-center
            shadow-[0_10px_28px_rgba(95,75,55,0.07)]
          "
        >
          <div
            className="
              pointer-events-none
              absolute
              -right-10
              -top-10
              h-32
              w-32
              rounded-full
              bg-[#dff5ff]/50
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              -bottom-12
              -left-10
              h-32
              w-32
              rounded-full
              bg-[#fff1a8]/35
            "
          />

          <div className="relative">
            <div
              className="
                mx-auto
                flex
                h-20
                w-20
                items-center
                justify-center
                rounded-[26px]
                bg-[#fff6d8]
                text-4xl
                shadow-sm
              "
            >
              ⚾
            </div>

            <p
              className="
                mt-5
                text-lg
                font-black
                text-[#4a4038]
              "
            >
              {emptyTitle}
            </p>

            <p
              className="
                mx-auto
                mt-2
                max-w-md
                text-sm
                leading-6
                text-[#998d82]
              "
            >
              可能是今天休兵、
              賽程還沒更新，
              或 MLB API 暫時沒有資料。
            </p>

            <div
              className="
                mx-auto
                mt-5
                w-fit
                rounded-full
                bg-[#eef9ff]
                px-4
                py-2
                text-xs
                font-bold
                text-[#5c8295]
              "
            >
              🤖 XSI 小助手會持續幫你檢查賽程
            </div>
          </div>
        </div>
      ) : (
        /* ======================================
           Games
        ====================================== */

        <div
          className="
            rounded-[26px]
            border
            border-[#eee5da]
            bg-[#fffdf9]
            p-2
            sm:p-3
          "
        >
          <MlbGamesList
            games={games}
          />
        </div>
      )}
    </section>
  );
}