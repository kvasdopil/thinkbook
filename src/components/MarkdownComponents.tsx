import React from 'react'

export const MarkdownComponents = {
  h1: ({ node, ...props }) => (
    <h1 className="text-2xl font-bold my-4" {...props} />
  ),
  h2: ({ node, ...props }) => (
    <h2 className="text-xl font-bold my-3" {...props} />
  ),
  h3: ({ node, ...props }) => (
    <h3 className="text-lg font-bold my-2" {...props} />
  ),
  p: ({ node, ...props }) => <p className="mb-4" {...props} />,
  ul: ({ node, ...props }) => (
    <ul className="list-disc list-inside mb-4" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol className="list-decimal list-inside mb-4" {...props} />
  ),
  li: ({ node, ...props }) => <li className="mb-1" {...props} />,
  table: ({ node, ...props }) => (
    <div className="overflow-x-auto">
      <table className="table-auto w-full" {...props} />
    </div>
  ),
  thead: ({ node, ...props }) => <thead className="bg-gray-100" {...props} />,
  th: ({ node, ...props }) => (
    <th className="px-4 py-2 text-left font-bold" {...props} />
  ),
  td: ({ node, ...props }) => <td className="border px-4 py-2" {...props} />,
  code: ({ node, inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '')
    return !inline && match ? (
      <div className="bg-gray-800 text-white p-4 rounded-md my-4 overflow-x-auto">
        <pre>
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      </div>
    ) : (
      <code
        className="bg-gray-200 text-gray-800 px-1 rounded-md"
        {...props}
      >
        {children}
      </code>
    )
  },
}
