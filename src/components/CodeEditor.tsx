import { useEffect, useState, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { basicSetup } from '@codemirror/basic-setup';
import { oneDark } from '@codemirror/theme-one-dark';
import { basicLight } from '@uiw/codemirror-theme-basic';
import { EditorView } from '@codemirror/view';
import { search } from '@codemirror/search';
import { syntaxHighlighting, defaultHighlightStyle, HighlightStyle } from '@codemirror/language';
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
  
  switch (extension) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return [javascript({ jsx: true, typescript: extension.includes('ts') })];
    case 'html':
      return [html()];
    case 'css':
    case 'scss':
      return [css()];
    case 'json':
      return [json()];
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
  
  // Create a light theme with proper syntax highlighting
  const lightHighlightStyle = HighlightStyle.define([
    { tag: tags.keyword, color: '#d73a49' },
    { tag: tags.atom, color: '#005cc5' },
    { tag: tags.bool, color: '#d73a49' },
    { tag: tags.url, color: '#032f62' },
    { tag: tags.labelName, color: '#6f42c1' },
    { tag: tags.inserted, color: '#28a745' },
    { tag: tags.deleted, color: '#d73a49' },
    { tag: tags.literal, color: '#032f62' },
    { tag: tags.string, color: '#032f62' },
    { tag: tags.number, color: '#005cc5' },
    { tag: [tags.regexp, tags.escape, tags.special(tags.string)], color: '#e36209' },
    { tag: tags.definition(tags.variableName), color: '#e36209' },
    { tag: tags.local(tags.variableName), color: '#e36209' },
    { tag: [tags.typeName, tags.namespace], color: '#6f42c1' },
    { tag: tags.className, color: '#6f42c1' },
    { tag: [tags.special(tags.variableName), tags.macroName], color: '#005cc5' },
    { tag: tags.definition(tags.propertyName), color: '#005cc5' },
    { tag: tags.comment, color: '#6a737d' },
    { tag: tags.meta, color: '#6a737d' },
    { tag: tags.invalid, color: '#cb2431' },
    { tag: tags.tagName, color: '#22863a' },
    { tag: tags.attributeName, color: '#6f42c1' },
    { tag: tags.attributeValue, color: '#032f62' },
  ]);

  const editorTheme = oneDark; // Temporarily use dark theme to test syntax highlighting

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
    basicSetup,
    syntaxHighlighting(resolvedTheme === 'dark' ? defaultHighlightStyle : lightHighlightStyle),
    ...getLanguageExtension(fileName),
    EditorView.theme({
      '&': {
        fontSize: '14px',
        height: '100%',
        backgroundColor: resolvedTheme === 'dark' ? undefined : '#ffffff',
      },
      '.cm-focused': {
        outline: 'none',
      },
      '.cm-editor': {
        height: '100%',
        // Force syntax highlighting colors to take precedence over global styles
        color: 'unset !important',
      },
      '.cm-scroller': {
        fontFamily: 'JetBrains Mono, Consolas, Monaco, "Courier New", monospace',
        // Ensure syntax highlighting isn't overridden by global text color
        color: 'unset !important',
      },
      '.cm-content': {
        // Reset any global text color inheritance
        color: 'unset !important',
      },
      // Force syntax highlighting colors to work
      '.cm-content *': {
        color: 'unset !important',
      },
    }),
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