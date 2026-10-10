/**
 * Privacy — Route: /privacy. What IMGM keeps, what's public, and who helps run it.
 * Plain words, short on purpose (it's a beta among friends).
 */
const Section = ({ title, children }) => (
  <section className="flex flex-col gap-2">
    <h2 className="text-xl font-bold text-white">{title}</h2>
    <div className="text-slate-300 leading-relaxed flex flex-col gap-2">{children}</div>
  </section>
);

const Privacy = () => (
  <div className="max-w-3xl mx-auto px-6 py-12 flex flex-col gap-8">
    <header>
      <p className="text-xs font-black uppercase tracking-[0.25em] text-brand">IMGM</p>
      <h1 className="font-display text-5xl uppercase tracking-tight text-white">Privacy<span className="text-brand">.</span></h1>
      <p className="text-slate-400 mt-2">The short version of what we keep and why. IMGM is in beta, so this page will grow with the site.</p>
    </header>

    <Section title="What we keep">
      <p>Your email and login (a password, or your Google account), your gamer tag and profile picture, your reviews and votes, your Backlog, your Play Next chats, and any feedback you send.</p>
    </Section>

    <Section title="What everyone can see">
      <p>Your gamer tag, your profile picture, and your reviews. Your email and your real name are never shown to anyone.</p>
    </Section>

    <Section title="Play Next and AI">
      <p>When you use Play Next, your question, your quest answers and your reviews are sent to Google's Gemini AI to pick games for you. Chats are kept for 30 days, then deleted. Profile pictures are checked by Google Cloud Vision before they're shown, to keep IMGM safe for everyone.</p>
    </Section>

    <Section title="Who helps run IMGM">
      <p>Vercel and Render host the site, Neon stores the database, Google provides the AI and picture checks, Resend sends our emails, and Vercel Analytics counts page visits anonymously (no cookies, nothing that identifies you).</p>
    </Section>

    <Section title="Leaving">
      <p>Want your account and everything in it deleted? Send us a message with the Feedback button and we'll take care of it.</p>
    </Section>
  </div>
);

export default Privacy;
