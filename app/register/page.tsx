"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabase/client";

export default function RegisterPage() {
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("註冊成功，請前往信箱確認帳號。");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-md">

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
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none transition focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="text-sm text-zinc-400">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none transition focus:border-yellow-400"
              />
            </div>

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
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none transition focus:border-yellow-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-yellow-400 px-5 py-3 font-black text-black transition hover:bg-yellow-300 disabled:opacity-50"
            >
              {loading ? "註冊中..." : "建立免費會員"}
            </button>
          </form>

          {message && (
            <div className="mt-5 rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-sm text-zinc-300">
              {message}
            </div>
          )}

          <p className="mt-6 text-center text-sm text-zinc-500">
            已經有帳號？之後會再建立登入頁面
          </p>

        </div>

      </div>
    </main>
  );
}