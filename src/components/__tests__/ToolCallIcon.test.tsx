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
      state: 'result',
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
      state: 'error',
    };
    const { getByTitle } = render(<ToolCallIcon toolCall={toolCall} />);
    expect(getByTitle('test-tool (failure)')).toBeInTheDocument();
  });

  it('renders in-progress icon and tooltip', () => {
    const toolCall: ToolInvocation = {
      toolCallId: '1',
      toolName: 'test-tool',
      args: {},
      state: 'call',
    };
    const { getByTitle } = render(<ToolCallIcon toolCall={toolCall} />);
    expect(getByTitle('test-tool (in-progress)')).toBeInTheDocument();
  });

  it('renders cancelled icon and tooltip', () => {
    const toolCall: ToolInvocation = {
      toolCallId: '1',
      toolName: 'test-tool',
      args: {},
      state: 'cancelled',
    };
    const { getByTitle } = render(<ToolCallIcon toolCall={toolCall} />);
    expect(getByTitle('test-tool (cancelled)')).toBeInTheDocument();
  });

  it('toggles expansion on click', () => {
    const toolCall: ToolInvocation = {
      toolCallId: '1',
      toolName: 'test-tool',
      args: { a: 1 },
      result: 'success',
      state: 'result',
    };
    const { getByTitle, queryByText } = render(<ToolCallIcon toolCall={toolCall} />);
    const icon = getByTitle('test-tool (success)');

    expect(queryByText(/Request parameters/)).not.toBeInTheDocument();

    fireEvent.click(icon);

    expect(queryByText(/Request parameters/)).toBeInTheDocument();

    fireEvent.click(icon);

    expect(queryByText(/Request parameters/)).not.toBeInTheDocument();
  });

  it('toggles expansion on keyboard event', () => {
    const toolCall: ToolInvocation = {
      toolCallId: '1',
      toolName: 'test-tool',
      args: { a: 1 },
      result: 'success',
      state: 'result',
    };
    const { getByTitle, queryByText } = render(<ToolCallIcon toolCall={toolCall} />);
    const icon = getByTitle('test-tool (success)');

    expect(queryByText(/Request parameters/)).not.toBeInTheDocument();

    fireEvent.keyDown(icon, { key: 'Enter', code: 'Enter' });

    expect(queryByText(/Request parameters/)).toBeInTheDocument();

    fireEvent.keyDown(icon, { key: ' ', code: 'Space' });

    expect(queryByText(/Request parameters/)).not.toBeInTheDocument();
  });
});
