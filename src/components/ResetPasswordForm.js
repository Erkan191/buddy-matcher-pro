"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase, initialRecoveryLink } from "@/supabaseClient";
import { clearPasswordRecovery, getPasswordRecoveryUser, initializePasswordRecovery } from "@/lib/passwordRecovery.mjs";

export default function ResetPasswordForm() {
  const [status, setStatus] = useState("checking");
  const [user, setUser] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const initialization = useRef(null);

  useEffect(() => {
    let active = true;
    // Reuse initialization during React Strict Mode's effect replay.
    initialization.current ??= initializePasswordRecovery(supabase.auth, initialRecoveryLink, window.sessionStorage);
    initialization.current.then((recoveryUser) => {
      if (!active) return;
      setUser(recoveryUser);
      setStatus(recoveryUser ? "ready" : "invalid");
      // Remove unusable email-link fragments too; never include them in analytics.
      if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
    });
    return () => { active = false; };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;
    setError("");
    if (password !== confirmation) {
      setError("Your passwords do not match. Please enter the same password twice.");
      return;
    }
    setLoading(true);
    try {
      const currentUser = await getPasswordRecoveryUser(supabase.auth, window.sessionStorage);
      if (!currentUser || currentUser.id !== user?.id) {
        clearPasswordRecovery(window.sessionStorage);
        setStatus("invalid");
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || "Could not update your password. Please try again.");
        return;
      }
      clearPasswordRecovery(window.sessionStorage);
      setPassword("");
      setConfirmation("");
      setStatus("success");
    } catch {
      setError("Could not connect. Check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <section className="bg-white p-8 rounded-2xl shadow max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2">Set a new password</h1>
        {status === "checking" && <p role="status">Checking your reset link...</p>}
        {status === "invalid" && (
          <div role="alert">
            <p className="text-sm mb-4">This password reset link is invalid or has expired. Request a new link and open the latest email.</p>
            <Link href="/forgot-password" className="text-green-800 underline">Request a new reset link</Link>
          </div>
        )}
        {status === "success" && (
          <div role="status">
            <h2 className="font-semibold mb-2">Password updated</h2>
            <p className="text-sm mb-4">You are signed in. Your Pro access and saved lists remain on this account.</p>
            <Link href="/" className="inline-block bg-green-600 text-white p-3 rounded">Continue to Buddy Matcher</Link>
          </div>
        )}
        {status === "ready" && (
          <form onSubmit={handleSubmit}>
            <p className="text-sm text-zinc-600 mb-6 break-words">Set a new password for <strong>{user.email}</strong>.</p>
            <label htmlFor="new-password" className="block text-sm font-medium mb-2">New password</label>
            <input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password}
              onChange={(event) => setPassword(event.target.value)} className="w-full border p-3 rounded mb-2" />
            <p className="text-sm text-zinc-600 mb-4">Use at least 8 characters.</p>
            <label htmlFor="confirm-password" className="block text-sm font-medium mb-2">Confirm new password</label>
            <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)} className="w-full border p-3 rounded mb-4" />
            {error && <p role="alert" className="text-sm text-red-700 mb-4">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-green-600 text-white p-3 rounded disabled:opacity-50">
              {loading ? "Saving..." : "Save new password"}
            </button>
          </form>
        )}
        <Link href="/login" className="inline-block mt-6 text-sm text-green-800 underline">Back to log in</Link>
      </section>
    </main>
  );
}
