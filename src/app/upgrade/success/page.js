"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";

const CHECK_WINDOW_MS = 60_000;
const CHECK_INTERVAL_MS = 3_000;
const REQUEST_TIMEOUT_MS = 15_000;

const messages = {
  checking: {
    badge: "Checking your upgrade",
    title: "Confirming your payment",
    description: "Please wait while we check your payment and Pro access.",
  },
  active: {
    badge: "Payment received",
    title: "Thank you",
    description: "Your payment is confirmed. You now have Buddy Matcher Pro.",
  },
  pending: {
    badge: "Payment pending",
    title: "Your payment is still being confirmed",
    description:
      "Some payment methods take a little longer. You do not need to pay again while this payment is being confirmed.",
  },
  unpaid: {
    badge: "Payment not completed",
    title: "Your upgrade is not complete yet",
    description:
      "This checkout has not completed a payment. You can return to the upgrade page to try again.",
  },
  expired: {
    badge: "Checkout expired",
    title: "This checkout has expired",
    description:
      "This checkout expired without a confirmed payment. You can start a new checkout from the upgrade page.",
  },
  login: {
    badge: "Sign in required",
    title: "Sign in to check your upgrade",
    description:
      "Use the Buddy Matcher account you used at checkout. We will bring you back here to confirm your payment and Pro access.",
  },
  missing: {
    badge: "Checkout details missing",
    title: "We need your checkout details",
    description:
      "This page is missing its checkout reference. Open the link you returned to after checkout, or email me for help checking your upgrade.",
  },
  unavailable: {
    badge: "Checkout not found",
    title: "We could not find this checkout for your account",
    description:
      "Sign in with the account you used at checkout, or email me for help checking your upgrade.",
  },
  error: {
    badge: "Unable to confirm yet",
    title: "We could not confirm your upgrade just now",
    description: "Please check again, or email me if you need help. If you already submitted payment, wait for confirmation before paying again.",
  },
};

export default function UpgradeSuccessPage() {
  const [attempt, setAttempt] = useState(0);
  const [view, setView] = useState({ status: "checking", busy: true });

  useEffect(() => {
    let cancelled = false;
    let timedOut = false;
    let lastStatus = "checking";
    let pollTimer;
    let requestTimer;
    let controller;
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    const loginHref = `/login?next=${encodeURIComponent(
      `${window.location.pathname}${window.location.search}`
    )}`;

    function update(status, busy = false) {
      if (!cancelled && !timedOut) {
        lastStatus = status;
        setView({ status, busy, loginHref });
      }
    }

    // Bound the whole check, including authentication and any pending requests.
    const deadlineTimer = window.setTimeout(() => {
      timedOut = true;
      window.clearTimeout(pollTimer);
      window.clearTimeout(requestTimer);
      controller?.abort();
      if (!cancelled) {
        setView({
          status: lastStatus === "pending" ? "pending" : "error",
          busy: false,
          loginHref,
        });
      }
    }, CHECK_WINDOW_MS);

    async function checkStatus() {
      if (cancelled || timedOut) return;

      if (!sessionId) {
        window.clearTimeout(deadlineTimer);
        update("missing");
        return;
      }

      try {
        const { data, error } = await supabase.auth.getSession();
        if (cancelled || timedOut) return;
        if (error) throw error;

        if (!data.session?.access_token) {
          window.clearTimeout(deadlineTimer);
          update("login");
          return;
        }

        controller = new AbortController();
        requestTimer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        const response = await fetch("/api/stripe/status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify({ sessionId }),
          cache: "no-store",
          signal: controller.signal,
        });
        if (cancelled || timedOut) return;

        if (response.status === 401 || response.status === 404) {
          window.clearTimeout(deadlineTimer);
          update(response.status === 401 ? "login" : "unavailable");
          return;
        }
        if (!response.ok) throw new Error("Could not check payment status.");

        const result = await response.json();
        if (cancelled || timedOut) return;
        if (!["active", "pending", "unpaid", "expired"].includes(result?.status)) {
          throw new Error("Unrecognised payment status.");
        }

        update(result.status, result.status === "pending");
        if (result.status === "pending") {
          // Schedule only after this request finishes so checks never overlap.
          pollTimer = window.setTimeout(checkStatus, CHECK_INTERVAL_MS);
        } else {
          window.clearTimeout(deadlineTimer);
        }
      } catch {
        if (!cancelled && !timedOut) {
          window.clearTimeout(deadlineTimer);
          update("error");
        }
      } finally {
        window.clearTimeout(requestTimer);
      }
    }

    pollTimer = window.setTimeout(checkStatus, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(deadlineTimer);
      window.clearTimeout(pollTimer);
      window.clearTimeout(requestTimer);
      controller?.abort();
    };
  }, [attempt]);

  const message = messages[view.status];
  const needsLogin = view.status === "login" || view.status === "unavailable";
  const canRetry = !view.busy && ["pending", "unpaid", "error"].includes(view.status);

  function checkAgain() {
    setView({ status: "checking", busy: true });
    setAttempt((value) => value + 1);
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-16">
      <div className="mx-auto max-w-2xl rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div role="status" aria-live="polite" aria-atomic="true">
          <div
            className={`mb-3 inline-block rounded-full px-3 py-1 text-sm font-medium ${
              view.status === "active"
                ? "bg-green-100 text-green-700"
                : "bg-zinc-100 text-zinc-700"
            }`}
          >
            {message.badge}
          </div>
          <h1 className="text-4xl font-bold">{message.title}</h1>
          <p className="mt-4 text-lg text-zinc-600">{message.description}</p>
          {view.status === "pending" && (
            <p className="mt-3 text-sm text-zinc-600">
              {view.busy
                ? "We will keep checking for up to a minute."
                : "You can check again shortly using the button below."}
            </p>
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {needsLogin && (
            <Link
              href={view.loginHref}
              className="rounded-xl bg-green-600 px-5 py-3 font-medium text-white hover:bg-green-700"
            >
              Sign in to check
            </Link>
          )}
          {canRetry && (
            <button
              type="button"
              onClick={checkAgain}
              className="rounded-xl bg-green-600 px-5 py-3 font-medium text-white hover:bg-green-700"
            >
              Check again
            </button>
          )}
          <Link
            href="/"
            className={`rounded-xl px-5 py-3 font-medium ${
              view.status === "active"
                ? "bg-green-600 text-white hover:bg-green-700"
                : "border border-zinc-300 hover:bg-zinc-50"
            }`}
          >
            Back to Buddy Matcher
          </Link>
          {view.status !== "active" && view.status !== "pending" && (
            <Link
              href="/upgrade"
              className="rounded-xl border border-zinc-300 px-5 py-3 font-medium hover:bg-zinc-50"
            >
              Back to upgrade page
            </Link>
          )}
        </div>

        {view.status !== "active" && (
          <p className="mt-6 text-sm text-zinc-600">
            Need a hand?{" "}
            <a className="underline hover:text-zinc-900" href="mailto:erkan.said22@gmail.com">
              Email me
            </a>{" "}
            and I’ll help.
          </p>
        )}
      </div>
    </main>
  );
}
