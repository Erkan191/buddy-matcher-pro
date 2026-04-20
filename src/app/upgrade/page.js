"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/supabaseClient";

export default function UpgradePage() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleUpgrade() {
    try {
      setIsLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.url) {
        throw new Error(data?.error || "Could not start checkout.");
      }

      window.location.href = data.url;
    } catch (error) {
      console.error(error);
      alert("Could not start checkout. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <main className="upgrade-page">
      <div className="upgrade-wrap">
        {/* HEADER */}
        <h1>Stop wasting time grouping people</h1>

        <p className="upgrade-sub">
          Buddy Matcher Pro gives you control — not just randomness.
        </p>

        {/* PROBLEM */}
        <div className="upgrade-section">
          <h2>The problem</h2>
          <ul>
            <li>Same people always end up together</li>
            <li>You have to manually separate certain students</li>
            <li>Some groups lack structure or leadership</li>
            <li>Grouping takes longer than it should</li>
          </ul>
        </div>

        {/* SOLUTION */}
        <div className="upgrade-section highlight">
          <h2>The solution</h2>
          <p>
            Buddy Matcher Pro lets you quickly create fair, controlled groups in seconds —
            while still keeping the speed of random generation.
          </p>
        </div>

        {/* FEATURES */}
        <div className="upgrade-section">
          <h2>What you get</h2>

          <ul className="upgrade-features">
            <li>🚫 Don’t group specific people together</li>
            <li>⭐ Assign and spread group leaders</li>
            <li>👥 Groups of 4, 5, 6 and custom sizes</li>
            <li>💾 Save and reuse class lists</li>
            <li>📄 Export to CSV</li>
            <li>🖨 Print clean group layouts</li>
          </ul>
        </div>

        {/* PRICE */}
        <div className="upgrade-section price-box">
          <h2>Simple pricing</h2>

          <p className="price">
            £3.99 <span>one-off</span>
          </p>

          <p className="price-sub">
            No subscription. Pay once and use it forever.
          </p>

          <button
  className="btn btn-success btn-lg"
  onClick={handleUpgrade}
  disabled={isLoading}
>
  {isLoading ? "Loading checkout..." : "Upgrade to Pro"}
</button>
        </div>

        {/* TRUST */}
        <div className="upgrade-section">
          <p className="trust">
            Built for real classroom use. No fluff. Just faster grouping.
          </p>

          <Link href="/" className="back-link">
            ← Back to tool
          </Link>
        </div>
      </div>
    </main>
  );
}