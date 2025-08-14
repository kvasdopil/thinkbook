'use client';

import { useChat } from 'ai/react';
import { useCallback, useRef } from 'react';

type Part = { type: string; text?: string; textDelta?: string };
type MessageWithParts = { parts?: Part[] };

function hasParts(value: unknown): value is MessageWithParts {
  if (!value || typeof value !== 'object') return false;
  const v = value as { parts?: unknown };
  if (!Array.isArray(v.parts)) return false;
  return v.parts.every((p) => p && typeof p === 'object');
}

function getMessageText(value: unknown): string {
  if (hasParts(value)) {
    return (value.parts ?? [])
      .map((p) =>
        typeof p.text === 'string' ? p.text : typeof p.textDelta === 'string' ? p.textDelta : '',
      )
      .join('');
  }
  const maybe = value as { content?: unknown };
  if (typeof maybe.content === 'string') return maybe.content;
  if (Array.isArray(maybe.content)) {
    return maybe.content
      .map((c) =>
        c && typeof c === 'object' && typeof (c as { text?: string }).text === 'string'
          ? (c as { text?: string }).text!
          : '',
      )
      .join('');
  }
  return '';
}

export function AIChat() {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const apiPath =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('mock-ai') === '1'
      ? '/api/chat?mock=1'
      : '/api/chat';

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: apiPath,
    initialInput: '',
  });

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !(e.shiftKey || e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const form = textareaRef.current?.closest('form');
      if (form) form.requestSubmit();
    }
  }, []);

  return (
    <div className="w-full max-w-3xl border border-black/[.08] rounded">
      <div className="p-3 flex flex-col gap-2 max-h-64 overflow-y-auto bg-white">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`text-sm whitespace-pre-wrap leading-relaxed ${
              m.role === 'user' ? 'text-black' : 'text-black/80'
            }`}
          >
            <div className="font-medium mb-1">{m.role === 'user' ? 'You' : 'Assistant'}</div>
            {/* Prefer parts; fallback to content for compatibility */}
            {getMessageText(m)}
          </div>
        ))}
        <div className="text-xs text-black/50">{isLoading ? 'responding' : 'idle'}</div>
      </div>
      <form
        className="p-3 flex flex-col gap-2 border-t border-black/[.06] bg-black/[.02]"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(e);
        }}
      >
        <textarea
          ref={textareaRef}
          className="w-full resize-y min-h-16 max-h-48 p-2 rounded border border-black/[.1] focus:outline-none"
          placeholder="Ask something…"
          value={input}
          onChange={handleInputChange}
          onKeyDown={onKeyDown}
        />
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-3 py-1.5 rounded border border-black/[.08] hover:bg-[#f2f2f2] cursor-pointer"
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? 'Sending…' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}
