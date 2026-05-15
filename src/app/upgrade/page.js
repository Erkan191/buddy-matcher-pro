"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

export default function UpgradePage() {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    void trackUsageEvent("upgrade_page_view", {
      path: window.location.pathname,
    });
  }, []);

  async function handleUpgrade() {
    try {
      setIsLoading(true);
      const sessionId = getSessionId();

      await trackUsageEvent("checkout_clicked", {
        source: "upgrade_page",
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login?next=/upgrade&source=upgrade_page";
        return;
      }

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          sessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.url) {
        throw new Error(data?.error || "Could not start checkout.");
      }

      await trackUsageEvent(
        "checkout_redirect_started",
        {
          source: "upgrade_page",
        },
        user.id
      );

      window.location.href = data.url;
    } catch (error) {
      console.error(error);
      await trackUsageEvent("checkout_error", {
        source: "upgrade_page",
        message: error.message,
      });
      alert("Could not start checkout. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <main className="upgrade-page">
      <div className="upgrade-wrap">
        {/* HEADER */}
        <h1>Make controlled groups without the extra admin</h1>

        <p className="upgrade-sub">
          Buddy Matcher Pro turns quick random grouping into a smarter group maker.
        </p>

        {/* PROBLEM */}
        <div className="upgrade-section">
          <h2>The problem</h2>
          <ul>
            <li>Same people keep ending up together</li>
            <li>You have to manually keep certain people apart</li>
            <li>Some groups need leaders spread out fairly</li>
            <li>Grouping takes longer than it should</li>
          </ul>
        </div>

        {/* SOLUTION */}
        <div className="upgrade-section highlight">
          <h2>The solution</h2>
          <p>
            Buddy Matcher Pro helps you keep certain people apart, avoid repeat
            pairings and spread leaders while still keeping the speed of random generation.
          </p>
        </div>

        {/* FEATURES */}
        <div className="upgrade-section">
          <h2>What you get</h2>

          <ul className="upgrade-features">
            <li>🚫 Don’t group specific people together</li>
            <li>🔁 Avoid repeat pairings where possible</li>
            <li>⭐ Assign and spread group leaders</li>
            <li>💾 Save and reuse lists</li>
            <li>👥 Groups of 4, 5, 6 and custom sizes</li>
            <li>📄 Export to CSV and print clean layouts</li>
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
