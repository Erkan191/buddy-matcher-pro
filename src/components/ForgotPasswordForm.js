"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/supabaseClient";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: new URL("/reset-password", process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).href,
      });
      if (resetError) {
        setError(resetError.status === 429
          ? "Please wait a minute before requesting another reset email."
          : "We could not send the reset email. Please try again, or contact us for help.");
        return;
      }
      setSent(true);
    } catch {
      setError("Could not connect. Check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <section className="bg-white p-8 rounded-2xl shadow max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2">Forgot your password?</h1>
        <p className="text-sm text-zinc-600 mb-6">
          Enter the email you used to create your Buddy Matcher account. It may be different from your payment email.
        </p>
        {sent ? (
          <div role="status" className="mb-6">
            <h2 className="font-semibold mb-2">Check your email</h2>
            <p className="text-sm">If an account exists for that email, you will receive a link to set a new password. Check your spam folder too.</p>
            <p className="text-sm mt-3">Your existing Pro access and saved lists will stay with your account. You do not need to pay again.</p>
            <button type="button" className="mt-4 text-green-800 underline" onClick={() => setSent(false)}>Try a different email</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label htmlFor="reset-email" className="block text-sm font-medium mb-2">Account email</label>
            <input id="reset-email" type="email" autoComplete="email" required value={email}
              onChange={(event) => setEmail(event.target.value)} className="w-full border p-3 rounded mb-4" />
            <button type="submit" disabled={loading} className="w-full bg-green-600 text-white p-3 rounded mb-4 disabled:opacity-50">
              {loading ? "Sending..." : "Send password reset link"}
            </button>
          </form>
        )}
        {error && <p role="alert" className="text-sm text-red-700 mb-4">{error}</p>}
        <div className="flex justify-between gap-4 text-sm">
          <Link href="/login" className="text-green-800 underline">Back to log in</Link>
          <Link href="/contact" className="text-green-800 underline">Contact us</Link>
        </div>
      </section>
    </main>
  );
}
