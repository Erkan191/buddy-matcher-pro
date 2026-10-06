import { proFeatures } from "@/lib/proFeatures";
import Link from "next/link";
import styles from "./HomeProSection.module.css";

const benefits = proFeatures.map((feature, index) => ({ ...feature, number: String(index + 1).padStart(2, "0") }));

export default function HomeProSection({ isPro }) {
  return (
    <section id="pro" className={`content-section ${styles.section}`} aria-labelledby="home-pro-title">
      <div className="section-wrap">
        <div className={styles.panel}>
          <div className={styles.intro}>
            <div>
              <span className={styles.eyebrow}>Buddy Matcher Pro</span>
              <h2 id="home-pro-title">Keep the right students apart.<br />Make fresh pairings easier.</h2>
              <p>Keep certain students apart, avoid repeat pairings and save class lists. Pro helps you prepare your regular classes, teams and clubs in less time.</p>
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
                  <Link href="/upgrade" className="btn btn-success">Get Pro for £3.99 <span aria-hidden="true">→</span></Link>
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
