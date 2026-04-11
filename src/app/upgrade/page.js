"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabaseClient";

export default function UpgradePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleCheckout() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      router.push("/login");
      return;
    }

    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: user.id }),
    });

    const data = await response.json();

    setLoading(false);

    if (!response.ok) {
      setMessage(data.error || "Could not start checkout");
      return;
    }

    window.location.href = data.url;
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-16">
      <div className="mx-auto max-w-2xl rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-3 inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
          Buddy Matcher Pro
        </div>

        <h1 className="text-4xl font-bold">Go Pro</h1>

        <p className="mt-4 text-lg text-zinc-600">
          Unlock larger groups, custom sizes, export, print mode, saved lists and more.
        </p>

        <ul className="mt-6 list-disc space-y-2 pl-5 text-zinc-700">
          <li>Groups of 4, 5, 6 and custom sizes</li>
          <li>Saved named lists</li>
          <li>No-repeat pairing history</li>
          <li>CSV export</li>
          <li>Print / presentation mode</li>
        </ul>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleCheckout}
            disabled={loading}
            className="rounded-xl bg-green-600 px-5 py-3 font-medium text-white disabled:opacity-50"
          >
            {loading ? "Opening checkout..." : "Buy Pro"}
          </button>

          <Link
            href="/"
            className="rounded-xl border border-zinc-300 px-5 py-3 font-medium hover:bg-zinc-50"
          >
            Back to free tool
          </Link>
        </div>

        {message && <p className="mt-4 text-sm text-red-600">{message}</p>}
      </div>
    </main>
  );
}