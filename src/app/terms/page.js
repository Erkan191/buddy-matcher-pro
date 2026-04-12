import Link from "next/link";

export const metadata = {
  title: "Terms | Buddy Matcher",
  description: "Buddy Matcher terms.",
};

export default function TermsPage() {
  return (
    <main className="page-shell">
      <div className="section-wrap">
        <div className="page-card">
          <h1 className="page-title">Terms</h1>

          <div className="page-copy">
            <p>
              By using Buddy Matcher, you agree to use the service responsibly and lawfully.
            </p>

            <h2>Use of the service</h2>
            <p>
              You may use Buddy Matcher to generate pairs and groups for classes, teams, events, workshops and similar purposes.
            </p>

            <h2>Accounts and Pro</h2>
            <p>
              Some features require an account and an active Pro purchase.
            </p>

            <h2>Availability</h2>
            <p>
              The service is provided as-is. Features may change, improve or be removed over time.
            </p>

            <h2>Acceptable use</h2>
            <p>
              Do not use the service for unlawful, abusive or harmful purposes.
            </p>

            <h2>Contact</h2>
            <p>
              Questions about these terms can be sent to{" "}
              <a href="mailto:hello@buddymatcher.co.uk">hello@buddymatcher.co.uk</a>.
            </p>
          </div>

          <div className="page-actions">
            <Link href="/" className="btn btn-success">
              Back to Buddy Matcher
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}