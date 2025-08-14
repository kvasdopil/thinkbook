'use client';

import { PythonRunner } from '@/components/PythonRunner';
import { AIChat } from '@/components/AIChat';
import { useEffect, useMemo, useState } from 'react';
import { useNotebook } from '@/hooks/notebook-store';
import { FaPlay, FaPlus } from 'react-icons/fa';

export default function Home() {
  const { cells, registerOrUpdateCell, getController } = useNotebook();
  const [lastOutput, setLastOutput] = useState('');
  const [version, setVersion] = useState(0);
  const onOutputChange = (o: string) => setLastOutput(o);

  // First cell is provided by the store's initial state

  const anyRunning = useMemo(
    () => cells.some((c) => getController(c.id)?.isRunning() === true),
    [cells, getController],
  );

  return (
    <main className="min-h-screen p-8 flex flex-col items-center gap-6">
      <h1 className="text-3xl font-semibold">Python Runner</h1>
      <p className="text-base">Hello World</p>
      <AIChat />

      <div className="w-full max-w-3xl flex gap-2 items-center">
        <button
          className="px-3 py-1.5 rounded border border-black/[.08] hover:bg-[#f2f2f2] cursor-pointer"
          onClick={() => setVersion((v) => v + 1)}
        >
          Re-render parent
        </button>
        <span className="text-sm text-black/60">Version: {version}</span>
      </div>

      <div className="w-full max-w-3xl flex items-center gap-2">
        <button
          className="px-3 py-2 rounded border border-black/[.08] hover:bg-[#f2f2f2] cursor-pointer flex items-center gap-2"
          onClick={async () => {
            for (const cell of cells) {
              const controller = getController(cell.id);
              if (!controller) continue;
              await controller.run();
            }
          }}
          disabled={anyRunning || cells.length === 0}
          title="Execute all cells"
          aria-label="Execute all cells"
        >
          <FaPlay />
          <span className="text-sm">Run All</span>
        </button>
        <button
          className="px-3 py-2 rounded border border-black/[.08] hover:bg-[#f2f2f2] cursor-pointer flex items-center gap-2"
          onClick={() => {
            const nextIndex = cells.length + 1;
            registerOrUpdateCell({ id: `cell-${nextIndex}`, type: 'python', text: '' });
          }}
          disabled={anyRunning}
          title="Add cell"
          aria-label="Add cell"
        >
          <FaPlus />
          <span className="text-sm">Add Cell</span>
        </button>
        <div className="ml-auto text-xs text-black/60">Last output size: {lastOutput.length}</div>
      </div>

      <div className="w-full max-w-3xl flex flex-col gap-8">
        {cells.map((c) => (
          <PythonRunner key={c.id} id={c.id} onOutputChange={onOutputChange} />
        ))}
      </div>
    </main>
  );
}
