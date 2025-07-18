import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import ToolCallIcon from '../ToolCallIcon';
import { ToolInvocation } from 'ai';

describe('ToolCallIcon', () => {
  it('renders success icon and tooltip', () => {
    const toolCall: ToolInvocation = {
      toolCallId: '1',
      toolName: 'test-tool',
      args: {},
      result: 'success',
    };
    const { getByTitle } = render(<ToolCallIcon toolCall={toolCall} />);
    expect(getByTitle('test-tool (success)')).toBeInTheDocument();
  });

  it('renders failure icon and tooltip', () => {
    const toolCall: ToolInvocation = {
      toolCallId: '1',
      toolName: 'test-tool',
      args: {},
      error: 'failure',
    };
    const { getByTitle } = render(<ToolCallIcon toolCall={toolCall} />);
    expect(getByTitle('test-tool (failure)')).toBeInTheDocument();
  });

  it('renders in-progress icon and tooltip', () => {
    const toolCall: ToolInvocation = {
      toolCallId: '1',
      toolName: 'test-tool',
      args: {},
    };
    const { getByTitle } = render(<ToolCallIcon toolCall={toolCall} />);
    expect(getByTitle('test-tool (in-progress)')).toBeInTheDocument();
  });

  it('toggles expansion on click', () => {
    const toolCall: ToolInvocation = {
      toolCallId: '1',
      toolName: 'test-tool',
      args: { a: 1 },
      result: 'success',
    };
    const { getByTitle, queryByText } = render(<ToolCallIcon toolCall={toolCall} />);
    const icon = getByTitle('test-tool (success)');

    expect(queryByText(/Arguments/)).not.toBeInTheDocument();

    fireEvent.click(icon);

    expect(queryByText(/Arguments/)).toBeInTheDocument();

    fireEvent.click(icon);

    expect(queryByText(/Arguments/)).not.toBeInTheDocument();
  });
});
