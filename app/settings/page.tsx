"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

const LINE_URL =
  "https://lin.ee/r8t6pBB4";

type HomePageOption =
  | "/"
  | "/mlb"
  | "/nba"
  | "/football"
  | "/esports";

type OddsFormat =
  | "decimal"
  | "hongkong"
  | "american";

type SortMode =
  | "time"
  | "confidence"
  | "xsi";

type AiMode =
  | "safe"
  | "balanced"
  | "aggressive";

type MobileMode =
  | "compact"
  | "full";

type Preferences = {
  defaultHome: HomePageOption;
  oddsFormat: OddsFormat;
  sortMode: SortMode;

  aiMode: AiMode;
  minConfidence: number;

  analysisWin: boolean;
  analysisSpread: boolean;
  analysisTotal: boolean;
  analysisParlay: boolean;

  darkMode: boolean;
  mobileMode: MobileMode;
};

const DEFAULT_SETTINGS: Preferences = {
  defaultHome: "/",
  oddsFormat: "decimal",
  sortMode: "time",

  aiMode: "balanced",
  minConfidence: 75,

  analysisWin: true,
  analysisSpread: true,
  analysisTotal: true,
  analysisParlay: false,

  darkMode: true,
  mobileMode: "full",
};

export default function SettingsPage() {
  const [
    settings,
    setSettings,
  ] = useState<Preferences>(
    DEFAULT_SETTINGS,
  );

  const [
    loaded,
    setLoaded,
  ] = useState(false);

  const [
    saved,
    setSaved,
  ] = useState(false);

  useEffect(() => {
    try {
      const stored =
        window.localStorage.getItem(
          "xsi-settings",
        );

      if (stored) {
        const parsed =
          JSON.parse(stored);

        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
        });
      }
    } catch (error) {
      console.error(
        "讀取 XSI 設定失敗:",
        error,
      );
    }

    setLoaded(true);
  }, []);

  function updateSetting<
    K extends keyof Preferences,
  >(
    key: K,
    value: Preferences[K],
  ) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));

    setSaved(false);
  }

  function saveSettings() {
    window.localStorage.setItem(
      "xsi-settings",
      JSON.stringify(settings),
    );

    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 2500);
  }

  function resetSettings() {
    setSettings(
      DEFAULT_SETTINGS,
    );

    window.localStorage.setItem(
      "xsi-settings",
      JSON.stringify(
        DEFAULT_SETTINGS,
      ),
    );

    setSaved(true);
  }

  if (!loaded) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-zinc-500">
            載入設定中...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 pb-28 text-white sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-5xl">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-bold text-white transition hover:border-yellow-400 hover:text-yellow-400"
          >
            ← 回首頁
          </Link>

          <button
            type="button"
            onClick={resetSettings}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-bold text-zinc-400 transition hover:border-zinc-600 hover:text-white"
          >
            恢復預設
          </button>
        </div>

        <div className="mt-8">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-400">
            XSI SETTINGS
          </p>

          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            ⚙️ 系統設定
          </h1>

          <p className="mt-3 text-sm text-zinc-400">
            自訂賽事顯示、AI 分析偏好與系統使用方式。
          </p>
        </div>

        {/* =========================
            賽事顯示
        ========================= */}
        <SettingsSection
          title="🏟️ 賽事顯示"
          description="調整預設賽事頁面與資料顯示方式"
        >
          <SettingRow
            title="預設首頁"
            description="登入後預設顯示的頁面"
          >
            <select
              value={
                settings.defaultHome
              }
              onChange={(event) =>
                updateSetting(
                  "defaultHome",
                  event.target
                    .value as HomePageOption,
                )
              }
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 font-bold text-white outline-none focus:border-yellow-400 sm:w-52"
            >
              <option value="/">
                首頁
              </option>

              <option value="/mlb">
                MLB
              </option>

              <option value="/nba">
                NBA
              </option>

              <option value="/football">
                足球
              </option>

              <option value="/esports">
                電競
              </option>
            </select>
          </SettingRow>

          <SettingRow
            title="時區"
            description="所有賽事時間顯示"
          >
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm font-bold">
              🇹🇼 台灣時間 UTC+8
            </div>
          </SettingRow>

          <SettingRow
            title="賠率格式"
            description="選擇網站預設賠率顯示"
          >
            <select
              value={
                settings.oddsFormat
              }
              onChange={(event) =>
                updateSetting(
                  "oddsFormat",
                  event.target
                    .value as OddsFormat,
                )
              }
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 font-bold text-white outline-none focus:border-yellow-400 sm:w-52"
            >
              <option value="decimal">
                歐洲盤 Decimal
              </option>

              <option value="hongkong">
                香港盤
              </option>

              <option value="american">
                美國盤 American
              </option>
            </select>
          </SettingRow>

          <SettingRow
            title="賽事排序"
            description="賽事列表預設排序方式"
          >
            <select
              value={
                settings.sortMode
              }
              onChange={(event) =>
                updateSetting(
                  "sortMode",
                  event.target
                    .value as SortMode,
                )
              }
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 font-bold text-white outline-none focus:border-yellow-400 sm:w-52"
            >
              <option value="time">
                開賽時間
              </option>

              <option value="confidence">
                AI 信心度
              </option>

              <option value="xsi">
                XSI 價值評分
              </option>
            </select>
          </SettingRow>
        </SettingsSection>

        {/* =========================
            AI 分析偏好
        ========================= */}
        <SettingsSection
          title="🤖 AI 分析偏好"
          description="設定 XSI AI 推薦與風險偏好"
        >
          <div>
            <p className="text-sm font-black text-white">
              AI 分析模式
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              不同模式可套用不同推薦門檻與風險策略
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <ModeButton
                active={
                  settings.aiMode ===
                  "safe"
                }
                title="保守"
                description="低風險"
                onClick={() =>
                  updateSetting(
                    "aiMode",
                    "safe",
                  )
                }
              />

              <ModeButton
                active={
                  settings.aiMode ===
                  "balanced"
                }
                title="均衡"
                description="風險平衡"
                onClick={() =>
                  updateSetting(
                    "aiMode",
                    "balanced",
                  )
                }
              />

              <ModeButton
                active={
                  settings.aiMode ===
                  "aggressive"
                }
                title="積極"
                description="高報酬"
                onClick={() =>
                  updateSetting(
                    "aiMode",
                    "aggressive",
                  )
                }
              />
            </div>
          </div>

          <div className="mt-8 border-t border-zinc-800 pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black">
                  最低推薦信心度
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  低於此門檻的分析不列為主要推薦
                </p>
              </div>

              <span className="rounded-xl bg-yellow-400 px-3 py-2 text-lg font-black text-black">
                {
                  settings.minConfidence
                }
                %
              </span>
            </div>

            <input
              type="range"
              min="50"
              max="90"
              step="1"
              value={
                settings.minConfidence
              }
              onChange={(event) =>
                updateSetting(
                  "minConfidence",
                  Number(
                    event.target
                      .value,
                  ),
                )
              }
              className="mt-6 w-full accent-yellow-400"
            />

            <div className="mt-2 flex justify-between text-[10px] text-zinc-600">
              <span>50%</span>
              <span>70%</span>
              <span>90%</span>
            </div>
          </div>

          <div className="mt-8 border-t border-zinc-800 pt-6">
            <p className="text-sm font-black">
              偏好分析
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              選擇你主要關注的推薦類型
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <CheckCard
                label="勝負"
                checked={
                  settings.analysisWin
                }
                onChange={(value) =>
                  updateSetting(
                    "analysisWin",
                    value,
                  )
                }
              />

              <CheckCard
                label="讓分"
                checked={
                  settings.analysisSpread
                }
                onChange={(value) =>
                  updateSetting(
                    "analysisSpread",
                    value,
                  )
                }
              />

              <CheckCard
                label="大小分"
                checked={
                  settings.analysisTotal
                }
                onChange={(value) =>
                  updateSetting(
                    "analysisTotal",
                    value,
                  )
                }
              />

              <CheckCard
                label="串關"
                checked={
                  settings.analysisParlay
                }
                onChange={(value) =>
                  updateSetting(
                    "analysisParlay",
                    value,
                  )
                }
              />
            </div>
          </div>

          {/* 信心度規則 */}
          <div className="mt-8 rounded-2xl border border-yellow-500/20 bg-black/30 p-5">
            <p className="text-sm font-black text-yellow-400">
              XSI 推薦等級
            </p>

            <div className="mt-4 space-y-3">
              <ConfidenceRow
                value="80%+"
                label="高信心"
              />

              <ConfidenceRow
                value="70–79%"
                label="可以考慮"
              />

              <ConfidenceRow
                value="60–69%"
                label="觀望"
              />

              <ConfidenceRow
                value="< 60%"
                label="不推薦"
              />
            </div>
          </div>
        </SettingsSection>

        {/* =========================
            系統
        ========================= */}
        <SettingsSection
          title="🖥️ 系統"
          description="網站顯示與系統資訊"
        >
          <SettingRow
            title="深色模式"
            description="XSI 黑金介面"
          >
            <Switch
              enabled={
                settings.darkMode
              }
              onChange={(value) =>
                updateSetting(
                  "darkMode",
                  value,
                )
              }
            />
          </SettingRow>

          <SettingRow
            title="手機分析模式"
            description="控制手機版分析資訊量"
          >
            <select
              value={
                settings.mobileMode
              }
              onChange={(event) =>
                updateSetting(
                  "mobileMode",
                  event.target
                    .value as MobileMode,
                )
              }
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 font-bold text-white outline-none focus:border-yellow-400 sm:w-48"
            >
              <option value="compact">
                精簡模式
              </option>

              <option value="full">
                完整模式
              </option>
            </select>
          </SettingRow>

          <SettingRow
            title="資料更新時間"
            description="目前系統時間"
          >
            <span className="text-sm font-bold text-zinc-300">
              {formatNow()}
            </span>
          </SettingRow>

          <SettingRow
            title="XSI 模型版本"
            description="目前使用的分析引擎"
          >
            <span className="rounded-lg border border-yellow-500/20 bg-yellow-400/5 px-3 py-2 text-sm font-black text-yellow-400">
              XSI Engine v2.0
            </span>
          </SettingRow>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-sm font-bold text-zinc-300 transition hover:border-yellow-400 hover:text-yellow-400"
            >
              📄 免責聲明
            </button>

            <button
              type="button"
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-sm font-bold text-zinc-300 transition hover:border-yellow-400 hover:text-yellow-400"
            >
              🔐 隱私權政策
            </button>

            <a
              href={LINE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-center text-sm font-bold text-zinc-300 transition hover:border-yellow-400 hover:text-yellow-400"
            >
              💬 聯絡客服
            </a>
          </div>
        </SettingsSection>

        {/* Save */}
        <div className="sticky bottom-4 z-20 mt-8">
          <button
            type="button"
            onClick={saveSettings}
            className="w-full rounded-2xl bg-yellow-400 px-6 py-4 text-base font-black text-black shadow-2xl transition hover:bg-yellow-300"
          >
            {saved
              ? "✓ 設定已儲存"
              : "儲存設定"}
          </button>
        </div>

      </div>
    </main>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-7">
      <div className="border-b border-zinc-800 pb-5">
        <h2 className="text-xl font-black">
          {title}
        </h2>

        <p className="mt-2 text-sm text-zinc-500">
          {description}
        </p>
      </div>

      <div className="mt-6">
        {children}
      </div>
    </section>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-zinc-800 py-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-black">
          {title}
        </p>

        <p className="mt-1 text-xs text-zinc-500">
          {description}
        </p>
      </div>

      <div className="shrink-0">
        {children}
      </div>
    </div>
  );
}

function ModeButton({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-3 text-center transition ${
        active
          ? "border-yellow-400 bg-yellow-400 text-black"
          : "border-zinc-700 bg-zinc-950 text-white hover:border-yellow-400/50"
      }`}
    >
      <p className="text-sm font-black">
        {title}
      </p>

      <p
        className={`mt-1 text-[10px] ${
          active
            ? "text-black/60"
            : "text-zinc-500"
        }`}
      >
        {description}
      </p>
    </button>
  );
}

function CheckCard({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (
    value: boolean,
  ) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
        checked
          ? "border-yellow-500/30 bg-yellow-400/5"
          : "border-zinc-800 bg-zinc-950"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(
            event.target.checked,
          )
        }
        className="h-4 w-4 accent-yellow-400"
      />

      <span
        className={`text-sm font-bold ${
          checked
            ? "text-yellow-400"
            : "text-zinc-400"
        }`}
      >
        {label}
      </span>
    </label>
  );
}

function ConfidenceRow({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-zinc-950 px-4 py-3">
      <span className="font-black text-white">
        {value}
      </span>

      <span className="text-sm font-bold text-yellow-400">
        {label}
      </span>
    </div>
  );
}

function Switch({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (
    value: boolean,
  ) => void;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        onChange(!enabled)
      }
      className={`relative h-7 w-14 rounded-full transition ${
        enabled
          ? "bg-yellow-400"
          : "bg-zinc-700"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
          enabled
            ? "left-8"
            : "left-1"
        }`}
      />
    </button>
  );
}

function formatNow() {
  return new Intl.DateTimeFormat(
    "zh-TW",
    {
      timeZone:
        "Asia/Taipei",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  ).format(new Date());
}