import { renderHook } from '@testing-library/react';
import { useAutoScroll } from './useAutoScroll';

describe('useAutoScroll', () => {
  let scrollIntoViewMock: jest.Mock;

  beforeEach(() => {
    scrollIntoViewMock = jest.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  it('should not scroll if not at the bottom', () => {
    const { rerender, result } = renderHook(({ dependency }) => useAutoScroll({ dependency }), {
        initialProps: { dependency: [[1]] },
      },
    );

    const scrollRef = result.current;
    Object.defineProperty(scrollRef, 'current', {
      value: {
        scrollHeight: 1000,
        clientHeight: 500,
        scrollTop: 0,
        lastElementChild: document.createElement('div'),
      },
      writable: true,
    });

    rerender({ dependency: [[1, 2]] });

    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });

  it('should scroll if at the bottom', () => {
    const { result, rerender } = renderHook(({ dependency }) => useAutoScroll({ dependency }), {
      initialProps: { dependency: [[1]] },
    });

    const scrollRef = result.current;
    Object.defineProperty(scrollRef, 'current', {
      value: {
        scrollHeight: 1000,
        clientHeight: 500,
        scrollTop: 500,
        lastElementChild: document.createElement('div'),
      },
      writable: true,
    });

    rerender({ dependency: [[1, 2]] });

    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  it('should not scroll on deletion', () => {
    const { rerender } = renderHook(({ dependency }) => useAutoScroll({ dependency }), {
      initialProps: { dependency: [[1, 2]] },
    });

    rerender({ dependency: [[1]] });

    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });

  it('should not scroll on modification', () => {
    const { rerender } = renderHook(({ dependency }) => useAutoScroll({ dependency }), {
      initialProps: { dependency: [[1]] },
    });

    rerender({ dependency: [[2]] });

    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });
});
