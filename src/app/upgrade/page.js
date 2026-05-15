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
      <nav className="site-navbar">
        <div className="section-wrap site-nav-wrap">
          <Link href="/" className="navbar-brand">
            Buddy Matcher
          </Link>

          <Link href="/" className="btn btn-outline-light btn-sm nav-cta">
            Back to tool
          </Link>
        </div>
      </nav>

      <div className="section-wrap upgrade-wrap">
        <section className="upgrade-hero">
          <div className="upgrade-copy">
            <div className="hero-badge">Buddy Matcher Pro</div>

            <h1>Make controlled groups without the extra admin</h1>

            <p className="upgrade-sub">
              Keep certain people apart, avoid repeat pairings, spread leaders
              and save reusable lists while keeping the speed of random generation.
            </p>

            <div className="hero-proof">
              Built for classrooms, teams, workshops, clubs and coaches
            </div>
          </div>

          <div className="price-box">
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
        </section>

        <section className="upgrade-section highlight">
          <h2>Why upgrade?</h2>
          <ul>
            <li>Same people keep ending up together</li>
            <li>You have to manually keep certain people apart</li>
            <li>Some groups need leaders spread out fairly</li>
            <li>Grouping takes longer than it should</li>
          </ul>
        </section>

        <section className="upgrade-section">
          <h2>What you get</h2>

          <ul className="upgrade-features">
            <li>
              <strong>Do not group these two</strong>
              <span>Keep specific people apart when needed.</span>
            </li>
            <li>
              <strong>Avoid repeat pairings</strong>
              <span>Reduce the chance of the same people ending up together.</span>
            </li>
            <li>
              <strong>Spread group leaders</strong>
              <span>Assign leaders and distribute them across groups.</span>
            </li>
            <li>
              <strong>Save reusable lists</strong>
              <span>Load regular classes, teams or clubs without retyping.</span>
            </li>
            <li>
              <strong>Flexible group sizes</strong>
              <span>Use groups of 4, 5, 6 or custom sizes.</span>
            </li>
            <li>
              <strong>Export and print</strong>
              <span>Download CSVs or print clean layouts when needed.</span>
            </li>
          </ul>
        </section>

        <section className="upgrade-footer-note">
          <p className="trust">
            Account creation is free. Pro unlocks after the one-off payment.
          </p>

          <Link href="/" className="back-link">
            Back to Buddy Matcher
          </Link>
        </section>
      </div>
    </main>
  );
}
