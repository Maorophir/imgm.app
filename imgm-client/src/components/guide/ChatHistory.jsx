/**
 * ChatHistory — the player's past Play Next chats (newest first), to reopen one.
 * "+ New chat" on top; each chat can be deleted (a second click confirms).
 */
import { useState } from 'react';
import { timeAgo } from '../../lib/timeAgo';


const ChatRow = ({ chat, active, onOpen, onDelete, disabled }) => {
  const [confirming, setConfirming] = useState(false);
  return (
    <li className="group relative" onMouseLeave={() => setConfirming(false)}>
      <button
        type="button"
        onClick={() => onOpen(chat.id)}
        disabled={disabled}
        aria-current={active ? 'true' : undefined}
        className={`w-full text-left pl-3 pr-9 py-2 rounded-xl border-l-2 transition disabled:cursor-not-allowed ${
          active ? 'border-brand bg-white/5 text-white' : 'border-transparent text-slate-300 hover:bg-white/5 hover:text-white'
        }`}
      >
        <span className="block text-sm font-semibold truncate">{chat.title}</span>
        <span className="block text-[11px] text-slate-500">{timeAgo(chat.updatedAt)}</span>
      </button>
      <button
        type="button"
        onClick={() => (confirming ? onDelete(chat.id) : setConfirming(true))}
        disabled={disabled}
        title={confirming ? 'Click again to delete' : 'Delete this chat'}
        className={`absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg text-[11px] font-bold transition disabled:hidden ${
          confirming
            ? 'px-2 py-1 bg-red-500/15 text-red-200 border border-red-500/40'
            : 'w-7 h-7 text-slate-500 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 focus:opacity-100'
        }`}
      >
        {confirming ? 'Delete?' : '✕'}
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
      className="w-full px-4 py-2.5 rounded-xl text-sm font-bold text-slate-950 bg-brand hover:brightness-110 transition disabled:opacity-40"
    >
      + New chat
    </button>
    <p className="px-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Your chats</p>
    {chats.length === 0 ? (
      <p className="px-1 text-sm text-slate-500">Your chats will show up here.</p>
    ) : (
      <ul className="flex flex-col gap-0.5">
        {chats.map((chat) => (
          <ChatRow key={chat.id} chat={chat} active={chat.id === activeId} onOpen={onOpen} onDelete={onDelete} disabled={disabled} />
        ))}
      </ul>
    )}
    <p className="px-1 text-[11px] text-slate-600 leading-snug">Your newest 20 chats are kept for 30 days.</p>
  </nav>
);

export default ChatHistory;
