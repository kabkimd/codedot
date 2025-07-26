import { useEffect, useState, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, keymap, highlightActiveLine, lineNumbers } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { search, searchKeymap } from '@codemirror/search';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { tags } from '@lezer/highlight';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CodeEditorProps {
  content: string;
  fileName: string;
  onSave: (content: string) => void;
  /**
   * Called whenever the editor content changes.
   */
  onContentChange?: (content: string) => void;
  /**
   * Called whenever the dirty state changes.
   */
  onDirtyChange?: (dirty: boolean) => void;
  readOnly?: boolean;
}

const getLanguageExtension = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  // Add console.log to debug language detection
  console.log('CodeEditor - File:', fileName, 'Extension:', extension);
  
  switch (extension) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx': {
      const jsExt = [javascript({ jsx: true, typescript: extension.includes('ts') })];
      console.log('CodeEditor - Using JavaScript extension:', jsExt);
      return jsExt;
    }
    case 'html':
      console.log('CodeEditor - Using HTML extension');
      return [html()];
    case 'css':
    case 'scss':
      console.log('CodeEditor - Using CSS extension');
      return [css()];
    case 'json':
      console.log('CodeEditor - Using JSON extension');
      return [json()];
    case 'md':
    case 'markdown':
      console.log('CodeEditor - Using Markdown extension');
      return [markdown()];
    default:
      console.log('CodeEditor - No language extension found');
      return [];
  }
};

export const CodeEditor = ({
  content,
  fileName,
  onSave,
  onContentChange,
  onDirtyChange,
  readOnly = false,
}: CodeEditorProps) => {
  const [value, setValue] = useState(content);
  const [isDirty, setIsDirty] = useState(false);
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  
  // Use theme based on app theme
  const editorTheme = resolvedTheme === 'dark' ? oneDark : undefined;

  useEffect(() => {
    setValue(content);
    setIsDirty(false);
    onDirtyChange?.(false);
    onContentChange?.(content);
  }, [content, fileName, onContentChange, onDirtyChange]);

  const handleSave = useCallback(() => {
    onSave(value);
    setIsDirty(false);
    onDirtyChange?.(false);
    toast({
      title: "File saved",
      description: `${fileName} has been saved successfully.`,
    });
  }, [onSave, value, onDirtyChange, fileName, toast]);

  // Save file with Ctrl+S / Cmd+S
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (!readOnly && isDirty) {
          handleSave();
        }
      }
    },
    [handleSave, readOnly, isDirty]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);


  const extensions = [
    lineNumbers(),
    highlightActiveLine(),
    bracketMatching(),
    autocompletion(),
    history(),
    keymap.of([
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...completionKeymap,
    ]),
    syntaxHighlighting(defaultHighlightStyle),
    ...getLanguageExtension(fileName),
    search(),
  ];

  // Debug: Log all extensions
  console.log('CodeEditor - All extensions:', extensions);
  console.log('CodeEditor - Theme:', editorTheme);
  console.log('CodeEditor - FileName:', fileName);

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
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <CodeMirror
          key={resolvedTheme}
          value={value}
          theme={editorTheme}
          onChange={(val) => {
            setValue(val);
            const dirty = val !== content;
            setIsDirty(dirty);
            onDirtyChange?.(dirty);
            onContentChange?.(val);
          }}
          extensions={extensions}
          readOnly={readOnly}
          style={{
            height: '100%',
            fontSize: '14px',
          }}
        />
      </div>
    </div>
  );
};