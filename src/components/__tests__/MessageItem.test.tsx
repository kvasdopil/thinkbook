import React from 'react';
import { render, screen } from '@testing-library/react';
import MessageItem from '../MessageItem';

jest.mock('react-markdown', () => {
  return function MockReactMarkdown({ children }: { children: string }) {
    return <>{children}</>;
  };
});

describe('MessageItem', () => {
  it('renders multiple tool calls inline', () => {
    const message = {
      id: '1',
      role: 'assistant',
      parts: [
        {
          type: 'tool-invocation',
          toolInvocation: {
            toolCallId: 'call-1',
            toolName: 'listCells',
            args: {},
            state: 'result',
            result: 'Found 1 cell',
          },
        },
        {
          type: 'tool-invocation',
          toolInvocation: {
            toolCallId: 'call-2',
            toolName: 'createCodeCell',
            args: { text: 'print("Hello")' },
            state: 'result',
            result: { success: true },
          },
        },
      ],
    };

    const { container } = render(<MessageItem message={message as any} />);
    const toolInvocationsContainer = container.querySelector('.flex.items-center.space-x-2');
    expect(toolInvocationsContainer).toBeInTheDocument();
    expect(toolInvocationsContainer?.children.length).toBe(2);
    expect(screen.getByTitle('listCells (success)')).toBeInTheDocument();
    expect(screen.getByTitle('createCodeCell (success)')).toBeInTheDocument();
  });
});
