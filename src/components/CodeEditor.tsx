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
  const onChangeRef = useRef(onChange);

  // Keep onChange callback reference stable
  onChangeRef.current = onChange;

  // Initialize editor only once
  useEffect(() => {
    if (!containerRef.current || editorRef.current) {
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

    // Listen for content changes
    const disposable = editor.onDidChangeModelContent(() => {
      const currentValue = editor.getValue();
      onChangeRef.current(currentValue);
    });

    // Cleanup function
    return () => {
      disposable.dispose();
      editor.dispose();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Initialize only once - props handled in separate effects

  // Update editor value when prop changes (avoid setting if it's the same)
  useEffect(() => {
    if (editorRef.current && editorRef.current.getValue() !== value) {
      const position = editorRef.current.getPosition();
      const selection = editorRef.current.getSelection();

      // Set value without triggering change event
      editorRef.current.setValue(value);

      // Restore cursor position and selection
      if (position) {
        editorRef.current.setPosition(position);
      }
      if (selection) {
        editorRef.current.setSelection(selection);
      }
    }
  }, [value]);

  // Update editor options when props change
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        readOnly,
      });
      // Update language model if needed
      const model = editorRef.current.getModel();
      if (model && model.getLanguageId() !== language) {
        monaco.editor.setModelLanguage(model, language);
      }
    }
  }, [readOnly, language]);

  return (
    <div
      ref={containerRef}
      style={{ height: `${height}px` }}
      className="border border-gray-300 rounded-md overflow-hidden"
    />
  );
}
