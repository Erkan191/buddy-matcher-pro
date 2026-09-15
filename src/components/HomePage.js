"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BuddyMatcherTool from "@/components/BuddyMatcherTool";
import HomeProSection, { HomeTipSection } from "@/components/HomeProSection";
import { supabase } from "@/supabaseClient";
import { getAccountStatus } from "@/lib/getAccountStatus";
import { teacherResourceLinks } from "@/lib/teacherResourceLinks";

export default function HomePage() {
  const [userEmail, setUserEmail] = useState("");
  const [isPro, setIsPro] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

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
    setNavOpen(false);
  }

  return (
    <main className="site-shell">
     <nav className="site-navbar">
        <div className="section-wrap site-nav-wrap">
          <Link
            href="/"
            className="navbar-brand"
            onClick={() => setNavOpen(false)}
          >
            Buddy Matcher
          </Link>

          <button
            type="button"
            className="nav-toggle"
            aria-label="Toggle navigation"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((prev) => !prev)}
          >
            {navOpen ? "✕" : "☰"}
          </button>

          <div className={`site-nav-links ${navOpen ? "open" : ""}`}>
            <a
              className="site-nav-link"
              href="#tool"
              onClick={() => setNavOpen(false)}
            >
              Tool
            </a>
            <a
              className="site-nav-link"
              href="#features"
              onClick={() => setNavOpen(false)}
            >
              Features
            </a>
            <a
              className="site-nav-link"
              href="#faq"
              onClick={() => setNavOpen(false)}
            >
              FAQ
            </a>
            <a
              className="site-nav-link"
              href="#support"
              onClick={() => setNavOpen(false)}
            >
              Support
            </a>
            <Link
              className="site-nav-link"
              href="/contact"
              onClick={() => setNavOpen(false)}
            >
              Contact
            </Link>

            <a
              className="btn btn-light btn-sm nav-cta"
              href="#tool"
              onClick={() => setNavOpen(false)}
            >
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
                    <Link
                      href="/upgrade"
                      className="btn btn-outline-light btn-sm nav-cta"
                      onClick={() => setNavOpen(false)}
                    >
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
                <Link
                  href="/login"
                  className="btn btn-outline-light btn-sm nav-cta"
                  onClick={() => setNavOpen(false)}
                >
                  Log in
                </Link>
              )
            ) : null}
          </div>
        </div>
      </nav>

      <header className="hero-section">
  <div className="section-wrap hero-wrap hero-layout">
          <div className="hero-copy">
            <div className="hero-badge">Free pairs &amp; trios · No sign-up</div>

            <h1>Random group generator for classes and teams</h1>

            <p className="hero-sub">
  Paste your names and make random pairs or trios in seconds. For regular
  lessons, workshops and clubs, Pro adds larger groups, pairing rules,
  saved lists and a clear Student View for the big screen.
</p>

            <div className="hero-actions">
              <a href="#tool" className="btn btn-success btn-lg">
                Use the tool
              </a>

              <a href="#pro" className="btn btn-outline-success btn-lg">
                Explore Pro
              </a>
            </div>

            <div className="hero-proof">
              Used by teachers, team leaders, workshop hosts, clubs and coaches
            </div>

            <ul className="hero-points">
              <li>30 free group generations each week</li>
              <li>Paste names from Excel or Google Sheets</li>
              <li>Pro helps keep people apart and reduce repeat pairings</li>
              <li>Pro is £3.99 once, with no subscription</li>
            </ul>
          </div>

          <div className="hero-preview" aria-hidden="true">
            <div className="hero-preview-pill">
              <span>🔒</span>
              Your working list stays in your browser
            </div>

            <div className="hero-preview-cards">
              <div className="hero-mini-card">
                <div className="hero-mini-icon">👥</div>
                <div>
                  <h3>Names</h3>
                  <p>
                    Paste or type names, one per line. Supports full classes or team lists.
                  </p>
                </div>
              </div>

              <div className="hero-mini-card">
                <div className="hero-mini-icon">📈</div>
                <div>
                  <h3>Results</h3>
                  <p>
      Make groups in seconds, with no one left on their own. Regenerate or start again.
                  </p>
                </div>
              </div>
            </div>
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
            <h2 className="section-title">Why people use Buddy Matcher</h2>

            <div className="feature-grid">
  <div className="feature-box">
    <h3>Smart group making</h3>
    <p>
      Quickly create balanced pairs, trios or larger groups for lessons,
      activities, workshops, clubs and projects.
    </p>
  </div>

  <div className="feature-box">
    <h3>Random picker</h3>
    <p>
      Pick one person randomly when you need a quick starter, helper, answerer or volunteer.
    </p>
  </div>

  <div className="feature-box">
    <h3>Controlled Pro groups</h3>
    <p>
      Keep certain people apart, avoid repeat pairings and spread named group
      leaders across different groups.
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

      <HomeProSection isPro={isPro} />

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
        <h3>Can I pick one person randomly?</h3>
        <p>
          Yes. Buddy Matcher includes a quick random picker for choosing one person from your list.
        </p>
      </div>

      <div className="faq-item">
        <h3>Can I stop certain people being grouped together?</h3>
        <p>
          Yes. Pro includes a “Don’t group these two” option so you can keep specific pairs apart.
        </p>
      </div>

      <div className="faq-item">
        <h3>Can I assign group leaders?</h3>
        <p>
          Yes. Pro lets you mark group leaders and spread them across different groups.
        </p>
      </div>

      <div className="faq-item">
        <h3>Can I display groups on a projector or interactive whiteboard?</h3>
        <p>
          Yes. Pro includes Student View for showing final groups on your classroom
          screen, with your setup controls hidden. <Link href="/projector-mode" style={{ color: "#17673e", textDecoration: "underline" }}>See the projector mode guide</Link>.
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

      <section className="content-section teacher-resources-home">
        <div className="section-wrap">
          <div className="section-card">
            <h2 className="section-title">Teacher resources</h2>
            <p className="section-lead">
              Practical guides for making student pairs and groups, reducing
              repeat partners, mixing friendship groups and keeping classroom
              grouping quick.
            </p>

            <div className="resource-link-grid">
              {teacherResourceLinks.map((resource) => (
                <Link
                  key={resource.href}
                  href={resource.href}
                  className="resource-link-card"
                >
                  <strong>{resource.title}</strong>
                  <span>{resource.summary}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <HomeTipSection />

      <footer className="site-footer" id="footer">
        <div className="section-wrap footer-wrap">
          <div className="footer-brand">
            <strong>Buddy Matcher</strong>
            <span>Simple group making without the faff.</span>
          </div>

          <div className="footer-links">
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
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
