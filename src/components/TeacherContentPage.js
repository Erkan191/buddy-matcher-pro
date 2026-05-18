import Link from "next/link";
import { getTeacherPageJsonLd } from "@/lib/teacherPageContent";
import { teacherResourceLinks } from "@/lib/teacherResourceLinks";

function ToolCta({ title, text }) {
  return (
    <div className="teacher-cta-card">
      <h2>{title}</h2>
      <p>{text}</p>
      <div className="teacher-cta-actions">
        <Link href="/#tool" className="btn btn-success">
          Open Buddy Matcher
        </Link>
        <Link href="/" className="btn btn-outline-success">
          Back to homepage
        </Link>
      </div>
    </div>
  );
}

export default function TeacherContentPage({ page }) {
  const relatedLinks = teacherResourceLinks.filter(
    (resource) => resource.slug !== page.slug
  );

  return (
    <main className="teacher-content-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getTeacherPageJsonLd(page)),
        }}
      />

      <nav className="site-navbar teacher-navbar">
        <div className="section-wrap site-nav-wrap">
          <Link href="/" className="navbar-brand">
            Buddy Matcher
          </Link>

          <div className="teacher-nav-links">
            <Link href="/teachers" className="site-nav-link">
              Teacher resources
            </Link>
            <Link href="/#tool" className="btn btn-light btn-sm nav-cta">
              Open tool
            </Link>
          </div>
        </div>
      </nav>

      <header className="teacher-hero-section">
        <div className="section-wrap teacher-hero-wrap">
          <div className="teacher-hero-copy">
            <div className="hero-badge">{page.eyebrow}</div>
            <h1>{page.title}</h1>
            {page.intro.map((paragraph) => (
              <p key={paragraph} className="teacher-hero-sub">
                {paragraph}
              </p>
            ))}
            <div className="teacher-hero-actions">
              <Link href="/#tool" className="btn btn-success btn-lg">
                Use the tool
              </Link>
              <Link href="/teachers" className="btn btn-outline-success btn-lg">
                Browse teacher resources
              </Link>
            </div>
          </div>

          <aside className="teacher-hero-panel" aria-label="Page highlights">
            <h2>Good for</h2>
            <ul>
              {page.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </aside>
        </div>
      </header>

      <section className="teacher-main-section">
        <div className="section-wrap teacher-main-grid">
          <article className="teacher-article">
            {page.sections.map((section) => (
              <section key={section.heading} className="teacher-article-block">
                <h2>{section.heading}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.bullets ? (
                  <ul>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </article>

          <aside className="teacher-sidebar">
            <ToolCta title={page.ctaTitle} text={page.ctaText} />

            <div className="teacher-related-card">
              <h2>Related teacher resources</h2>
              <div className="teacher-related-list">
                {relatedLinks.map((resource) => (
                  <Link key={resource.href} href={resource.href}>
                    <strong>{resource.title}</strong>
                    <span>{resource.summary}</span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="teacher-use-section">
        <div className="section-wrap">
          <div className="teacher-use-wrap">
            <div>
              <h2>Teacher use cases</h2>
              <p>
                These pages focus on classrooms, but Buddy Matcher also works
                for clubs, workshops, training sessions, tutoring groups and
                teams.
              </p>
            </div>
            <ul className="teacher-use-list">
              {page.useCases.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="teacher-bottom-section">
        <div className="section-wrap">
          <ToolCta title={page.bottomCtaTitle} text={page.ctaText} />
        </div>
      </section>
    </main>
  );
}
