import { useEffect, useRef, useState } from "react";
import { api } from "@/adapters/http/api";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function LandingPage({ onNavigate, onAuth, onToast }) {
  const [signup, setSignup] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const landingRef = useRef(null);
  const headerRef = useRef(null);

  useEffect(() => {
    const landing = landingRef.current;
    const header = headerRef.current;
    if (!landing || !header) return undefined;

    let frame = 0;
    const updateHeader = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const headerHeight = header.getBoundingClientRect().height;
        landing.style.setProperty("--landing-header-height", `${headerHeight}px`);
        const sections = [...landing.querySelectorAll(".landing-hero, .landing-join, .landing-about, .landing-learners, .landing-team, .landing-contact")];
        const section = sections.find((item) => {
          const bounds = item.getBoundingClientRect();
          return bounds.top <= headerHeight + 1 && bounds.bottom > headerHeight + 1;
        }) || sections.reduce((closest, item) => {
          if (!closest) return item;
          const distance = Math.abs(item.getBoundingClientRect().top - headerHeight);
          return distance < Math.abs(closest.getBoundingClientRect().top - headerHeight) ? item : closest;
        }, null);
        if (!section) return;

        const background = getComputedStyle(section).backgroundColor;
        const channels = background.match(/[\d.]+/g)?.slice(0, 3).map(Number) || [247, 241, 229];
        const brightness = (channels[0] * 299 + channels[1] * 587 + channels[2] * 114) / 1000;
        header.style.backgroundColor = background;
        header.dataset.theme = brightness < 150 ? "dark" : "light";
        const activeLink = section.id === "home" ? "home" : section.id === "contact" ? "contact" : "about";
        header.querySelectorAll("nav a").forEach((link) => {
          const active = link.getAttribute("href") === `#${activeLink}`;
          link.classList.toggle("public-nav-active", active);
          if (active) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      });
    };

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    window.addEventListener("resize", updateHeader);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateHeader);
      window.removeEventListener("resize", updateHeader);
    };
  }, []);

  const createAccount = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await api("/auth/signup", { method: "POST", body: JSON.stringify(signup) });
      onAuth(result.user);
      onNavigate("/profile/setup");
    } catch (error) {
      onToast(`Couldn't create your account: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startGoogleSignup = async () => {
    setGoogleLoading(true);
    try {
      await api("/health");
      window.location.assign("/api/auth/google?flow=signup");
    } catch (error) {
      onToast(`Couldn't reach the account service. Start the Flask API and try again. ${error.message}`);
      setGoogleLoading(false);
    }
  };

  const contactNotice = (event) => {
    event.preventDefault();
    onToast("Contact messaging isn't connected in this demo yet.");
  };

  return (
    <div className="public-landing" ref={landingRef}>
      <header ref={headerRef} className="public-header" data-theme="dark">
        <a className="public-brand" href="#home" aria-label="Talinturo home"><BrandLogo className="brand-logo-public" /><span>TALINTURO</span></a>
        <nav aria-label="Landing page navigation">
          <a className="public-nav-active" aria-current="location" href="#home">Home <span>•</span></a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
          <button type="button" className="public-header-instructor" onClick={() => onNavigate("/instructor/sign-in")}>Instructor sign in</button>
        </nav>
        <a className="landing-button landing-button-yellow" href="#join">Get Started <span aria-hidden="true">↗</span></a>
      </header>
      <section className="landing-hero" id="home">
        <div className="hero-cloud">
          <span className="hero-pill">A little play. A lot of connection.</span>
          <svg className="hero-sparkle hero-sparkle-one" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 0C27.5 15 33 20.5 48 24C33 27.5 27.5 33 24 48C20.5 33 15 27.5 0 24C15 20.5 20.5 15 24 0Z" /><circle cx="24" cy="24" r="3" /></svg>
          <svg className="hero-sparkle hero-sparkle-two" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 0C27.5 15 33 20.5 48 24C33 27.5 27.5 33 24 48C20.5 33 15 27.5 0 24C15 20.5 20.5 15 24 0Z" /><circle cx="24" cy="24" r="3" /></svg>
          <h1>Learn Filipino<br />Sign Language</h1>
          <p>Bridge communication barriers at home and in everyday life with playful lessons. 100% free for everyone.</p>
          <div className="hero-buttons">
            <a className="landing-button landing-button-coral" href="#join">Get Started <span aria-hidden="true">↗</span></a>
            <a className="landing-button landing-button-yellow" href="#contact">Contribute <span aria-hidden="true">↗</span></a>
          </div>
        </div>
        <div className="hero-wave" aria-hidden="true" />
      </section>

      <section className="landing-join" id="join">
        <p className="landing-section-title">Your next connection starts here.</p>
        <div className="join-layout">
          <div className="join-mascot join-mascot-dog" aria-hidden="true">
            <span className="mascot-face">🐶</span>
            <strong>Small steps.<br />Shared understanding.</strong>
            <span className="mascot-caption">For every age, at every stage.</span>
          </div>
          <div className="join-card">
            <h2>Join us today!</h2>
            <p>A space to learn, play, and connect.</p>
            <form onSubmit={createAccount}>
              <label>Your name<input value={signup.name} onChange={(event) => setSignup({ ...signup, name: event.target.value })} autoComplete="name" required maxLength={70} placeholder="How should we call you?" /></label>
              <label>Email<input type="email" value={signup.email} onChange={(event) => setSignup({ ...signup, email: event.target.value })} autoComplete="email" required maxLength={254} placeholder="you@example.com" /></label>
              <label>Password<input type="password" value={signup.password} onChange={(event) => setSignup({ ...signup, password: event.target.value })} autoComplete="new-password" minLength={8} maxLength={128} required placeholder="Create a password" /></label>
              <button className="landing-button landing-button-blue" type="submit" disabled={loading || googleLoading}>{loading ? "Creating account…" : "Create account"}</button>
            </form>
            <div className="join-or"><span>or sign up with</span></div>
            <button className="join-google-button" type="button" disabled={loading || googleLoading} onClick={startGoogleSignup}>{googleLoading ? "Connecting to Google…" : "◎ Sign up with Google"}</button>
            <p className="join-signin">Already learning with us? <button type="button" onClick={() => onNavigate("/login")}>Sign in</button></p>
            <p className="join-signin join-instructor-link">Teaching with Talinturo? <button type="button" onClick={() => onNavigate("/instructor/sign-in")}>Instructor sign in</button></p>
          </div>
          <div className="join-mascot join-mascot-bird" aria-hidden="true">
            <span className="free-bubble">100% free.<br />For everyone.</span>
            <span className="mascot-face">🐥</span>
          </div>
        </div>
        <span className="join-floating-avatar" aria-hidden="true">🙂</span>
        <div className="join-wave" aria-hidden="true" />
      </section>

      <section className="landing-about" id="about">
        <div className="landing-section-inner">
          <p className="landing-kicker">BUILT FOR SHARED UNDERSTANDING</p>
          <h2>About the Platform</h2>
          <p className="landing-about-intro">A playful approach to Filipino Sign Language, shaped around the way you learn — at home and in the classroom.</p>
          <div className="about-layout">
            <div className="learning-preview" aria-hidden="true">
              <div className="preview-bunny">🐰</div>
              <div className="preview-card">
                <small>Everyday connections <span>●</span></small>
                <div className="preview-tiles"><span>📖</span><span>☕</span></div>
                <div className="preview-progress"><i /><i /><i /><i /><i /></div>
                <p>Notice. Practice. Connect.</p>
              </div>
            </div>
            <div className="about-features">
              <article><h3>Learn through everyday moments</h3><p>Build familiarity with useful signs in friendly, real-life situations.</p><span>Explore and recognize</span></article>
              <article><h3>Practice at your own pace</h3><p>Use guided activities and revisit lessons whenever you need.</p><span>Practice with confidence</span></article>
              <article><h3>Make learning a shared experience</h3><p>Discover ways to learn together with family, friends, and educators.</p><span>Notice. Practice. Connect.</span></article>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-learners" id="learners">
        <div className="learners-heading">
          <div><p className="landing-kicker">DIFFERENT LEARNERS. ONE SHARED LANGUAGE.</p><h2>Tailored for Every Learner</h2></div>
          <p>A path that meets you where you are — at home, in class, or simply curious.</p>
        </div>
        <div className="learner-cards">
          {[
            ["Talinturo Kids", "Explore bite-sized lessons and friendly scenarios that make practice feel approachable.", "Explore playful learning"],
            ["FSL Students", "Practice useful vocabulary and everyday scenarios in a supportive space.", "Start learning"],
            ["Casual Learner", "Begin with beginner-friendly paths and short practice activities. Learn a little at a time.", "Find a learning path"],
            ["For FSL Instructors", "Create classrooms, manage learner rosters, and keep track of progress.", "Explore classroom tools"],
          ].map(([title, copy, link], index) => (
            <a className="learner-card" href="#join" key={title}>
              <span className={`learner-card-art learner-card-art-${index + 1}`} aria-hidden="true">{["🌱", "📚", "✨", "🌼"][index]}</span>
              <strong>{title}</strong><p>{copy}</p><span className="learner-card-link">{link}<b aria-hidden="true">↗</b></span>
            </a>
          ))}
        </div>
      </section>

      <section className="landing-team" id="team">
        <span className="hero-pill">The people behind the purpose</span>
        <h2>Meet the Team</h2>
        <p className="team-subtitle">Meet the people building TALINTURO.</p>
        <div className="team-layout">
          <div className="team-art" aria-hidden="true"><span>👋</span><span>💛</span><span>🤟</span></div>
          <div><h3>One team, one mission.</h3><p>We believe small moments of understanding can make a big difference. Talinturo is here to make Filipino Sign Language learning more welcoming, practical, and joyful for everyone.</p></div>
        </div>
      </section>

      <section className="landing-contact" id="contact">
        <div className="contact-layout">
          <div><p className="landing-contact-kicker">CONTACT</p><h2>Good things start with a conversation.</h2><p>Have a question, an idea, or a way to contribute? We'd love to hear from you.</p></div>
          <form className="contact-card" onSubmit={contactNotice}>
            <h3>Send us a message</h3>
            <div className="contact-fields">
              <label>Name<input required placeholder="Your name" /></label>
              <label>Email<input type="email" required placeholder="you@example.com" /></label>
            </div>
            <label>Message<textarea required rows="3" placeholder="What would you like to share?" /></label>
            <button className="landing-button landing-button-blue" type="submit">Send Message</button>
            <small>Contact messaging isn't connected in this demo yet.</small>
          </form>
        </div>
        <footer className="public-footer">
          <a className="public-brand" href="#home" aria-label="Talinturo home"><BrandLogo className="brand-logo-public" /><span>TALINTURO</span></a>
          <span>Filipino Sign Language. Free for everyone.</span>
          <small>© 2026 TALINTURO</small>
        </footer>
      </section>
    </div>
  );
}
