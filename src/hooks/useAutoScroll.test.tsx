import { renderHook } from '@testing-library/react';
import { useAutoScroll } from './useAutoScroll';

describe('useAutoScroll', () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
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
    const { rerender } = renderHook(({ dependency }) => useAutoScroll({ dependency }), {
      initialProps: { dependency: [[1]] },
    });

    const scrollRef = { current: { scrollHeight: 1000, clientHeight: 500, scrollTop: 0, lastElementChild: document.createElement('div') } };
    Object.defineProperty(scrollRef, 'current', {
      get: () => ({ scrollHeight: 1000, clientHeight: 500, scrollTop: 0, lastElementChild: document.createElement('div') }),
    });

    rerender({ dependency: [[1, 2]] });

    expect(window.HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
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

    rerender({ dependency: [[1, 2]]});

    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
