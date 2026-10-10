/**
 * LegalPage — the shared look of the Terms of Use and Privacy Policy pages: a title,
 * the date they took effect, and numbered sections with plain-language text.
 */
export const LegalSection = ({ title, children }) => (
  <section className="flex flex-col gap-2 scroll-mt-24">
    <h2 className="text-xl font-bold text-white">{title}</h2>
    <div className="text-slate-300 leading-relaxed flex flex-col gap-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">{children}</div>
  </section>
);

const LegalPage = ({ title, effective, intro, children }) => (
  <div className="max-w-3xl mx-auto px-6 py-12 flex flex-col gap-8">
    <header>
      <p className="text-xs font-black uppercase tracking-[0.25em] text-brand">IMGM</p>
      <h1 className="font-display text-5xl uppercase tracking-tight text-white">
        {title}
        <span className="text-brand">.</span>
      </h1>
      <p className="text-sm text-slate-500 mt-2">Effective {effective}</p>
      {intro && <p className="text-slate-400 mt-3">{intro}</p>}
    </header>
    {children}
  </div>
);

export default LegalPage;
