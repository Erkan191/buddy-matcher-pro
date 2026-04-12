"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BuddyMatcherTool from "@/components/BuddyMatcherTool";
import { supabase } from "@/supabaseClient";
import { getAccountStatus } from "@/lib/getAccountStatus";

export default function HomePage() {
  const [userEmail, setUserEmail] = useState("");
  const [isPro, setIsPro] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function refreshAccountStatus() {
      try {
        const { email, isPro } = await getAccountStatus();

        if (!mounted) return;

        setUserEmail(email || "");
        setIsPro(!!isPro);
        setAuthReady(true);
      } catch (error) {
        console.error("Failed to load account status:", error);

        if (!mounted) return;

        setUserEmail("");
        setIsPro(false);
        setAuthReady(true);
      }
    }

    void refreshAccountStatus();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => {
        void refreshAccountStatus();
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUserEmail("");
    setIsPro(false);
    setAuthReady(true);
  }

  return (
    <main className="site-shell">
      <nav className="site-navbar">
        <div className="section-wrap site-nav-wrap">
          <Link href="/" className="navbar-brand">
            Buddy Matcher
          </Link>

          <div className="site-nav-links">
            <a className="site-nav-link" href="#tool">
              Tool
            </a>
            <a className="site-nav-link" href="#features">
              Features
            </a>
            <a className="site-nav-link" href="#faq">
              FAQ
            </a>
            <a className="site-nav-link" href="#support">
              Support
            </a>
            <a className="site-nav-link" href="#footer">
              Contact
            </a>

            <a className="btn btn-light btn-sm nav-cta" href="#tool">
              Open tool
            </a>

            {authReady ? (
              userEmail ? (
                <>
                  <span className="site-nav-link auth-text">
                    Logged in as: {userEmail}
                  </span>

                  {isPro ? (
                    <span className="site-nav-link auth-text">Pro</span>
                  ) : (
                    <Link href="/upgrade" className="btn btn-outline-light btn-sm nav-cta">
                      Go Pro
                    </Link>
                  )}

                  <button
                    type="button"
                    className="btn btn-outline-light btn-sm nav-cta"
                    onClick={handleLogout}
                  >
                    Log out
                  </button>
                </>
              ) : (
                <Link href="/login" className="btn btn-outline-light btn-sm nav-cta">
                  Log in
                </Link>
              )
            ) : null}
          </div>
        </div>
      </nav>

      <header className="hero-section">
        <div className="section-wrap hero-wrap">
          <div className="hero-copy">
            <div className="hero-badge">Free · Fast · Private</div>

            <h1>Random pair generator for names, teams and classrooms</h1>

            <p className="hero-sub">
              Paste names, choose group size, and create random pairs or groups instantly.
              No sign-up. No faff. Works right in your browser.
            </p>

            <div className="hero-actions">
              <a href="#tool" className="btn btn-success btn-lg">
                Use the tool
              </a>

              <a href="#support" className="btn btn-outline-success btn-lg">
                Support / Pro
              </a>
            </div>

            <ul className="hero-points">
              <li>Paste from Excel or Google Sheets</li>
              <li>Pairs, trios, or larger groups</li>
              <li>Handles awkward leftovers automatically</li>
              <li>Pro unlocks custom sizes, export and more</li>
            </ul>
          </div>
        </div>
      </header>

      <section id="tool" className="tool-section">
        <div className="section-wrap">
          <BuddyMatcherTool
            isPro={isPro}
            authReady={authReady}
            isLoggedIn={!!userEmail}
          />
        </div>
      </section>

      <section id="features" className="content-section">
        <div className="section-wrap">
          <div className="section-card">
            <h2 className="section-title">Why people use it</h2>

            <div className="feature-grid">
              <div className="feature-box">
                <h3>Classrooms</h3>
                <p>
                  Quickly create random student pairs, trios or groups for activities,
                  discussions and projects.
                </p>
              </div>

              <div className="feature-box">
                <h3>Workshops</h3>
                <p>
                  Split people into fair groups for training sessions, coffee chats,
                  team-building and breakout tasks.
                </p>
              </div>

              <div className="feature-box">
                <h3>Events</h3>
                <p>
                  Useful for quiz nights, icebreakers, clubs, youth groups and any event
                  where people need mixing up fast.
                </p>
              </div>

              <div className="feature-box">
                <h3>Simple and private</h3>
                <p>
                  No accounts for the free tool, no spreadsheet fiddling, and paid features
                  only when you want them.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="support" className="content-section support-section">
        <div className="section-wrap">
          <div className="section-card">
            <h2 className="section-title">Support Buddy Matcher</h2>

            <p className="section-lead">
              If this tool saves you time, you can support it below. That helps keep it
              online and nudges it from “little practice project” into “nice bit of beer money”.
            </p>

            <div className="support-grid">
              <div className="support-box">
                <h3>Buy me a coffee</h3>
                <p>Lowest-friction option. Good for people who just want to say thanks.</p>

                <a
                  href="https://buymeacoffee.com/buddyup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-warning"
                >
                  Tip via Buy Me a Coffee
                </a>
              </div>

              <div className="support-box support-box-pro">
                <h3>Buddy Matcher Pro</h3>
                <p>
                  Groups of 4+, custom sizes, export CSV, print mode, saved lists and
                  no-repeat pairing history.
                </p>

                <Link href="/upgrade" className="btn btn-success">
                  Get Pro – £3.99 one-off
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="content-section">
        <div className="section-wrap">
          <div className="section-card">
            <h2 className="section-title">FAQ</h2>

            <div className="faq-item">
              <h3>Can I paste names from Excel or Google Sheets?</h3>
              <p>
                Yes. Paste one column of names straight into the box and Buddy Matcher will
                split them into groups.
              </p>
            </div>

            <div className="faq-item">
              <h3>What happens if the numbers do not divide evenly?</h3>
              <p>
                It balances the final groups so you do not end up with one lonely person left
                on their own.
              </p>
            </div>

            <div className="faq-item">
              <h3>Do I need an account?</h3>
              <p>No. It works instantly in your browser. No sign-up needed for the free tool.</p>
            </div>

            <div className="faq-item">
              <h3>Is it private?</h3>
              <p>
                Yes. Names are stored in your browser using local storage unless and until
                you choose account-based Pro features.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="site-footer" id="footer">
        <div className="section-wrap footer-wrap">
          <div className="footer-brand">
            <strong>Buddy Matcher</strong>
            <span>Simple random groups without the faff.</span>
          </div>

          <div className="footer-links">
            <a href="#footer">Contact</a>
            <a href="#footer">Privacy</a>
            <a href="#footer">Terms</a>
            <a
              href="https://buymeacoffee.com/buddyup"
              target="_blank"
              rel="noopener noreferrer"
            >
              Buy me a coffee
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}