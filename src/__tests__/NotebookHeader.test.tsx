import { render, screen, fireEvent } from '@testing-library/react';
import { NotebookHeader } from '@/components/NotebookHeader';

describe('NotebookHeader', () => {
  it('renders the title and settings icon', () => {
    render(
      <NotebookHeader
        title="Test Title"
        onTitleChange={() => {}}
        onSettingsClick={() => {}}
      />
    );

    expect(screen.getByDisplayValue('Test Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Settings')).toBeInTheDocument();
  });

  it('calls onTitleChange when the title is edited and blurred', () => {
    const handleTitleChange = jest.fn();
    render(
      <NotebookHeader
        title="Test Title"
        onTitleChange={handleTitleChange}
        onSettingsClick={() => {}}
      />
    );

    const titleInput = screen.getByDisplayValue('Test Title');
    fireEvent.change(titleInput, { target: { value: 'New Title' } });
    fireEvent.blur(titleInput);

    expect(handleTitleChange).toHaveBeenCalledWith('New Title');
  });

  it('does not call onTitleChange if the title is unchanged', () => {
    const handleTitleChange = jest.fn();
    render(
      <NotebookHeader
        title="Test Title"
        onTitleChange={handleTitleChange}
        onSettingsClick={() => {}}
      />
    );

    const titleInput = screen.getByDisplayValue('Test Title');
    fireEvent.blur(titleInput);

    expect(handleTitleChange).not.toHaveBeenCalled();
  });

  it('calls onSettingsClick when the settings icon is clicked', () => {
    const handleSettingsClick = jest.fn();
    render(
      <NotebookHeader
        title="Test Title"
        onTitleChange={() => {}}
        onSettingsClick={handleSettingsClick}
      />
    );

    fireEvent.click(screen.getByLabelText('Settings'));
    expect(handleSettingsClick).toHaveBeenCalled();
  });
});
