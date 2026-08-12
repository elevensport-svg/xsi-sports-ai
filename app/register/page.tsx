"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
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

  async function handleRegister(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const cleanUsername = normalizeUsername(username);

    if (cleanUsername.length < 4) {
      setMessage("帳號至少需要 4 個英文字母、數字或底線。");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setMessage("密碼至少需要 6 個字元。");
      setLoading(false);
      return;
    }

    /*
     * Supabase Auth 底層仍然需要 Email。
     * 我們使用帳號自動產生系統 Email，
     * 使用者前台完全不需要看到 Email。
     */
    const systemEmail = `${cleanUsername}@members.xsi.local`;

    const { error } = await supabase.auth.signUp({
      email: systemEmail,
      password,
      options: {
        data: {
          name: name.trim(),
          username: cleanUsername,
        },
      },
    });

    if (error) {
      console.error("Register error:", error);

      if (
        error.message.toLowerCase().includes("already") ||
        error.message.toLowerCase().includes("registered")
      ) {
        setMessage("這個帳號已經有人使用，請換一個帳號。");
      } else {
        setMessage(error.message);
      }

      setLoading(false);
      return;
    }

    /*
     * Email 驗證已關閉，
     * signUp 後 Supabase 可能會直接建立登入 Session。
     *
     * 這裡主動登出，
     * 讓會員完成註冊後正式使用帳號密碼登入。
     */
    await supabase.auth.signOut();

    setLoading(false);

    router.push("/login");
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
            建立會員
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            註冊後預設為免費會員
          </p>

          <form
            onSubmit={handleRegister}
            className="mt-8 space-y-5"
          >
            {/* 名稱 */}
            <div>
              <label className="text-sm text-zinc-400">
                名稱
              </label>

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                required
                placeholder="例如：十一"
                autoComplete="name"
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-700 focus:border-yellow-400"
              />
            </div>

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
                minLength={4}
                maxLength={30}
                placeholder="例如：shiyi123"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-700 focus:border-yellow-400"
              />

              <p className="mt-2 text-xs text-zinc-600">
                帳號可使用英文、數字、底線，至少 4 個字元
              </p>
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
                minLength={6}
                placeholder="至少 6 個字元"
                autoComplete="new-password"
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-700 focus:border-yellow-400"
              />
            </div>

            {/* 建立會員 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-yellow-400 px-5 py-3 font-black text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "建立會員中..."
                : "建立免費會員"}
            </button>
          </form>

          {/* 訊息 */}
          {message && (
            <div className="mt-5 rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-sm text-zinc-300">
              {message}
            </div>
          )}

          {/* 登入 */}
          <div className="mt-6 text-center text-sm text-zinc-500">
            已經有帳號？

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="ml-2 font-bold text-yellow-400 transition hover:text-yellow-300"
            >
              登入會員
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}