/**
 * PlayNextBackdrop — the living background behind the Play Next page.
 *
 *   glows    soft lime (top left) and teal (bottom right) light, slowly drifting
 *   grid     a faint grid that fades out from the top, like a game menu
 *   ambient  once picks are in, the Best Pick's cover, hugely blurred, tints the whole
 *            page in its colours (and fades over when the next answer picks another)
 * Fixed behind everything and ignores the mouse; the page wraps it with `isolate`
 * so it sits above the app's black background but below the content.
 */
const GRID = {
  backgroundImage:
    "linear-gradient(to right, rgb(255 255 255 / 0.035) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.035) 1px, transparent 1px)",
  backgroundSize: "56px 56px",
  maskImage:
    "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 75%)",
  WebkitMaskImage:
    "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 75%)",
};

const PlayNextBackdrop = ({ cover }) => (
  <div
    className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
    aria-hidden="true"
  >
    {/* The Best Pick's colours: key replays the fade when the pick changes */}
    {cover && (
      <img
        key={cover}
        src={cover}
        alt=""
        className="absolute left-1/2 top-1/3 w-[120vw] max-w-none -translate-x-1/2 -translate-y-1/2 aspect-square object-cover blur-[110px] saturate-200 opacity-35 animate-fade-in"
      />
    )}

    <div className="absolute -top-40 -left-40 w-[42rem] h-[42rem] rounded-full bg-brand/[0.13] blur-[140px] animate-drift motion-reduce:animate-none" />
    <div className="absolute -bottom-48 -right-32 w-[38rem] h-[38rem] rounded-full bg-teal-400/[0.07] blur-[140px] animate-drift [animation-delay:-9s] motion-reduce:animate-none" />

    <div className="absolute inset-0" style={GRID} />

    {/* Keeps text readable over the brightest covers */}
    <div className="absolute inset-0 bg-gradient-to-b from-slate-950/10 via-slate-950/35 to-slate-950/75" />
  </div>
);

export default PlayNextBackdrop;
