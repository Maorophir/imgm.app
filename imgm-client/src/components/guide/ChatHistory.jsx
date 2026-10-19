/**
 * ChatHistory — the player's past Play Next chats, to reopen one: pinned chats on top,
 * then the rest, newest first. "New chat" on top (a ghost button: "Ask" is Play Next's
 * lime action). Each chat has two quiet buttons that are always shown (no hover needed,
 * so touch screens and every screen size see them): pin/unpin, and delete (a second
 * click confirms).
 */
import { useState } from 'react';
import { Pin, PinOff, Plus, X } from 'lucide-react';
import { timeAgo } from '../../lib/timeAgo';
import { GHOST_BUTTON_SM } from '../../lib/ui';

const ACTION =
  'w-8 h-8 grid place-items-center rounded-sm text-slate-400 hover:text-white hover:bg-slate-700 transition-colors duration-120 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400 disabled:cursor-not-allowed';

const ChatRow = ({ chat, active, onOpen, onPin, onDelete, disabled, pinsFull }) => {
  const [confirming, setConfirming] = useState(false);
  const cantPin = !chat.pinned && pinsFull;
  return (
    <li className="relative" onMouseLeave={() => setConfirming(false)}>
      <button
        type="button"
        onClick={() => onOpen(chat.id)}
        disabled={disabled}
        aria-current={active ? 'true' : undefined}
        className={`w-full text-left pl-3 pr-19 py-2 rounded-sm border-l-2 transition-colors duration-120 disabled:cursor-not-allowed ${
          active ? 'border-white bg-slate-800 text-white' : 'border-transparent text-slate-300 hover:bg-slate-800 hover:text-white'
        }`}
      >
        <span className="block text-sm font-medium truncate">{chat.title}</span>
        <span className="block text-xs text-slate-400">{timeAgo(chat.updatedAt)}</span>
      </button>

      {/* While an answer runs, the chats can't change */}
      {!disabled && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
          {confirming ? (
            <button
              type="button"
              onClick={() => onDelete(chat.id)}
              onBlur={() => setConfirming(false)}
              autoFocus
              title="Click again to delete"
              aria-label={`Delete ${chat.title}: click again to confirm`}
              className="px-2 py-1 rounded-sm text-xs font-medium text-red-200 border border-red-400/50 hover:bg-red-400/10 transition-colors duration-120"
            >
              Delete?
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onPin(chat.id, !chat.pinned)}
                disabled={cantPin}
                aria-pressed={chat.pinned}
                title={chat.pinned ? 'Unpin' : cantPin ? 'Unpin a chat to pin this one' : 'Pin to the top'}
                aria-label={chat.pinned ? `Unpin ${chat.title}` : `Pin ${chat.title}`}
                className={`${ACTION} group/pin ${chat.pinned ? 'text-white' : ''}`}
              >
                {chat.pinned ? (
                  <>
                    {/* Pinned: a filled pin; hovering shows what a click does */}
                    <Pin className="w-3.5 h-3.5 fill-current group-hover/pin:hidden" strokeWidth={1.8} aria-hidden="true" />
                    <PinOff className="w-3.5 h-3.5 hidden group-hover/pin:block" strokeWidth={1.8} aria-hidden="true" />
                  </>
                ) : (
                  <Pin className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                title="Delete this chat"
                aria-label={`Delete ${chat.title}`}
                className={ACTION}
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      )}
    </li>
  );
};

const ChatList = ({ label, chats, ...row }) => (
  <>
    <p className="px-1 text-sm text-slate-400">{label}</p>
    <ul className="flex flex-col gap-0.5">
      {chats.map((chat) => (
        <ChatRow key={chat.id} chat={chat} active={chat.id === row.activeId} {...row} />
      ))}
    </ul>
  </>
);

const ChatHistory = ({ chats, activeId, onOpen, onPin, onDelete, onNew, disabled, maxPins = 5 }) => {
  const pinned = chats.filter((chat) => chat.pinned);
  const recent = chats.filter((chat) => !chat.pinned);
  const row = { activeId, onOpen, onPin, onDelete, disabled, pinsFull: pinned.length >= maxPins };
  return (
    <nav aria-label="Your Play Next chats" className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onNew}
        disabled={disabled}
        className={`${GHOST_BUTTON_SM} w-full`}
      >
        <Plus className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> New chat
      </button>
      {chats.length === 0 ? (
        <>
          <p className="px-1 text-sm text-slate-400">Your chats</p>
          <p className="px-1 text-sm text-slate-400">Your chats will show up here.</p>
        </>
      ) : (
        <>
          {pinned.length > 0 && <ChatList label="Pinned" chats={pinned} {...row} />}
          {recent.length > 0 && <ChatList label={pinned.length ? 'Recent' : 'Your chats'} chats={recent} {...row} />}
        </>
      )}
      <p className="px-1 text-xs text-slate-400 leading-snug">
        Your newest 20 chats are kept for 30 days. Pinned chats are kept until you unpin them.
      </p>
    </nav>
  );
};

export default ChatHistory;
