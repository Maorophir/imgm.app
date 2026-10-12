/**
 * ChatHistory — the player's past Play Next chats (newest first), to reopen one.
 * "New chat" on top (a ghost button: "Ask" is Play Next's lime action); each chat can
 * be deleted (a second click confirms).
 */
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { timeAgo } from '../../lib/timeAgo';
import { GHOST_BUTTON_SM } from '../../lib/ui';


const ChatRow = ({ chat, active, onOpen, onDelete, disabled }) => {
  const [confirming, setConfirming] = useState(false);
  return (
    <li className="group relative" onMouseLeave={() => setConfirming(false)}>
      <button
        type="button"
        onClick={() => onOpen(chat.id)}
        disabled={disabled}
        aria-current={active ? 'true' : undefined}
        className={`w-full text-left pl-3 pr-9 py-2 rounded-sm border-l-2 transition-colors duration-120 disabled:cursor-not-allowed ${
          active ? 'border-white bg-slate-800 text-white' : 'border-transparent text-slate-300 hover:bg-slate-800 hover:text-white'
        }`}
      >
        <span className="block text-sm font-medium truncate">{chat.title}</span>
        <span className="block text-xs text-slate-400">{timeAgo(chat.updatedAt)}</span>
      </button>
      <button
        type="button"
        onClick={() => (confirming ? onDelete(chat.id) : setConfirming(true))}
        disabled={disabled}
        title={confirming ? 'Click again to delete' : 'Delete this chat'}
        aria-label={confirming ? `Delete ${chat.title}: click again to confirm` : `Delete ${chat.title}`}
        className={`absolute right-1.5 top-1/2 -translate-y-1/2 rounded-sm text-xs font-medium transition-colors duration-120 disabled:hidden ${
          confirming
            ? 'px-2 py-1 text-red-200 border border-red-400/50'
            : 'w-7 h-7 grid place-items-center text-slate-400 hover:text-white hover:bg-slate-700 opacity-0 group-hover:opacity-100 focus:opacity-100'
        }`}
      >
        {confirming ? 'Delete?' : <X className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" />}
      </button>
    </li>
  );
};

const ChatHistory = ({ chats, activeId, onOpen, onDelete, onNew, disabled }) => (
  <nav aria-label="Your Play Next chats" className="flex flex-col gap-3">
    <button
      type="button"
      onClick={onNew}
      disabled={disabled}
      className={`${GHOST_BUTTON_SM} w-full`}
    >
      <Plus className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> New chat
    </button>
    <p className="px-1 text-sm text-slate-400">Your chats</p>
    {chats.length === 0 ? (
      <p className="px-1 text-sm text-slate-400">Your chats will show up here.</p>
    ) : (
      <ul className="flex flex-col gap-0.5">
        {chats.map((chat) => (
          <ChatRow key={chat.id} chat={chat} active={chat.id === activeId} onOpen={onOpen} onDelete={onDelete} disabled={disabled} />
        ))}
      </ul>
    )}
    <p className="px-1 text-xs text-slate-400 leading-snug">Your newest 20 chats are kept for 30 days.</p>
  </nav>
);

export default ChatHistory;
