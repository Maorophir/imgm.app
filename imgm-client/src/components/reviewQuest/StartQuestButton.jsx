/**
 * StartQuestButton — The call-to-action that opens the Review Quest.
 * Styled like a "press start" button: glowing gradient, a light sweep,
 * a game-controller icon and the reward the player gets.
 */
import { Link } from 'react-router-dom';

// Game controller icon (based on Lucide's "gamepad-2", ISC license)
const GamepadIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="6" x2="10" y1="11" y2="11" />
    <line x1="8" x2="8" y1="9" y2="13" />
    <line x1="15" x2="15.01" y1="12" y2="12" />
    <line x1="18" x2="18.01" y1="10" y2="10" />
    <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
  </svg>
);

const StartQuestButton = ({ gameId, label = 'Start Review Quest', reward = '+1,000 XP · earn badges · ~2 min' }) => (
  <Link
    to={`/game/${gameId}/review`}
    className="
      group relative inline-flex items-center gap-3 pl-3 pr-6 py-2.5
      rounded-2xl overflow-hidden
      bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600
      shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/50
      ring-1 ring-white/10
      transition-all duration-300 hover:scale-105 active:scale-100
    "
  >
    {/* The light sweep */}
    <span className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shine pointer-events-none" />

    {/* Icon tile — wiggles a little on hover */}
    <span className="relative w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-110">
      <GamepadIcon className="w-6 h-6 text-white" />
    </span>

    <span className="relative text-left">
      <span className="block font-black text-white leading-tight tracking-wide">{label}</span>
      <span className="block text-[11px] font-semibold text-indigo-100/80">{reward}</span>
    </span>
  </Link>
);

export default StartQuestButton;
