/**
 * PlayNextBackdrop — the living cover wall behind the Play Next page.
 *
 * Three rows of game covers drift sideways (alternating directions, each at its own
 * speed), very dim, like a console menu. The covers follow the chat: featured games
 * before you ask, the games Play Next is considering while it works, your picks first
 * once it's done (GameGuide decides the order; this just lays them out).
 * Fixed behind everything and ignores the mouse; the page wraps it with `isolate`
 * so it sits above the app's black background but below the content.
 */
const ROWS = [
  { animation: "animate-scroll-left", duration: "160s" },
  { animation: "animate-scroll-right", duration: "130s" },
  { animation: "animate-scroll-left", duration: "190s" },
];
const PER_ROW = 14; // at least this many covers a row: a wide screen twice over

// Deal the covers out like cards (1st → row 1, 2nd → row 2…), so the first few
// (the picks) land at the start of every row. A short row repeats WHOLE (A B C A B C),
// never just its first few: padding 13 covers to 14 put the first one again at the
// end, right beside itself where the doubled row loops.
const dealRows = (covers) =>
  ROWS.map((_, row) => {
    const mine = covers.filter((_, i) => i % ROWS.length === row);
    const pool = mine.length ? mine : covers;
    return Array.from({ length: Math.ceil(PER_ROW / pool.length) }, () => pool).flat();
  });

const PlayNextBackdrop = ({ covers }) => {
  const rows = covers.length ? dealRows(covers) : [];
  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {/* The wall: each row is doubled ([A, A]), because the scroll moves exactly 50% */}
      <div className="absolute inset-0 flex flex-col justify-center gap-5 opacity-[0.16] saturate-[.8] -rotate-3 scale-110">
        {rows.map((row, r) => (
          <div
            key={r}
            className={`flex w-max gap-5 ${ROWS[r].animation} motion-reduce:animate-none`}
            style={{ animationDuration: ROWS[r].duration }}
          >
            {[...row, ...row].map((cover, i) => (
              <img
                key={`${cover}-${i}`}
                src={cover}
                alt=""
                loading="lazy"
                className="h-[30vh] aspect-[3/4] object-cover rounded-xl shrink-0 animate-fade-in"
              />
            ))}
          </div>
        ))}
      </div>

      {/* A soft lime glow, and a vignette that keeps the middle (the chat) calm */}
      <div className="absolute -top-40 -left-40 w-[42rem] h-[42rem] rounded-full bg-brand/[0.10] blur-[140px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_65%_at_50%_45%,rgb(13_15_18/0.75),rgb(13_15_18/0.25))]" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-transparent to-slate-950/80" />
    </div>
  );
};

export default PlayNextBackdrop;
