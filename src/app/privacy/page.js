import Link from "next/link";

export const metadata = {
  title: "Privacy | Buddy Matcher",
  description: "Buddy Matcher privacy information.",
};

export default function PrivacyPage() {
  return (
    <main className="page-shell">
      <div className="section-wrap">
        <div className="page-card">
          <h1 className="page-title">Privacy</h1>

          <div className="page-copy">
            <p>
              Buddy Matcher is designed to be simple and lightweight.
            </p>

            <h2>Free tool</h2>
            <p>
              Names you type into the free tool are stored in your browser so the app can remember them for you on that device.
            </p>

            <h2>Accounts</h2>
            <p>
              If you create an account, your login details are handled through Supabase authentication.
            </p>

            <h2>Pro features</h2>
            <p>
              Saved Pro lists are stored against your account so you can load them again later.
            </p>

            <h2>Payments</h2>
            <p>
              Payments are handled by Stripe. Buddy Matcher does not store your full card details.
            </p>

            <h2>Contact</h2>
            <p>
              For privacy questions, email{" "}
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