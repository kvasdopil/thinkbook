'use client';

import { useChat } from 'ai/react';
import { useCallback, useMemo, useRef } from 'react';
import { PythonRunner } from '@/components/PythonRunner';
import { useNotebook } from '@/hooks/notebook-store';
import { listCellsSchema, listCellsToolName } from '@/ai-functions/list-cells';
import { updateCellSchema, updateCellToolName } from '@/ai-functions/update-cell';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

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

export function UnifiedConversation() {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const notebook = useNotebook();
  const { cells, getSnapshot, getController, registerOrUpdateCell } = notebook;

  const apiPath =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('mock-ai') === '1'
      ? '/api/chat?mock=1'
      : '/api/chat';

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: apiPath,
    initialInput: '',
    maxSteps: 5,
    onToolCall: async ({ toolCall }) => {
      const { toolName, args } = toolCall as { toolName: string; args?: unknown };
      if (toolName === listCellsToolName) {
        const parsed = listCellsSchema.parse(args ?? {});
        void parsed;
        const cells = getSnapshot().map((c) => ({
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

  const renderedMessage = useCallback((m: { id: string; role: 'user' | 'assistant' } & unknown) => {
    const roleLabel = m.role === 'user' ? 'You' : 'Assistant';

    const msgAny = m as unknown as { parts?: Part[] };
    const parts = msgAny.parts;
    const hasPartsArr = Array.isArray(parts);

    const partElements = (hasPartsArr ? parts! : []).map((p, idx) => {
      if ((p as { type?: string }).type === 'text') {
        const tp = p as TextPart;
        const text = tp.text ?? tp.textDelta ?? '';
        return <MarkdownRenderer key={idx} content={text} />;
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
        {hasAnyParts ? partElements : <MarkdownRenderer content={getMessageText(m)} />}
      </div>
    );
  }, []);

  const messagesForRender = useMemo(() => {
    const isBrowser = typeof window !== 'undefined';
    const mock = isBrowser && new URLSearchParams(window.location.search).get('mock-ai') === '1';
    if (mock) {
      const hasAssistant = messages.some((m) => (m as { role?: string }).role === 'assistant');
      if (!hasAssistant) {
        return [
          ...messages,
          {
            id: 'mock-msg-1',
            role: 'assistant',
            content:
              '# Mock Markdown\n\nHere is a table and some code.\n\n| Col A | Col B |\n| --- | --- |\n| 1 | 2 |\n\n```ts\nconsole.log("hello");\n```',
          } as unknown as { id: string; role: 'assistant' },
        ];
      }
    }
    return messages;
  }, [messages]);

  const lastMessageId = useMemo(
    () => messagesForRender[messagesForRender.length - 1]?.id ?? null,
    [messagesForRender],
  );

  const anyRunning = useMemo(
    () => cells.some((c) => getController(c.id)?.isRunning() === true),
    [cells, getController],
  );

  const conversationItems = useMemo(() => {
    const items: Array<{ type: 'message'; id: string } | { type: 'cell'; id: string }> = [];
    const cellsByLink = new Map<string | null, string[]>([]);
    for (const c of cells) {
      const key = (c as { linkedMessageId?: string | null }).linkedMessageId ?? null;
      const arr = cellsByLink.get(key) ?? [];
      arr.push(c.id);
      cellsByLink.set(key, arr);
    }
    // cells not linked to any message go first
    for (const cellId of cellsByLink.get(null) ?? []) items.push({ type: 'cell', id: cellId });
    // then for each message in order: message then its cells
    for (const m of messagesForRender) {
      items.push({ type: 'message', id: m.id });
      for (const cellId of cellsByLink.get(m.id) ?? []) items.push({ type: 'cell', id: cellId });
    }
    return items;
  }, [cells, messagesForRender]);

  const isMockMode = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('mock-ai') === '1';
  }, []);

  return (
    <div
      className="w-full max-w-3xl border border-black/[.08] rounded flex flex-col"
      style={{ minHeight: '60vh' }}
    >
      <div className="p-3 flex items-center gap-2 border-b border-black/[.06] bg-black/[.02]">
        <button
          className="px-3 py-2 rounded border border-black/[.08] hover:bg-[#f2f2f2] cursor-pointer flex items-center gap-2"
          onClick={async () => {
            for (const cell of cells) {
              const controller = getController(cell.id);
              if (!controller) continue;
              // eslint-disable-next-line no-await-in-loop
              await controller.run();
            }
          }}
          disabled={anyRunning || cells.length === 0}
          title="Execute all cells"
          aria-label="Execute all cells"
        >
          <span className="text-sm">Run All</span>
        </button>
        <button
          className="px-3 py-2 rounded border border-black/[.08] hover:bg-[#f2f2f2] cursor-pointer flex items-center gap-2"
          onClick={() => {
            const nextIndex = cells.length + 1;
            registerOrUpdateCell({
              id: `cell-${nextIndex}`,
              type: 'python',
              text: '',
              linkedMessageId: lastMessageId,
            });
          }}
          disabled={anyRunning}
          title="Add cell"
          aria-label="Add cell"
        >
          <span className="text-sm">Add Cell</span>
        </button>
        {isMockMode ? (
          <div className="text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded px-2 py-1">
            mock-ai
          </div>
        ) : null}
        <div className="ml-auto text-xs text-black/60">{isLoading ? 'responding' : 'idle'}</div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
        {conversationItems.map((item) => {
          if (item.type === 'message') {
            const m = messagesForRender.find((x) => x.id === item.id);
            if (!m) return null;
            return renderedMessage(
              m as unknown as { id: string; role: 'user' | 'assistant' } & unknown,
            );
          }
          return <PythonRunner key={item.id} id={item.id} />;
        })}
      </div>

      <form
        className="p-3 flex flex-col gap-2 border-t border-black/[.06] bg-black/[.02] sticky bottom-0"
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
