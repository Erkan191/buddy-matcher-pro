import Link from "next/link";
import styles from "./HomeProSection.module.css";

const benefits = [
  { number: "01", title: "Set simple grouping rules", text: "Keep specific people apart, reduce repeat pairings and spread group leaders." },
  { number: "02", title: "Get ready for the next lesson", text: "Save and reuse lists. Make groups of 4, 5, 6 or a custom size, with unlimited generating." },
  { number: "03", title: "Put your groups on the big screen", text: "Student View shows the final groups while keeping your setup controls out of view.", href: "/projector-mode", link: "Explore projector mode" },
  { number: "04", title: "Take your groups with you", text: "Export to CSV or print a clean layout for the lesson, workshop or club session." },
];

export default function HomeProSection({ isPro }) {
  return (
    <section id="pro" className={`content-section ${styles.section}`} aria-labelledby="home-pro-title">
      <div className="section-wrap">
        <div className={styles.panel}>
          <div className={styles.intro}>
            <div>
              <span className={styles.eyebrow}>Buddy Matcher Pro</span>
              <h2 id="home-pro-title">A little more control.<br />A lot less organising.</h2>
              <p>Quick pairs and trios are free. For your regular classes, teams and clubs, Pro brings your lists, grouping rules and presentation tools together.</p>
            </div>
            <div className={styles.offer}>
              {isPro ? (
                <>
                  <span className={styles.active}>Your Pro access is active</span>
                  <p className={styles.ready}>Ready for your next group?</p>
                  <a href="#tool" className="btn btn-success">Open the Pro tool <span aria-hidden="true">→</span></a>
                  <span className={styles.offerNote}>All your Pro features are unlocked.</span>
                </>
              ) : (
                <>
                  <div className={styles.price}>£3.99 <span>once</span></div>
                  <p>No subscription. No monthly bill.</p>
                  <Link href="/upgrade" className="btn btn-success">Get Buddy Matcher Pro <span aria-hidden="true">→</span></Link>
                  <span className={styles.offerNote}>One payment unlocks all Pro features.</span>
                </>
              )}
            </div>
          </div>
          <div className={styles.benefits}>
            {benefits.map((benefit) => (
              <div key={benefit.number} className={styles.benefit}>
                <span className={styles.number} aria-hidden="true">{benefit.number}</span>
                <div>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.text}</p>
                  {benefit.href && <Link href={benefit.href} className={styles.textLink}>{benefit.link} <span aria-hidden="true">→</span></Link>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomeTipSection() {
  return (
    <section id="support" className={styles.support} aria-labelledby="tip-title">
      <div className="section-wrap">
        <div className={styles.tip}>
          <div>
            <h2 id="tip-title">Enjoying the free tool?</h2>
            <p>A small tip helps me keep Buddy Matcher going. Always optional, always appreciated.</p>
          </div>
          <a href="https://buymeacoffee.com/buddyup" target="_blank" rel="noopener noreferrer" className={styles.tipLink}>Leave a tip <span aria-hidden="true">↗</span><span className={styles.srOnly}> on Buy Me a Coffee (opens in a new tab)</span></a>
        </div>
      </div>
    </section>
  );
}
