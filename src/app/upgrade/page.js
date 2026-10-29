"use client";
import { getSessionId, trackUsageEvent } from "@/lib/usageAnalytics";

import Link from "next/link";
import { getAttribution } from "@/lib/attribution.mjs";
import { proFeatures } from "@/lib/proFeatures";
import BrandLogo from "@/components/BrandLogo";
import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";

export default function UpgradePage() {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    void trackUsageEvent("upgrade_page_view", {
      path: window.location.pathname,
    });
    if (new URLSearchParams(window.location.search).get("checkout") === "cancelled") {
      void trackUsageEvent("checkout_cancel_return", { source: "stripe_checkout" });
    }
  }, []);

  async function handleUpgrade() {
    try {
      setIsLoading(true);
      const sessionId = getSessionId();

      await trackUsageEvent("checkout_clicked", {
        source: "upgrade_page",
      });

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          sessionId,
          attribution: getAttribution(),
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        throw new Error("Your sign-in expired. Refresh the page and try again.");
      }
      if (response.status === 409 && data.status === "active") {
        window.location.href = "/";
        return;
      }

      if (!response.ok || !data?.url) {
        throw new Error(data?.error || "Could not start checkout.");
      }

      await trackUsageEvent(
        "checkout_redirect_started",
        {
          source: "upgrade_page",
        },
        session?.user?.id
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
            <BrandLogo />
          </Link>

          <Link href="/" className="btn btn-outline-light btn-sm nav-cta">
            Back to tool
          </Link>
        </div>
      </nav>

      <div className="section-wrap upgrade-wrap">
        <section className="upgrade-hero conversion-hero">
          <div className="upgrade-copy">
            <div className="hero-badge">Buddy Matcher Pro</div>
            <h1>Better pairings.<br />Less lesson prep.</h1>
            <p className="conversion-price">£3.99 once · no subscription</p>
            <ul className="conversion-benefits">
              <li><strong>Keep certain students apart</strong><span>“Don’t group these two” puts you in control.</span></li>
              <li><strong>Avoid repeat pairings</strong><span>Give students a different partner next time.</span></li>
              <li><strong>Save class lists</strong><span>Get ready for the next lesson without retyping.</span></li>
            </ul>
            <button className="btn btn-success btn-lg" onClick={handleUpgrade} disabled={isLoading}>
              {isLoading ? "Loading checkout..." : "Get Pro for £3.99"}
            </button>
            <p className="conversion-note">Pay securely first. Create or sign in to your free account after payment to unlock Pro.</p>
          </div>
        </section>

        <section className="upgrade-section">
          <h2>More control for your everyday groups</h2>
          <p>Avoid repeats uses the last grouping you explicitly marked as used for these names in this browser. It reduces repeats where possible.</p>
          <ul className="upgrade-features">
            {proFeatures.slice(3).map(feature => <li key={feature.title}><strong>{feature.title}</strong><span>{feature.text}</span></li>)}
          </ul>
        </section>
        <section className="upgrade-section">
          <h2>Having trouble paying?</h2>
          <p>Try another card, try again later, or <a href="mailto:erkan.said22@gmail.com">email me</a> and I’ll help.</p>
        </section>

        <section className="upgrade-footer-note">
          <p className="trust">
            No account is needed before payment. After paying, use the same email to create or sign in to your free account and unlock Pro.
          </p>

          <Link href="/" className="back-link">
            Back to Buddy Matcher
          </Link>
        </section>
      </div>
    </main>
  );
}
