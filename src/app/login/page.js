"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleSignup() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteUrl}/`,
      },
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data.session) {
      router.push("/");
      router.refresh();
      return;
    }

    setMessage(
      "Account created. If you are not logged in straight away, check your email to confirm your account."
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="bg-white p-8 rounded-2xl shadow max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2">Log in</h1>
        <p className="text-sm text-zinc-600 mb-6">
          Use email and password. No magic link needed every time.
        </p>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            className="w-full border p-3 rounded mb-4"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full border p-3 rounded mb-4"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white p-3 rounded mb-3 disabled:opacity-50"
          >
            {loading ? "Working..." : "Log in"}
          </button>
        </form>

        <button
          type="button"
          disabled={loading}
          onClick={handleSignup}
          className="w-full border border-zinc-300 p-3 rounded disabled:opacity-50"
        >
          {loading ? "Working..." : "Create account"}
        </button>

        {message && <p className="mt-4 text-sm">{message}</p>}
      </div>
    </main>
  );
}