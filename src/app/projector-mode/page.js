import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import styles from "./page.module.css";

const title = "Classroom Projector Mode & Student View";
const description =
  "Show student groups on your classroom projector with Buddy Matcher Pro. Student View displays group names without teacher controls, with optional fullscreen.";
const url = "https://www.buddymatcher.co.uk/projector-mode";

export const metadata = pageMetadata({ title, description, path: "/projector-mode" });

const exampleGroups = [
  ["Amira", "Leo", "Sofia"],
  ["Noah", "Priya", "Oscar"],
  ["Maya", "Ethan", "Isla"],
  ["Ava", "Yusuf", "Lily"],
];

const relatedResources = [
  {
    href: "/random-student-group-generator",
    title: "Create student groups",
    text: "Start with a class list and choose a group size for your lesson.",
  },
  {
    href: "/avoid-repeat-student-pairings",
    title: "Keep partners changing",
    text: "Use pairing history to reduce repeats across classroom activities.",
  },
  {
    href: "/classroom-pairing-strategies",
    title: "Plan your next activity",
    text: "Explore pairing strategies for discussion, projects and teamwork.",
  },
];

export default function ProjectorModePage() {
  return (
    <div className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Buddy Matcher",
                item: "https://www.buddymatcher.co.uk/",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Projector Mode",
                item: url,
              },
            ],
          }),
        }}
      />

      <nav className={styles.nav} aria-label="Main navigation">
        <div className={styles.navInner}>
          <Link href="/" className={styles.brand}>
            Buddy Matcher
          </Link>
          <div className={styles.navLinks}>
            <Link href="/teachers" className={styles.resourceLink}>
              Teacher resources
            </Link>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Document navigation avoids stale hash fragments when returning to the tool. */}
            <a href="/#tool" className={styles.navButton}>
              Open tool <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </nav>

      <main className={styles.main}>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Projector Mode · Included with Pro</p>
            <h1>Put your classroom groups on the big screen.</h1>
            <p className={styles.intro}>
              Groups ready? Open <strong>Student View</strong> to give the class
              a clear view of who is working together. Just the final groups,
              with your setup controls tucked away.
            </p>
            <div className={styles.actions}>
              <Link href="/upgrade" className={styles.primaryButton}>
                Get Pro — £3.99 once
              </Link>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Document navigation avoids stale hash fragments when returning to the tool. */}
              <a href="/#tool" className={styles.textLink}>
                Open the group generator <span aria-hidden="true">→</span>
              </a>
            </div>
            <p className={styles.smallNote}>
              Already have Pro? Generate your groups, then choose Student View.
            </p>
          </div>

          <figure className={styles.preview}>
            <div className={styles.previewScreen}>
              <div className={styles.previewHeading}>
                <div>
                  <span className={styles.previewTitle}>Student View</span>
                  <span className={styles.previewSubtitle}>Final groups</span>
                </div>
                <span className={styles.previewIcon} aria-hidden="true">↗</span>
              </div>
              <div className={styles.previewGroups}>
                {exampleGroups.map((group, index) => (
                  <div className={styles.previewGroup} key={index}>
                    <span className={styles.groupLabel}>Group {index + 1}</span>
                    <ul>
                      {group.map((name) => <li key={name}>{name}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <figcaption>Illustrative example · Fictional names</figcaption>
          </figure>
        </header>

        <section className={styles.benefits} aria-labelledby="benefits-title">
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>From planning to presenting</p>
            <h2 id="benefits-title">Less on screen. More focus on the task.</h2>
            <p>
              A group generator helps you organise the class. Projector Mode
              helps you share the result when it is time to begin.
            </p>
          </div>
          <div className={styles.benefitGrid}>
            <article>
              <span className={styles.benefitNumber} aria-hidden="true">01</span>
              <h3>Make groups easy to find</h3>
              <p>
                Numbered group cards and colourful name labels give students
                somewhere to look while they find their partners. Useful for
                talk partners, practical tasks and project groups.
              </p>
            </article>
            <article>
              <span className={styles.benefitNumber} aria-hidden="true">02</span>
              <h3>Keep the setup out of view</h3>
              <p>
                Show the final groups without the name-entry box, saved-list
                controls or pairing settings. Review your choices first, then
                display the result you want the class to see.
              </p>
            </article>
            <article>
              <span className={styles.benefitNumber} aria-hidden="true">03</span>
              <h3>Use the screen you already have</h3>
              <p>
                Display the browser through your classroom projector or
                interactive whiteboard. Choose Fullscreen when your browser
                supports it to give the groups more room.
              </p>
            </article>
          </div>
        </section>

        <section className={styles.howSection} aria-labelledby="how-title">
          <div className={styles.howIntro}>
            <p className={styles.eyebrow}>A simple classroom routine</p>
            <h2 id="how-title">How to use Projector Mode</h2>
            <p>
              In the tool, Projector Mode is called <strong>Student View</strong>.
              It is included in Buddy Matcher Pro and opens from your results.
            </p>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Document navigation avoids stale hash fragments when returning to the tool. */}
            <a href="/#tool" className={styles.textLink}>
              Go to the tool <span aria-hidden="true">→</span>
            </a>
          </div>
          <ol className={styles.steps}>
            <li>
              <h3>Generate and review your groups</h3>
              <p>
                Sign in to your Pro account. Add names or load a saved list,
                choose the group size and generate. Check the result before
                showing it to students.
              </p>
            </li>
            <li>
              <h3>Choose Student View</h3>
              <p>
                Find the Student View button in the Results area. It opens a
                clean display of your existing groups; it does not generate
                a new set.
              </p>
            </li>
            <li>
              <h3>Put the groups on your classroom screen</h3>
              <p>
                Connect or mirror your device using your usual classroom setup.
                Choose Fullscreen if it is available. Use Back to return to the
                tool when you need to make changes.
              </p>
            </li>
          </ol>
        </section>

        <section className={styles.questions} aria-labelledby="questions-title">
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>Before your next lesson</p>
            <h2 id="questions-title">Projector Mode questions</h2>
          </div>
          <div className={styles.faqList}>
            <details>
              <summary>Is Projector Mode free?</summary>
              <p>
                Student View is a Pro feature. Buddy Matcher Pro costs £3.99 as
                a one-off payment, with no subscription. You can try the free
                group generator before upgrading; free generation limits apply.
              </p>
            </details>
            <details>
              <summary>Do students need an account or an app?</summary>
              <p>
                No. Students read the groups on the screen you display. Student
                View runs in your browser and does not send a separate view to
                student devices.
              </p>
            </details>
            <details>
              <summary>Can students see my pairing rules or leader choices?</summary>
              <p>
                Student View shows group numbers and names. It does not show
                blocked-pair settings, leader badges or the other teacher
                controls. Open it before sharing your screen if you want to
                keep the setup out of view.
              </p>
            </details>
            <details>
              <summary>Will every group fit on one screen?</summary>
              <p>
                That depends on the number of names, the group size and your
                display. You may need to scroll for a larger class. Check
                readability from the back of the room before the activity.
                Fullscreen is optional and depends on browser support.
              </p>
            </details>
          </div>
        </section>

        <section className={styles.proSection} aria-labelledby="pro-title">
          <div>
            <p className={styles.proEyebrow}>Buddy Matcher Pro</p>
            <h2 id="pro-title">Plan the groups. Share the result.</h2>
            <p>
              Get Student View alongside saved lists, custom group sizes,
              controls to keep people apart, group leaders and pairing history
              to help avoid repeats.
            </p>
          </div>
          <div className={styles.proAction}>
            <strong>£3.99 <span>one-off</span></strong>
            <Link href="/upgrade" className={styles.lightButton}>
              Explore Pro <span aria-hidden="true">→</span>
            </Link>
            <span>No subscription</span>
          </div>
        </section>

        <section className={styles.related} aria-labelledby="related-title">
          <div className={styles.relatedHeading}>
            <h2 id="related-title">More ideas for classroom grouping</h2>
            <Link href="/teachers" className={styles.textLink}>All teacher resources →</Link>
          </div>
          <div className={styles.relatedGrid}>
            {relatedResources.map((resource) => (
              <Link key={resource.href} href={resource.href}>
                <h3>{resource.title} <span aria-hidden="true">↗</span></h3>
                <p>{resource.text}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <Link href="/" className={styles.footerBrand}>Buddy Matcher</Link>
        <div>
          <Link href="/contact">Contact</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
      </footer>
    </div>
  );
}
