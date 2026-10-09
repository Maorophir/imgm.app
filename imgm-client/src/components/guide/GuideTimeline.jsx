/**
 * GuideTimeline — what the guide is doing, step by step, as it happens.
 * Running steps spin; finished steps show a check and what they found.
 * Once the picks are in, the steps fold into one line that can be reopened.
 */
import { useEffect, useState } from "react";
const Spinner = () => (
  <span
    className="w-3.5 h-3.5 rounded-full border-2 border-brand/30 border-t-brand animate-spin shrink-0"
    aria-hidden="true"
  />
);

const Check = () => (
  <span
    className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-black flex items-center justify-center shrink-0"
    aria-hidden="true"
  >
    ✓
  </span>
);

// Before the first step: after a few quiet seconds, say why it's taking a while
const WarmingUp = () => {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <p className="flex items-start gap-2 text-sm text-slate-400">
      <span className="mt-[3px]">
        <Spinner />
      </span>
      <span>
        Warming up…
        {slow && (
          <span className="block text-slate-500 animate-fade-in">
            The first question after a quiet spell takes a little longer.
          </span>
        )}
      </span>
    </p>
  );
};

const GuideTimeline = ({ steps, running, collapsible = false }) => {
  const [open, setOpen] = useState(false);

  if (steps.length === 0) {
    return running ? <WarmingUp /> : null;
  }

  if (collapsible && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
      >
        <Check />
        Worked through {steps.length} steps
        <span className="text-xs">▾</span>
      </button>
    );
  }

  return (
    <ol className="flex flex-col gap-1.5" aria-live="polite">
      {steps.map((step) => (
        <li
          key={step.id}
          className="flex items-start gap-2.5 text-sm animate-fade-in"
        >
          <span className="mt-[3px]">
            {step.state === "done" ? <Check /> : <Spinner />}
          </span>
          <span className="min-w-0">
            <span
              className={
                step.state === "done" ? "text-slate-400" : "text-slate-200"
              }
            >
              {step.label}
            </span>
            {step.detail && (
              <span className="text-slate-500"> · {step.detail}</span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
};

export default GuideTimeline;
