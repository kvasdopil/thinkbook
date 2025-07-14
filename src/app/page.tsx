import CodeEditor from '@/components/CodeEditor'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Jupyter Engine - Python in Browser
        </h1>
        <CodeEditor />
      </div>
    </main>
  )
}
