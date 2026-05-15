"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/supabaseClient";

function getSessionId() {
  if (typeof window === "undefined") return "";

  let sessionId = window.localStorage.getItem("bm_session_id");

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    window.localStorage.setItem("bm_session_id", sessionId);
  }

  return sessionId;
}

function getSafeNextPath(value) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.includes("\\")) return "/";

  try {
    const url = new URL(value, "http://local");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

async function trackUsageEvent(eventType, metadata = {}, userId) {
  try {
    const sessionId = getSessionId();
    if (!sessionId) return;

    let resolvedUserId = userId;

    if (resolvedUserId === undefined) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      resolvedUserId = user?.id ?? null;
    }

    await supabase.from("usage_events").insert({
      event_type: eventType,
      session_id: sessionId,
      user_id: resolvedUserId ?? null,
      metadata,
    });
  } catch (error) {
    console.error("Could not track usage event:", error);
  }
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const nextPath = getSafeNextPath(searchParams.get("next"));
  const source = searchParams.get("source") || "direct";
  const isUpgradeFlow = nextPath === "/upgrade";

  useEffect(() => {
    void trackUsageEvent("login_page_view", {
      next: nextPath,
      source,
      is_upgrade_flow: isUpgradeFlow,
    });
  }, [isUpgradeFlow, nextPath, source]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    await trackUsageEvent(
      "login_success",
      {
        next: nextPath,
        source,
        is_upgrade_flow: isUpgradeFlow,
      },
      data.user?.id
    );

    router.push(nextPath);
    router.refresh();
  }

  async function handleSignup() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteUrl.replace(
          /\/$/,
          ""
        )}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    await trackUsageEvent(
      "signup_success",
      {
        next: nextPath,
        source,
        is_upgrade_flow: isUpgradeFlow,
        requires_email_confirmation: !data.session,
      },
      data.user?.id
    );

    if (data.session) {
      router.push(nextPath);
      router.refresh();
      return;
    }

    setMessage(
      isUpgradeFlow
        ? "Account created for free. Check your email to confirm it, then you will continue to Pro. Pro still costs £3.99 one-off."
        : "Account created. If you are not logged in straight away, check your email to confirm your account."
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="bg-white p-8 rounded-2xl shadow max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2">Log in</h1>
        <p className="text-sm text-zinc-600 mb-6">
          {isUpgradeFlow
            ? "Create a free account or log in first. Pro still costs £3.99 one-off, and you will continue to the upgrade page next."
            : "Use email and password. No magic link needed every time."}
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
          {loading ? "Working..." : "Create free account"}
        </button>

        {message && <p className="mt-4 text-sm">{message}</p>}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-zinc-50">
          <div className="bg-white p-8 rounded-2xl shadow max-w-md w-full">
            <h1 className="text-2xl font-bold mb-2">Log in</h1>
            <p className="text-sm text-zinc-600">Loading...</p>
          </div>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
