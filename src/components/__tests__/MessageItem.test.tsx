import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import MessageItem from '../MessageItem';
import { Message } from 'ai/react';

const mockMessage: Message = {
  id: '1',
  content: 'Hello, world!',
  role: 'user',
  createdAt: new Date(),
};

describe('MessageItem', () => {
  it('renders the message content', () => {
    render(
      <MessageItem
        message={mockMessage}
        isEditing={false}
        onStartEdit={() => {}}
        onSave={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
  });

  it('enters edit mode on click', () => {
    const handleStartEdit = jest.fn();
    render(
      <MessageItem
        message={mockMessage}
        isEditing={false}
        onStartEdit={handleStartEdit}
        onSave={() => {}}
        onCancel={() => {}}
      />
    );
    fireEvent.click(screen.getByText('Hello, world!'));
    expect(handleStartEdit).toHaveBeenCalledWith('1');
  });

  it('shows textarea and buttons in edit mode', () => {
    render(
      <MessageItem
        message={mockMessage}
        isEditing={true}
        onStartEdit={() => {}}
        onSave={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByLabelText('Send')).toBeInTheDocument();
    expect(screen.getByLabelText('Cancel')).toBeInTheDocument();
  });

  it('calls onSave with the new content when Send is clicked', () => {
    const handleSave = jest.fn();
    render(
      <MessageItem
        message={mockMessage}
        isEditing={true}
        onStartEdit={() => {}}
        onSave={handleSave}
        onCancel={() => {}}
      />
    );
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'New content' },
    });
    fireEvent.click(screen.getByLabelText('Send'));
    expect(handleSave).toHaveBeenCalledWith('New content');
  });

  it('calls onCancel when Cancel is clicked', () => {
    const handleCancel = jest.fn();
    render(
      <MessageItem
        message={mockMessage}
        isEditing={true}
        onStartEdit={() => {}}
        onSave={() => {}}
        onCancel={handleCancel}
      />
    );
    fireEvent.click(screen.getByLabelText('Cancel'));
    expect(handleCancel).toHaveBeenCalled();
  });

  it('calls onCancel when Escape is pressed', () => {
    const handleCancel = jest.fn();
    render(
      <MessageItem
        message={mockMessage}
        isEditing={true}
        onStartEdit={() => {}}
        onSave={() => {}}
        onCancel={handleCancel}
      />
    );
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
    expect(handleCancel).toHaveBeenCalled();
  });

  it('calls onSave when Enter is pressed without Shift', () => {
    const handleSave = jest.fn();
    render(
      <MessageItem
        message={mockMessage}
        isEditing={true}
        onStartEdit={() => {}}
        onSave={handleSave}
        onCancel={() => {}}
      />
    );
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(handleSave).toHaveBeenCalled();
  });
});
