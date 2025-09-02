import { useRef, useEffect } from 'react';
import * as monaco from 'monaco-editor';
import { configureMonacoWorkers } from '../utils/monacoWorkers';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: number;
  readOnly?: boolean;
  placeholder?: string;
}

export function CodeEditor({
  value,
  onChange,
  language = 'python',
  height = 200,
  readOnly = false,
  placeholder,
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!containerRef.current || isInitialized.current) {
      return;
    }

    // Configure Monaco workers for proper operation
    configureMonacoWorkers();

    // Create the editor
    const editor = monaco.editor.create(containerRef.current, {
      value: value || placeholder || '',
      language,
      theme: 'vs-dark',
      automaticLayout: true,
      readOnly,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineNumbers: 'on',
      folding: true,
      wordWrap: 'on',
      wrappingIndent: 'indent',
      lineHeight: 20,
      tabSize: 4,
      insertSpaces: true,
      scrollbar: {
        vertical: 'auto',
        horizontal: 'auto',
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8,
      },
    });

    editorRef.current = editor;
    isInitialized.current = true;

    // Listen for content changes
    const disposable = editor.onDidChangeModelContent(() => {
      const currentValue = editor.getValue();
      onChange(currentValue);
    });

    // Cleanup function
    return () => {
      disposable.dispose();
      editor.dispose();
      isInitialized.current = false;
    };
  }, [language, onChange, placeholder, readOnly, value]);

  // Update editor value when prop changes
  useEffect(() => {
    if (editorRef.current && editorRef.current.getValue() !== value) {
      const position = editorRef.current.getPosition();
      editorRef.current.setValue(value);
      if (position) {
        editorRef.current.setPosition(position);
      }
    }
  }, [value]);

  // Update readonly state
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ readOnly });
    }
  }, [readOnly]);

  return (
    <div
      ref={containerRef}
      style={{ height: `${height}px` }}
      className="border border-gray-300 rounded-md overflow-hidden"
    />
  );
}
