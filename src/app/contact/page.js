import Link from "next/link";

export const metadata = {
  title: "Contact | Buddy Matcher",
  description: "Contact Buddy Matcher.",
};

export default function ContactPage() {
  return (
    <main className="page-shell">
      <div className="section-wrap">
        <div className="page-card">
          <h1 className="page-title">Contact</h1>

          <div className="page-copy">
            <p>
              Questions, bug reports, feedback, or partnership ideas — get in touch.
            </p>

            <h2>Email</h2>
            <p>
              <a href="mailto:erkan.said22@gmail.com">hello@buddymatcher.co.uk</a>
            </p>

            <h2>What to include</h2>
            <ul>
              <li>What happened</li>
              <li>Which page you were on</li>
              <li>Any screenshot or error message</li>
            </ul>
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