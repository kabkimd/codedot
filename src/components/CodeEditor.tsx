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
import { linter, lintGutter } from '@codemirror/lint';
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

// Simple JSON linter
const jsonLinter = linter((view) => {
  const doc = view.state.doc.toString();
  const diagnostics = [];
  
  try {
    JSON.parse(doc);
  } catch (error) {
    if (error instanceof SyntaxError) {
      // Try to extract line/column from error message
      const match = error.message.match(/at position (\d+)/);
      if (match) {
        const pos = parseInt(match[1]);
        diagnostics.push({
          from: pos,
          to: pos + 1,
          severity: 'error' as const,
          message: error.message
        });
      } else {
        // Fallback to highlighting the entire document
        diagnostics.push({
          from: 0,
          to: doc.length,
          severity: 'error' as const,
          message: error.message
        });
      }
    }
  }
  
  return diagnostics;
});

// Simple JavaScript/TypeScript linter for basic syntax errors
const jsLinter = linter((view) => {
  const doc = view.state.doc.toString();
  const diagnostics = [];
  
  // Basic checks for common syntax errors
  const lines = doc.split('\n');
  lines.forEach((line, lineIndex) => {
    const from = view.state.doc.line(lineIndex + 1).from;
    const to = view.state.doc.line(lineIndex + 1).to;
    
    // Check for unmatched brackets/braces
    const openBrackets = (line.match(/\{/g) || []).length;
    const closeBrackets = (line.match(/\}/g) || []).length;
    const openParens = (line.match(/\(/g) || []).length;
    const closeParens = (line.match(/\)/g) || []).length;
    
    if (line.trim() && (openBrackets > closeBrackets + 1 || openParens > closeParens + 1)) {
      // Only warn if there's a significant imbalance
      if (openBrackets - closeBrackets > 1 || openParens - closeParens > 1) {
        diagnostics.push({
          from,
          to,
          severity: 'warning' as const,
          message: 'Possible unmatched brackets or parentheses'
        });
      }
    }
  });
  
  return diagnostics;
});

const getLanguageExtension = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx': {
      return [javascript({ jsx: true, typescript: extension.includes('ts') }), jsLinter];
    }
    case 'html':
      return [html()];
    case 'css':
    case 'scss':
      return [css()];
    case 'json': {
      return [json(), jsonLinter];
    }
    case 'md':
    case 'markdown':
      return [markdown()];
    default:
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
    lintGutter(),
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