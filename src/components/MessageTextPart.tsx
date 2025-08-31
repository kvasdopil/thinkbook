import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageTextPartProps {
  part: { type: 'text'; text: string };
}

export function MessageTextPart({ part }: MessageTextPartProps) {
  return (
    <div className="w-full prose prose-gray max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-code:text-gray-800 gap-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="my-2">{children}</p>,
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300">
                {children}
              </table>
            </div>
          ),
          ul: ({ children }) => <ul className="ml-2">{children}</ul>,
          ol: ({ children }) => <ol className="ml-2">{children}</ol>,
          th: ({ children }) => (
            <th className="border border-gray-300 px-4 py-2 bg-gray-50 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-300 px-4 py-2">{children}</td>
          ),
          code: ({ children, className, ...props }) => {
            const isInline = !className || !className.includes('language-');
            if (isInline) {
              return (
                <code
                  className="bg-gray-200 px-1 py-[0.15rem] rounded text-sm"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className="block bg-gray-900 text-gray-100 p-4 rounded-lg text-sm font-mono overflow-x-auto whitespace-pre"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => {
            return <div className="my-4">{children}</div>;
          },
        }}
      >
        {part.text}
      </ReactMarkdown>
    </div>
  );
}
