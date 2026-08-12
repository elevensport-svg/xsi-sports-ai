"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function normalizeUsername(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "");
  }

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const cleanUsername = normalizeUsername(username);

    if (!cleanUsername) {
      setMessage("請輸入帳號。");
      setLoading(false);
      return;
    }

    if (!password) {
      setMessage("請輸入密碼。");
      setLoading(false);
      return;
    }

    /*
     * 註冊時：
     * username → username@members.xsi.local
     *
     * 登入時使用同樣規則，
     * 所以會員前台只需要輸入帳號。
     */
    const systemEmail = `${cleanUsername}@members.xsi.local`;

    const { error } = await supabase.auth.signInWithPassword({
      email: systemEmail,
      password,
    });

    if (error) {
      console.error("Login error:", error);

      if (
        error.message.toLowerCase().includes("invalid login") ||
        error.message.toLowerCase().includes("invalid credentials")
      ) {
        setMessage("帳號或密碼錯誤。");
      } else {
        setMessage(error.message);
      }

      setLoading(false);
      return;
    }

    setLoading(false);

    /*
     * 登入成功後回首頁
     */
    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-black px-4 py-12 text-white">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-3xl border border-yellow-500/20 bg-zinc-900 p-8">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-yellow-400">
            XSI SPORTS AI
          </p>

          <h1 className="mt-3 text-3xl font-black">
            會員登入
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            使用帳號與密碼登入
          </p>

          <form
            onSubmit={handleLogin}
            className="mt-8 space-y-5"
          >
            {/* 帳號 */}
            <div>
              <label className="text-sm text-zinc-400">
                帳號
              </label>

              <input
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(
                    event.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9_]/g, ""),
                  )
                }
                required
                placeholder="請輸入帳號"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-700 focus:border-yellow-400"
              />
            </div>

            {/* 密碼 */}
            <div>
              <label className="text-sm text-zinc-400">
                密碼
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
                placeholder="請輸入密碼"
                autoComplete="current-password"
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-700 focus:border-yellow-400"
              />
            </div>

            {/* 登入 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-yellow-400 px-5 py-3 font-black text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "登入中..."
                : "登入會員"}
            </button>
          </form>

          {/* 錯誤訊息 */}
          {message && (
            <div className="mt-5 rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-sm text-zinc-300">
              {message}
            </div>
          )}

          {/* 註冊 */}
          <div className="mt-6 text-center text-sm text-zinc-500">
            還沒有帳號？

            <button
              type="button"
              onClick={() => router.push("/register")}
              className="ml-2 font-bold text-yellow-400 transition hover:text-yellow-300"
            >
              建立免費會員
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}