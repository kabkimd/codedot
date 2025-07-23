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
    const loadTree = async () => {
      try {
        const res = await fetch('/api/tree');
        if (res.ok) {
          const data = await res.json();
          setFileSystem(data);
        }
      } catch (err) {
        console.error('Failed to load file tree', err);
      }
    };
    loadTree();
  }, []);

  const handleFileSelect = async (filePath: string) => {
    setSelectedFile(filePath);
    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`);
      if (res.ok) {
        const text = await res.text();
        setFileContent(text);
      } else {
        setFileContent('');
      }
    } catch (err) {
      console.error('Failed to load file', err);
      setFileContent('');
    }
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