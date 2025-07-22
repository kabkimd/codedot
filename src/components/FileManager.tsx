import { useState, useEffect } from 'react';
import { FileTree, FileTreeNode } from './FileTree';
import { CodeEditor } from './CodeEditor';
import { MediaPreview } from './MediaPreview';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileManagerProps {
  username: string;
  onLogout: () => void;
}

// Mock file system - in production this would come from Supabase
const createMockFileSystem = (username: string): FileTreeNode[] => {
  return [
    {
      name: username,
      path: `/${username}`,
      isDirectory: true,
      children: [
        {
          name: 'projects',
          path: `/${username}/projects`,
          isDirectory: true,
          children: [
            {
              name: 'web-app',
              path: `/${username}/projects/web-app`,
              isDirectory: true,
              children: [
                {
                  name: 'index.html',
                  path: `/${username}/projects/web-app/index.html`,
                  isDirectory: false,
                },
                {
                  name: 'style.css',
                  path: `/${username}/projects/web-app/style.css`,
                  isDirectory: false,
                },
                {
                  name: 'script.js',
                  path: `/${username}/projects/web-app/script.js`,
                  isDirectory: false,
                },
              ],
            },
          ],
        },
        {
          name: 'documents',
          path: `/${username}/documents`,
          isDirectory: true,
          children: [
            {
              name: 'readme.txt',
              path: `/${username}/documents/readme.txt`,
              isDirectory: false,
            },
            {
              name: 'config.json',
              path: `/${username}/documents/config.json`,
              isDirectory: false,
            },
          ],
        },
        {
          name: 'media',
          path: `/${username}/media`,
          isDirectory: true,
          children: [
            {
              name: 'sample.jpg',
              path: `/${username}/media/sample.jpg`,
              isDirectory: false,
            },
          ],
        },
      ],
    },
  ];
};

const getMockFileContent = (filePath: string): string => {
  const fileName = filePath.split('/').pop() || '';
  
  switch (fileName) {
    case 'index.html':
      return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Web App</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Welcome to My Web App</h1>
    <p>This is a sample HTML file.</p>
    <script src="script.js"></script>
</body>
</html>`;

    case 'style.css':
      return `body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #f5f5f5;
}

h1 {
    color: #333;
    text-align: center;
}

p {
    color: #666;
    line-height: 1.6;
}`;

    case 'script.js':
      return `// Sample JavaScript file
console.log('Hello, World!');

document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded successfully');
    
    // Add some interactivity
    const heading = document.querySelector('h1');
    if (heading) {
        heading.addEventListener('click', function() {
            this.style.color = this.style.color === 'red' ? '#333' : 'red';
        });
    }
});`;

    case 'readme.txt':
      return `# User Documentation

Welcome to your personal file manager!

## Features:
- Browse and edit files
- Create new files and folders
- Upload files
- Syntax highlighting for code files
- Media preview for images, videos, and audio

## Getting Started:
1. Navigate through folders using the file tree
2. Click on files to edit them
3. Right-click for context menu options
4. Use Ctrl+S to save files

Happy coding!`;

    case 'config.json':
      return `{
  "app": {
    "name": "File Manager",
    "version": "1.0.0",
    "theme": "minimal"
  },
  "editor": {
    "fontSize": 14,
    "tabSize": 2,
    "wordWrap": true,
    "syntaxHighlighting": true
  },
  "user": {
    "preferences": {
      "autoSave": true,
      "showLineNumbers": true,
      "darkMode": false
    }
  }
}`;

    default:
      return `// ${fileName}
// This is a sample file
console.log('Edit this file to get started!');`;
  }
};

const isEditableFile = (fileName: string): boolean => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  const textExtensions = [
    'txt', 'md', 'json', 'js', 'jsx', 'ts', 'tsx', 
    'html', 'css', 'scss', 'py', 'java', 'cpp', 'c', 
    'php', 'rb', 'go', 'rs', 'xml', 'yml', 'yaml'
  ];
  return textExtensions.includes(extension || '');
};

export const FileManager = ({ username, onLogout }: FileManagerProps) => {
  const [fileSystem, setFileSystem] = useState<FileTreeNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    // Initialize file system for user
    setFileSystem(createMockFileSystem(username));
  }, [username]);

  const handleFileSelect = (filePath: string) => {
    setSelectedFile(filePath);
    // In production, this would fetch from Supabase
    const content = getMockFileContent(filePath);
    setFileContent(content);
  };

  const handleFileSave = (content: string) => {
    // In production, this would save to Supabase
    setFileContent(content);
    console.log(`Saving file ${selectedFile} with content:`, content);
  };

  const handleCreateFile = (parentPath: string, name: string) => {
    toast({
      title: "File created",
      description: `${name} has been created in ${parentPath}`,
    });
    // In production, this would create the file in Supabase
  };

  const handleCreateFolder = (parentPath: string, name: string) => {
    toast({
      title: "Folder created", 
      description: `${name} has been created in ${parentPath}`,
    });
    // In production, this would create the folder in Supabase
  };

  const handleRename = (path: string, newName: string) => {
    toast({
      title: "Item renamed",
      description: `Renamed to ${newName}`,
    });
    // In production, this would rename in Supabase
  };

  const handleDelete = (path: string) => {
    toast({
      title: "Item deleted",
      description: `${path} has been deleted`,
    });
    // In production, this would delete from Supabase
  };

  const handleUpload = (parentPath: string, files: FileList) => {
    const fileNames = Array.from(files).map(f => f.name).join(', ');
    toast({
      title: "Files uploaded",
      description: `Uploaded: ${fileNames}`,
    });
    // In production, this would upload to Supabase
  };

  const selectedFileName = selectedFile.split('/').pop() || '';
  const isEditable = isEditableFile(selectedFileName);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border bg-muted/20">
        <h1 className="text-lg font-medium">File Manager - {username}</h1>
        <Button variant="outline" size="sm" onClick={onLogout}>
          <LogOut size={14} className="mr-1" />
          Logout
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File tree sidebar */}
        <div className="w-80 min-w-80">
          <FileTree
            nodes={fileSystem}
            onFileSelect={handleFileSelect}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onRename={handleRename}
            onDelete={handleDelete}
            onUpload={handleUpload}
            selectedFile={selectedFile}
          />
        </div>

        {/* Editor/Preview area */}
        <div className="flex-1 min-w-0">
          {selectedFile ? (
            isEditable ? (
              <CodeEditor
                content={fileContent}
                fileName={selectedFileName}
                onSave={handleFileSave}
              />
            ) : (
              <MediaPreview
                fileName={selectedFileName}
                filePath={selectedFile}
                content={fileContent}
              />
            )
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <p>Select a file to edit or preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};