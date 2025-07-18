import { useEffect, useRef } from 'react';

interface UseAutoScrollOptions {
  dependency: unknown[];
}

export const useAutoScroll = ({ dependency }: UseAutoScrollOptions) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLength = useRef(dependency.length);

  useEffect(() => {
    const added = dependency.length > prevLength.current;
    prevLength.current = dependency.length;
    if (!added) return;

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
