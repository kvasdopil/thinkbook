import { useEffect, useRef } from 'react';

interface UseAutoScrollOptions<T> {
  dependency: T[];
}

export const useAutoScroll = <T>({ dependency }: UseAutoScrollOptions<T>) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const { scrollHeight, clientHeight, scrollTop } = scrollRef.current;
      const isScrolledToBottom = scrollHeight - clientHeight <= scrollTop + 1;

      if (isScrolledToBottom) {
        const lastElement = scrollRef.current.lastElementChild;
        if (lastElement) {
          lastElement.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
            block: 'end',
          });
        }
      }
    }
  }, [dependency]);

  return scrollRef;
};
