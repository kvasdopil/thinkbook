'use client';

import { useChat } from 'ai/react';
import { useCallback, useMemo, useRef } from 'react';
import { useNotebook } from '@/hooks/notebook-store';
import { listCellsSchema, listCellsToolName } from '@/ai-functions/list-cells';
import { updateCellSchema, updateCellToolName } from '@/ai-functions/update-cell';

type TextPart = { type: 'text'; text?: string; textDelta?: string };
type ToolCallPart =
  | { type: 'tool-call'; toolInvocation: { toolCallId: string; toolName: string; args?: unknown } }
  | { type: 'tool-call'; toolCallId: string; toolName: string; args?: unknown };
type ToolResultPart =
  | {
      type: 'tool-result';
      toolInvocation: { toolCallId: string; toolName: string };
      result: unknown;
      isError?: boolean;
    }
  | {
      type: 'tool-result';
      toolCallId: string;
      toolName: string;
      result: unknown;
      isError?: boolean;
    };
type Part = TextPart | ToolCallPart | ToolResultPart | { type: string; [key: string]: unknown };
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
      .map((p) => {
        const maybe = p as { text?: string; textDelta?: string };
        return typeof maybe.text === 'string'
          ? maybe.text
          : typeof maybe.textDelta === 'string'
            ? maybe.textDelta
            : '';
      })
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
  const notebook = useNotebook();

  const apiPath =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('mock-ai') === '1'
      ? '/api/chat?mock=1'
      : '/api/chat';

  const { messages, input, handleInputChange, handleSubmit, isLoading, addToolResult } = useChat({
    api: apiPath,
    initialInput: '',
    maxSteps: 5,
    onToolCall: async ({ toolCall }) => {
      const { toolName, args } = toolCall as { toolName: string; args?: unknown };
      if (toolName === listCellsToolName) {
        const parsed = listCellsSchema.parse(args ?? {});
        void parsed;
        const cells = notebook.getSnapshot().map((c) => ({
          id: c.id,
          type: c.type,
          text: c.text,
          status: c.status,
          output: c.output,
        }));
        return { cells } as const;
      }
      if (toolName === updateCellToolName) {
        const parsed = updateCellSchema.parse(args ?? {});
        notebook.setCellText(parsed.id, parsed.text);
        return { success: true } as const;
      }
      return undefined;
    },
  });

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !(e.shiftKey || e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const form = textareaRef.current?.closest('form');
      if (form) form.requestSubmit();
    }
  }, []);

  const renderedMessages = useMemo(() => {
    return messages.map((m) => {
      const roleLabel = m.role === 'user' ? 'You' : 'Assistant';

      const msgAny = m as unknown as { parts?: Part[] };
      const parts = msgAny.parts;
      const hasParts = Array.isArray(parts);

      const partElements = (hasParts ? parts! : []).map((p, idx) => {
        if ((p as { type?: string }).type === 'text') {
          const tp = p as TextPart;
          const text = tp.text ?? tp.textDelta ?? '';
          return (
            <div key={idx} className="whitespace-pre-wrap">
              {text}
            </div>
          );
        }
        if ((p as { type?: string }).type === 'tool-call') {
          const tp = p as ToolCallPart;
          const toolName =
            'toolInvocation' in tp
              ? tp.toolInvocation.toolName
              : (tp as { toolName: string }).toolName;
          return (
            <div
              key={idx}
              className="text-xs rounded px-2 py-1 bg-blue-50 text-blue-800 border border-blue-200"
            >
              Calling {toolName}
            </div>
          );
        }
        if ((p as { type?: string }).type === 'tool-result') {
          const tr = p as ToolResultPart;
          const isError = !!tr.isError;
          const classes = isError
            ? 'bg-red-50 text-red-800 border-red-200'
            : 'bg-green-50 text-green-800 border-green-200';
          return (
            <div key={idx} className={`text-xs rounded px-2 py-1 border ${classes}`}>
              {isError ? 'Tool failed' : 'Tool success'}
            </div>
          );
        }
        return null;
      });

      const hasAnyParts = partElements.some((el) => el !== null);

      return (
        <div
          key={m.id}
          className={`text-sm whitespace-pre-wrap leading-relaxed ${m.role === 'user' ? 'text-black' : 'text-black/80'}`}
        >
          <div className="font-medium mb-1">{roleLabel}</div>
          {hasAnyParts ? partElements : <div>{getMessageText(m)}</div>}
        </div>
      );
    });
  }, [messages]);

  return (
    <div className="w-full max-w-3xl border border-black/[.08] rounded">
      <div className="p-3 flex flex-col gap-2 max-h-64 overflow-y-auto bg-white">
        {renderedMessages}
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
