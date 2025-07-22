
import { useEffect, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import { Button } from '@/components/ui/button';
import { Save, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CodeEditorProps {
  content: string;
  fileName: string;
  onSave: (content: string) => void;
  readOnly?: boolean;
}

const getLanguageExtension = (fileName: string): Extension[] => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'js':
    case 'jsx':
      return [javascript({ jsx: true })];
    case 'ts':
    case 'tsx':
      return [javascript({ jsx: true, typescript: true })];
    case 'html':
    case 'htm':
      return [html()];
    case 'css':
    case 'scss':
    case 'sass':
      return [css()];
    case 'json':
      return [json()];
    default:
      return [];
  }
};

export const CodeEditor = ({ content, fileName, onSave, readOnly = false }: CodeEditorProps) => {
  const [value, setValue] = useState(content);
  const [isDirty, setIsDirty] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setValue(content);
    setIsDirty(false);
  }, [content, fileName]);

  const handleSave = () => {
    onSave(value);
    setIsDirty(false);
    toast({
      title: "File saved",
      description: `${fileName} has been saved successfully.`,
    });
  };

  const handleDownload = () => {
    const blob = new Blob([value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const extensions: Extension[] = [
    ...getLanguageExtension(fileName),
    EditorView.theme({
      '&': {
        fontSize: '14px',
        height: '100%',
      },
      '.cm-focused': {
        outline: 'none',
      },
      '.cm-editor': {
        height: '100%',
      },
      '.cm-scroller': {
        fontFamily: 'JetBrains Mono, Consolas, Monaco, "Courier New", monospace',
      },
      '.cm-content': {
        padding: '12px',
      },
      '.cm-line': {
        padding: '0 4px',
      },
    }),
    EditorView.lineWrapping,
  ];

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center justify-between p-2 border-b border-border bg-muted/20">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">{fileName}</span>
          {isDirty && <span className="text-xs text-primary">●</span>}
        </div>
        <div className="flex items-center space-x-2">
          {!readOnly && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSave}
              disabled={!isDirty}
            >
              <Save size={14} className="mr-1" />
              Save
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
          >
            <Download size={14} className="mr-1" />
            Download
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <CodeMirror
          value={value}
          onChange={(val) => {
            setValue(val);
            setIsDirty(val !== content);
          }}
          extensions={extensions}
          readOnly={readOnly}
          height="100%"
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            dropCursor: false,
            allowMultipleSelections: false,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            highlightSelectionMatches: false,
          }}
        />
      </div>
    </div>
  );
};
