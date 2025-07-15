'use client'

import { useState } from 'react'
import CodeEditor from '@/components/CodeEditor'
import Chat from '@/components/Chat'

export default function Home() {
  const [cellCode, setCellCode] = useState(
    '# Write your Python code here\nprint("Hello, World!")'
  )
  const [cellOutput, setCellOutput] = useState('Python environment ready! 🐍')

  const handleCodeChange = (newCode: string) => {
    setCellCode(newCode)
  }

  const handleOutputChange = (newOutput: string) => {
    setCellOutput(newOutput)
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Jupyter Engine - Python in Browser
        </h1>
        <Chat
          cellCode={cellCode}
          cellOutput={cellOutput}
          onCellCodeChange={handleCodeChange}
        />
        <CodeEditor
          initialCode={cellCode}
          onCodeChange={handleCodeChange}
          onOutputChange={handleOutputChange}
        />
      </div>
    </main>
  )
}
