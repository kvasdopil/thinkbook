'use client';

import { UnifiedConversation } from '@/components/UnifiedConversation';
import { useState } from 'react';

export default function Home() {
  const [version, setVersion] = useState(0);
  return (
    <main className="min-h-screen p-8 flex flex-col items-center gap-6">
      <h1 className="text-3xl font-semibold">Python Runner</h1>
      <p className="text-base">Hello World</p>
      <div className="w-full max-w-3xl flex gap-2 items-center">
        <button
          className="px-3 py-1.5 rounded border border-black/[.08] hover:bg-[#f2f2f2] cursor-pointer"
          onClick={() => setVersion((v) => v + 1)}
        >
          Re-render parent
        </button>
        <span className="text-sm text-black/60">Version: {version}</span>
      </div>
      <UnifiedConversation />
    </main>
  );
}
