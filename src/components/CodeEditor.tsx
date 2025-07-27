import { useEffect, useState, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { xml } from '@codemirror/lang-xml';
import { yaml } from '@codemirror/lang-yaml';
import { sql } from '@codemirror/lang-sql';
import { php } from '@codemirror/lang-php';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, keymap, highlightActiveLine, lineNumbers } from '@codemirror/view';
import { EditorState, Extension } from '@codemirror/state';
import { search, searchKeymap } from '@codemirror/search';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, HighlightStyle } from '@codemirror/language';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { linter, lintGutter } from '@codemirror/lint';
import { tags as t } from '@lezer/highlight';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Save, Code2, Bug } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Custom bright dark theme for better readability
const brightDarkTheme = EditorView.theme({
  '&': {
    color: '#f8f8f2',
    backgroundColor: '#1e1e1e',
  },
  '.cm-content': {
    padding: '10px',
    color: '#f8f8f2',
    caretColor: '#f8f8f2'
  },
  '.cm-focused .cm-cursor': {
    borderLeftColor: '#f8f8f2'
  },
  '.cm-selectionBackground, .cm-focused .cm-selectionBackground': {
    backgroundColor: '#3a3a3a'
  },
  '.cm-activeLine': {
    backgroundColor: '#2d2d2d'
  },
  '.cm-gutters': {
    backgroundColor: '#252526',
    color: '#858585',
    border: 'none'
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#2d2d2d'
  },
  '.cm-lineNumbers .cm-gutterElement': {
    color: '#858585'
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#ddd'
  }
}, { dark: true });

// Custom syntax highlighting for bright colors
const brightHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: '#f92672' },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: '#f8f8f2' },
  { tag: [t.function(t.variableName), t.labelName], color: '#a6e22e' },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#ae81ff' },
  { tag: [t.definition(t.name), t.separator], color: '#f8f8f2' },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: '#66d9ef' },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: '#f92672' },
  { tag: [t.meta, t.comment], color: '#75715e' },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, color: '#f92672', textDecoration: 'underline' },
  { tag: t.heading, fontWeight: 'bold', color: '#a6e22e' },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: '#ae81ff' },
  { tag: [t.processingInstruction, t.string, t.inserted], color: '#e6db74' },
  { tag: t.invalid, color: '#f44747' },
]);

// Boilerplate inserted when `!` is typed in an empty HTML file
const htmlBoilerplate = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Document</title>
</head>
<body>

</body>
</html>`;

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

// Enhanced JSON linter
const jsonLinter = linter((view) => {
  const doc = view.state.doc.toString();
  const diagnostics = [];
  
  try {
    JSON.parse(doc);
  } catch (error) {
    if (error instanceof SyntaxError) {
      let from = 0;
      let to = 1;
      
      // Try to extract position from error message
      const posMatch = error.message.match(/at position (\d+)/);
      if (posMatch) {
        const charPos = parseInt(posMatch[1]);
        // Ensure position is within document bounds
        if (charPos >= 0 && charPos < doc.length) {
          from = charPos;
          to = Math.min(charPos + 1, doc.length);
        }
      } else {
        // Try to find line/column info in error message
        const lineMatch = error.message.match(/line (\d+)/);
        if (lineMatch) {
          const lineNum = parseInt(lineMatch[1]);
          try {
            const line = view.state.doc.line(lineNum);
            from = line.from;
            to = line.to;
          } catch {
            // Line doesn't exist, highlight at end of document
            from = Math.max(0, doc.length - 1);
            to = doc.length;
          }
        } else {
          // Fallback: highlight the last few characters where error likely occurs
          from = Math.max(0, doc.length - 10);
          to = doc.length;
        }
      }
      
      diagnostics.push({
        from,
        to,
        severity: 'error' as const,
        message: `JSON Error: ${error.message}`
      });
    }
  }
  
  return diagnostics;
});

// HTML linter for basic syntax errors
const htmlLinter = linter((view) => {
  const doc = view.state.doc.toString();
  const diagnostics = [];
  
  // Check for unclosed tags
  const tagRegex = /<(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
  const openTags = [];
  let match;
  
  while ((match = tagRegex.exec(doc)) !== null) {
    const [fullMatch, isClosing, tagName] = match;
    const from = match.index;
    const to = match.index + fullMatch.length;
    
    if (isClosing === '/') {
      if (openTags.length === 0 || openTags[openTags.length - 1].name !== tagName.toLowerCase()) {
        diagnostics.push({
          from,
          to,
          severity: 'error' as const,
          message: `Unmatched closing tag: ${tagName}`
        });
      } else {
        openTags.pop();
      }
    } else if (!['img', 'br', 'hr', 'input', 'meta', 'link'].includes(tagName.toLowerCase())) {
      openTags.push({ name: tagName.toLowerCase(), from, to });
    }
  }
  
  // Check for unclosed tags
  openTags.forEach(tag => {
    diagnostics.push({
      from: tag.from,
      to: tag.to,
      severity: 'warning' as const,
      message: `Unclosed tag: ${tag.name}`
    });
  });
  
  return diagnostics;
});

// CSS linter for basic syntax errors
const cssLinter = linter((view) => {
  const doc = view.state.doc.toString();
  const diagnostics = [];
  
  // Check for unmatched braces
  let braceCount = 0;
  let lastOpenBrace = -1;
  
  for (let i = 0; i < doc.length; i++) {
    if (doc[i] === '{') {
      braceCount++;
      lastOpenBrace = i;
    } else if (doc[i] === '}') {
      braceCount--;
      if (braceCount < 0) {
        diagnostics.push({
          from: i,
          to: i + 1,
          severity: 'error' as const,
          message: 'Unmatched closing brace'
        });
        braceCount = 0;
      }
    }
  }
  
  if (braceCount > 0 && lastOpenBrace >= 0) {
    diagnostics.push({
      from: lastOpenBrace,
      to: lastOpenBrace + 1,
      severity: 'warning' as const,
      message: 'Unmatched opening brace'
    });
  }
  
  return diagnostics;
});

// YAML linter for basic syntax errors
const yamlLinter = linter((view) => {
  const doc = view.state.doc.toString();
  const diagnostics = [];
  
  const lines = doc.split('\n');
  lines.forEach((line, lineIndex) => {
    const from = view.state.doc.line(lineIndex + 1).from;
    const to = view.state.doc.line(lineIndex + 1).to;
    
    // Check for invalid indentation (tabs mixed with spaces)
    if (line.includes('\t') && line.includes('  ')) {
      diagnostics.push({
        from,
        to,
        severity: 'warning' as const,
        message: 'Mixed tabs and spaces in indentation'
      });
    }
    
    // Check for duplicate keys (basic check)
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const restOfDoc = lines.slice(lineIndex + 1).join('\n');
      if (restOfDoc.includes(`${key}:`)) {
        diagnostics.push({
          from,
          to: from + colonIndex,
          severity: 'warning' as const,
          message: `Possible duplicate key: ${key}`
        });
      }
    }
  });
  
  return diagnostics;
});

// XML linter for basic syntax errors
const xmlLinter = linter((view) => {
  const doc = view.state.doc.toString();
  const diagnostics = [];
  
  // Basic XML validation - check for well-formed tags
  const tagRegex = /<(\/?)\s*([a-zA-Z][a-zA-Z0-9:-]*)[^>]*>/g;
  const openTags = [];
  let match;
  
  while ((match = tagRegex.exec(doc)) !== null) {
    const [fullMatch, isClosing, tagName] = match;
    const from = match.index;
    const to = match.index + fullMatch.length;
    
    if (isClosing === '/') {
      if (openTags.length === 0 || openTags[openTags.length - 1].name !== tagName) {
        diagnostics.push({
          from,
          to,
          severity: 'error' as const,
          message: `Unmatched closing tag: ${tagName}`
        });
      } else {
        openTags.pop();
      }
    } else if (!fullMatch.endsWith('/>')) {
      openTags.push({ name: tagName, from, to });
    }
  }
  
  // Check for unclosed tags
  openTags.forEach(tag => {
    diagnostics.push({
      from: tag.from,
      to: tag.to,
      severity: 'warning' as const,
      message: `Unclosed XML tag: ${tag.name}`
    });
  });
  
  return diagnostics;
});

// CSV linter for basic format checking
const csvLinter = linter((view) => {
  const doc = view.state.doc.toString();
  const diagnostics = [];
  
  const lines = doc.split('\n').filter(line => line.trim());
  if (lines.length === 0) return diagnostics;
  
  // Get expected column count from first line
  const firstLineColumns = lines[0].split(',').length;
  
  lines.forEach((line, lineIndex) => {
    const from = view.state.doc.line(lineIndex + 1).from;
    const to = view.state.doc.line(lineIndex + 1).to;
    
    const columns = line.split(',').length;
    if (columns !== firstLineColumns) {
      diagnostics.push({
        from,
        to,
        severity: 'warning' as const,
        message: `Inconsistent column count: expected ${firstLineColumns}, got ${columns}`
      });
    }
  });
  
  return diagnostics;
});

// Comprehensive JavaScript/TypeScript linter for syntax and semantic errors
const jsLinter = linter((view) => {
  const doc = view.state.doc.toString();
  const diagnostics = [];
  
  // Common JavaScript keywords and globals
  const jsKeywords = new Set(['var', 'let', 'const', 'function', 'class', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'try', 'catch', 'finally', 'throw', 'return', 'break', 'continue', 'new', 'this', 'super', 'extends', 'import', 'export', 'from', 'as', 'async', 'await', 'yield', 'typeof', 'instanceof', 'in', 'of', 'delete', 'void', 'null', 'undefined', 'true', 'false']);
  
  const jsGlobals = new Set(['console', 'window', 'document', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'Math', 'JSON', 'RegExp', 'Error', 'Promise', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'fetch', 'localStorage', 'sessionStorage', 'location', 'history', 'navigator', 'alert', 'confirm', 'prompt', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent', 'require', 'module', 'exports', 'global', 'process', 'Buffer', 'React', 'ReactDOM', 'useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'useContext', 'useReducer', 'Component', 'PureComponent']);
  
  // Extract declared variables and functions
  const declared = new Set();
  const functionRegex = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  const varRegex = /(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  const paramRegex = /function\s*[a-zA-Z_$]*\s*\(([^)]*)\)/g;
  const arrowFuncRegex = /(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\(/g;
  
  let match;
  while ((match = functionRegex.exec(doc)) !== null) {
    declared.add(match[1]);
  }
  while ((match = varRegex.exec(doc)) !== null) {
    declared.add(match[1]);
  }
  while ((match = arrowFuncRegex.exec(doc)) !== null) {
    declared.add(match[1]);
  }
  while ((match = paramRegex.exec(doc)) !== null) {
    const params = match[1].split(',').map(p => p.trim().split(/\s+/)[0]).filter(p => p);
    params.forEach(param => declared.add(param));
  }
  
  const lines = doc.split('\n');
  lines.forEach((line, lineIndex) => {
    const from = view.state.doc.line(lineIndex + 1).from;
    const to = view.state.doc.line(lineIndex + 1).to;
    const trimmedLine = line.trim();
    
    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
      return;
    }
    
    // Check for anonymous function declarations (not assignments)
    if (trimmedLine.match(/^\s*function\s*\(\s*\)/)) {
      diagnostics.push({
        from,
        to,
        severity: 'error' as const,
        message: 'Function declaration requires a name'
      });
    }
    
    // Check for invalid function syntax
    if (trimmedLine.match(/function\s*\(\s*\)\s*$/)) {
      diagnostics.push({
        from,
        to,
        severity: 'error' as const,
        message: 'Function declaration is missing body'
      });
    }
    
    // Check for unmatched brackets/braces/parentheses
    const openBrackets = (line.match(/\{/g) || []).length;
    const closeBrackets = (line.match(/\}/g) || []).length;
    const openParens = (line.match(/\(/g) || []).length;
    const closeParens = (line.match(/\)/g) || []).length;
    const openSquare = (line.match(/\[/g) || []).length;
    const closeSquare = (line.match(/\]/g) || []).length;
    
    if (openBrackets - closeBrackets > 1 || openParens - closeParens > 1 || openSquare - closeSquare > 1) {
      diagnostics.push({
        from,
        to,
        severity: 'warning' as const,
        message: 'Possible unmatched brackets or parentheses'
      });
    }
    
    // Check for trailing commas in objects/arrays (last element)
    if (trimmedLine.match(/,\s*[}\]]/)) {
      const commaIndex = line.lastIndexOf(',');
      diagnostics.push({
        from: from + commaIndex,
        to: from + commaIndex + 1,
        severity: 'warning' as const,
        message: 'Trailing comma'
      });
    }
    
    // Check for assignment in conditional statements
    if (trimmedLine.match(/if\s*\([^)]*=(?!=)[^)]*\)/)) {
      diagnostics.push({
        from,
        to,
        severity: 'warning' as const,
        message: 'Assignment in conditional - did you mean === or == ?'
      });
    }
    
    // Check for == vs === (suggest strict equality)
    if (trimmedLine.match(/[^=!<>]==[^=]/) || trimmedLine.match(/[^=!<>]!=[^=]/)) {
      const eqIndex = line.indexOf('==');
      const neqIndex = line.indexOf('!=');
      const index = eqIndex !== -1 ? eqIndex : neqIndex;
      if (index !== -1) {
        diagnostics.push({
          from: from + index,
          to: from + index + 2,
          severity: 'warning' as const,
          message: 'Use === or !== for strict equality comparison'
        });
      }
    }
    
    // Check for var usage (suggest let/const)
    if (trimmedLine.match(/^\s*var\s+/)) {
      diagnostics.push({
        from,
        to: from + trimmedLine.indexOf('var') + 3,
        severity: 'warning' as const,
        message: 'Use let or const instead of var'
      });
    }
    
    // Check for undefined variables (simple heuristic)
    const identifierRegex = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
    let identifierMatch;
    while ((identifierMatch = identifierRegex.exec(line)) !== null) {
      const identifier = identifierMatch[1];
      const identifierStart = from + identifierMatch.index;
      const identifierEnd = identifierStart + identifier.length;
      
      // Skip if it's a keyword, global, or declared variable
      if (jsKeywords.has(identifier) || jsGlobals.has(identifier) || declared.has(identifier)) {
        continue;
      }
      
      // Skip if it's part of a property access (after a dot)
      const beforeIdentifier = line.substring(0, identifierMatch.index);
      if (beforeIdentifier.endsWith('.')) {
        continue;
      }
      
      // Skip if it's a function call (followed by parentheses)
      const afterIdentifier = line.substring(identifierMatch.index + identifier.length);
      if (afterIdentifier.startsWith('(')) {
        continue;
      }
      
      // Skip if it's being declared on this line
      if (line.includes(`var ${identifier}`) || line.includes(`let ${identifier}`) || line.includes(`const ${identifier}`) || line.includes(`function ${identifier}`)) {
        continue;
      }
      
      // Check if it's a standalone identifier that could be undefined
      if (trimmedLine === identifier || line.match(new RegExp(`\\b${identifier}\\s*;?$`))) {
        diagnostics.push({
          from: identifierStart,
          to: identifierEnd,
          severity: 'error' as const,
          message: `'${identifier}' is not defined`
        });
      }
    }
    
    // Check for missing semicolons on statements
    if (trimmedLine && !trimmedLine.endsWith(';') && !trimmedLine.endsWith('{') && !trimmedLine.endsWith('}') && !trimmedLine.endsWith(',') && !trimmedLine.includes('//') && !trimmedLine.startsWith('if') && !trimmedLine.startsWith('for') && !trimmedLine.startsWith('while') && !trimmedLine.startsWith('function') && !trimmedLine.startsWith('class') && !trimmedLine.startsWith('else') && !trimmedLine.startsWith('try') && !trimmedLine.startsWith('catch') && !trimmedLine.startsWith('finally')) {
      if (line.match(/\w+\s*=\s*\w+/) || line.match(/\w+\+\+/) || line.match(/\w+--/) || line.match(/\w+\s*\+=/) || line.match(/\w+\s*-=/) || line.match(/return\s+/) || line.match(/throw\s+/) || line.match(/break\s*$/) || line.match(/continue\s*$/)) {
        diagnostics.push({
          from: to - 1,
          to,
          severity: 'warning' as const,
          message: 'Missing semicolon'
        });
      }
    }
    
    // Check for unreachable code after return/throw
    if (trimmedLine.match(/^(return|throw)\b/) && lineIndex < lines.length - 1) {
      const nextLine = lines[lineIndex + 1]?.trim();
      if (nextLine && !nextLine.startsWith('}') && !nextLine.startsWith('//') && !nextLine.startsWith('/*')) {
        const nextFrom = view.state.doc.line(lineIndex + 2).from;
        const nextTo = view.state.doc.line(lineIndex + 2).to;
        diagnostics.push({
          from: nextFrom,
          to: nextTo,
          severity: 'warning' as const,
          message: 'Unreachable code after return/throw'
        });
      }
    }
    
    // Check for empty blocks
    if (trimmedLine === '{}') {
      diagnostics.push({
        from,
        to,
        severity: 'warning' as const,
        message: 'Empty block statement'
      });
    }
    
    // Check for console.log (suggest removing in production)
    if (trimmedLine.includes('console.log')) {
      const consoleIndex = line.indexOf('console.log');
      diagnostics.push({
        from: from + consoleIndex,
        to: from + consoleIndex + 11,
        severity: 'info' as const,
        message: 'Consider removing console.log in production'
      });
    }
    
    // Check for debugger statements
    if (trimmedLine.includes('debugger')) {
      const debuggerIndex = line.indexOf('debugger');
      diagnostics.push({
        from: from + debuggerIndex,
        to: from + debuggerIndex + 8,
        severity: 'warning' as const,
        message: 'Remove debugger statement before production'
      });
    }
  });
  
  return diagnostics;
});

// Simple document formatter for basic formatting
const formatDocument = (content: string, fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  try {
    switch (extension) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return formatJavaScript(content);
      
      case 'json':
        return formatJSON(content);
      
      case 'html':
      case 'htm':
        return formatHTML(content);
      
      case 'css':
      case 'scss':
      case 'sass':
        return formatCSS(content);
      
      default:
        // For unsupported file types, return original content
        return content;
    }
  } catch (error) {
    console.error('Formatting error:', error);
    // Return original content if formatting fails
    return content;
  }
};

// Simple JavaScript/TypeScript formatter
const formatJavaScript = (content: string): string => {
  let formatted = content;
  
  // Basic formatting rules
  formatted = formatted
    // Add spaces around operators
    .replace(/([a-zA-Z0-9_$])(=|===|!==|==|!=|\+=|-=|\*=|\/=)([a-zA-Z0-9_$])/g, '$1 $2 $3')
    // Add spaces after commas
    .replace(/,(?!\s)/g, ', ')
    // Add spaces after keywords
    .replace(/\b(if|for|while|switch|catch)\(/g, '$1 (')
    // Ensure proper spacing around curly braces
    .replace(/\{(?!\s*$)/g, '{ ')
    .replace(/(?<!^\s*)\}/g, ' }')
    // Fix line endings and indentation
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
  
  return formatted;
};

// Simple JSON formatter
const formatJSON = (content: string): string => {
  try {
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return content;
  }
};

// Simple HTML formatter
const formatHTML = (content: string): string => {
  const formatted = content;
  let indentLevel = 0;
  const indentSize = 2;
  
  // Split by tags and format
  const lines = formatted.split(/(<[^>]*>)/g).filter(Boolean);
  const result: string[] = [];
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    
    if (trimmed.startsWith('</')) {
      indentLevel = Math.max(0, indentLevel - 1);
    }
    
    if (trimmed.startsWith('<') && trimmed.includes('>')) {
      result.push(' '.repeat(indentLevel * indentSize) + trimmed);
      if (!trimmed.includes('</') && !trimmed.endsWith('/>') && !['br', 'hr', 'img', 'input', 'meta', 'link'].some(tag => trimmed.includes(`<${tag}`))) {
        indentLevel++;
      }
    } else {
      result.push(' '.repeat(indentLevel * indentSize) + trimmed);
    }
  });
  
  return result.join('\n');
};

// Simple CSS formatter
const formatCSS = (content: string): string => {
  let formatted = content;
  
  // Basic CSS formatting
  formatted = formatted
    // Add spaces after colons
    .replace(/:(?!\s)/g, ': ')
    // Add spaces after commas
    .replace(/,(?!\s)/g, ', ')
    // Ensure proper line breaks and indentation
    .replace(/\{/g, ' {\n  ')
    .replace(/\}/g, '\n}\n')
    .replace(/;/g, ';\n  ')
    // Clean up extra whitespace
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n')
    .replace(/\n\s*\n/g, '\n');
  
  return formatted;
};

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
    case 'htm': {
      return [html(), htmlLinter];
    }
    case 'css':
    case 'scss':
    case 'sass': {
      return [css(), cssLinter];
    }
    case 'json': {
      return [json(), jsonLinter];
    }
    case 'xml':
    case 'svg':
    case 'xsl':
    case 'xslt': {
      return [xml(), xmlLinter];
    }
    case 'yaml':
    case 'yml': {
      return [yaml(), yamlLinter];
    }
    case 'csv':
    case 'tsv': {
      return [csvLinter]; // CSV doesn't have syntax highlighting, just linting
    }
    case 'sql': {
      return [sql()];
    }
    case 'php': {
      return [php()];
    }
    case 'md':
    case 'markdown': {
      return [markdown()];
    }
    case 'txt':
    case 'log': {
      return []; // Plain text, no syntax highlighting or linting
    }
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
  const [showTemplateButton, setShowTemplateButton] = useState(false);
  const [buttonPos, setButtonPos] = useState({ left: 0, top: 0 });
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  
  // Use custom bright theme for dark mode, no theme for light mode
  const editorTheme = resolvedTheme === 'dark' ? [brightDarkTheme] : undefined;

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

  const handleFormat = useCallback(() => {
    if (readOnly) return;
    
    try {
      const formattedContent = formatDocument(value, fileName);
      if (formattedContent !== value) {
        setValue(formattedContent);
        const dirty = formattedContent !== content;
        setIsDirty(dirty);
        onDirtyChange?.(dirty);
        onContentChange?.(formattedContent);
        
        toast({
          title: "Document formatted",
          description: `${fileName} has been formatted successfully.`,
        });
      }
    } catch (error) {
      toast({
        title: "Formatting failed",
        description: "Could not format the document. Please check for syntax errors.",
        variant: "destructive",
      });
    }
  }, [value, fileName, content, readOnly, onDirtyChange, onContentChange, toast]);

  const handleInsertTemplate = useCallback(() => {
    setValue(htmlBoilerplate);
    setShowTemplateButton(false);
    const dirty = htmlBoilerplate !== content;
    setIsDirty(dirty);
    onDirtyChange?.(dirty);
    onContentChange?.(htmlBoilerplate);
  }, [content, onContentChange, onDirtyChange]);

  // Save file with Ctrl+S / Cmd+S and format with Ctrl+Shift+F / Cmd+Shift+F
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (!readOnly && isDirty) {
          handleSave();
        }
      } else if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        if (!readOnly) {
          handleFormat();
        }
      }
    },
    [handleSave, handleFormat, readOnly, isDirty]
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
    // Use bright highlighting for dark mode, default for light mode
    syntaxHighlighting(resolvedTheme === 'dark' ? brightHighlightStyle : defaultHighlightStyle),
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
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleFormat}
                title="Format document (Ctrl+Shift+F)"
              >
                <Code2 size={14} className="mr-1" />
                Format
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSave}
                disabled={!isDirty}
              >
                <Save size={14} className="mr-1" />
                Save
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0 relative">
        <CodeMirror
          key={resolvedTheme}
          value={value}
          theme={editorTheme}
          onChange={(val, viewUpdate) => {
            const newVal = val;

            const ext = fileName.split('.').pop()?.toLowerCase();
            if (
              (ext === 'html' || ext === 'htm') &&
              value.trim() === '' &&
              val.trim() === '!'
            ) {
              setShowTemplateButton(true);
              const coords = viewUpdate.view.coordsAtPos(1);
              const rect = viewUpdate.view.dom.getBoundingClientRect();
              setButtonPos({
                left: coords.right - rect.left + 4,
                top: coords.top - rect.top - 4,
              });
            } else {
              setShowTemplateButton(false);
            }

            setValue(newVal);
            const dirty = newVal !== content;
            setIsDirty(dirty);
            onDirtyChange?.(dirty);
            onContentChange?.(newVal);
          }}
          extensions={extensions}
          readOnly={readOnly}
          height="100%"
          style={{
            height: '100%',
            fontSize: '14px',
          }}
        />
        {showTemplateButton && (
          <Button
            size="icon"
            variant="outline"
            className="absolute z-10"
            style={{ top: buttonPos.top, left: buttonPos.left }}
            onClick={handleInsertTemplate}
            title="Insert HTML template"
          >
            <Bug size={14} />
          </Button>
        )}
      </div>
    </div>
  );
};
