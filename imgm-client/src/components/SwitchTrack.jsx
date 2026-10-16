/**
 * SwitchTrack — what an on/off switch looks like, in the Noir look: a small square
 * track with a square knob. Off, it's a dark field with a grey knob; on, it fills
 * ivory and the knob slides across.
 *
 * Only the picture: put it inside a <button role="switch" aria-checked={on}> next to
 * the switch's words, so the whole row is the button (and a 44px tap target).
 *
 *   <SwitchTrack on={shown} />
 */
const SwitchTrack = ({ on }) => (
  <span
    aria-hidden="true"
    className={`relative inline-block w-10 h-6 shrink-0 rounded-sm border transition-colors duration-120 ${
      on ? 'bg-white border-white' : 'bg-slate-950 border-slate-500'
    }`}
  >
    <span
      className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-xs transition-transform duration-120 ${
        on ? 'translate-x-4 bg-slate-950' : 'bg-slate-400'
      }`}
    />
  </span>
);

export default SwitchTrack;
