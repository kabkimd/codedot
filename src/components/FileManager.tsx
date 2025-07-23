import { useState, useEffect } from 'react';
import { FileTree, FileTreeNode } from './FileTree';
import { CodeEditor } from './CodeEditor';
import { MediaPreview } from './MediaPreview';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fileAPI, authAPI } from '@/lib/api';

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

  const loadFileTree = async () => {
    try {
      const data = await fileAPI.getTree(username);
      setFileSystem(data.tree || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load files', variant: 'destructive' });
    }
  };

  useEffect(() => {
    loadFileTree();
  }, [username]);

  const handleFileSelect = async (filePath: string) => {
    setSelectedFile(filePath);
    try {
      const data = await fileAPI.getFile(filePath);
      setFileContent(data.content || '');
    } catch {
      toast({ title: 'Error', description: 'Failed to load file', variant: 'destructive' });
    }
  };

  const handleFileSave = async (content: string) => {
    try {
      await fileAPI.saveFile(selectedFile, content);
      setFileContent(content);
    } catch {
      toast({ title: 'Error', description: 'Failed to save file', variant: 'destructive' });
    }
  };

  const handleCreateFile = async (parentPath: string, name: string) => {
    try {
      await fileAPI.createFile(`${parentPath}/${name}`);
      toast({ title: 'File created', description: `${name} has been created in ${parentPath}` });
      loadFileTree();
    } catch {
      toast({ title: 'Error', description: 'Failed to create file', variant: 'destructive' });
    }
  };

  const handleCreateFolder = async (parentPath: string, name: string) => {
    try {
      await fileAPI.createFolder(`${parentPath}/${name}`);
      toast({ title: 'Folder created', description: `${name} has been created in ${parentPath}` });
      loadFileTree();
    } catch {
      toast({ title: 'Error', description: 'Failed to create folder', variant: 'destructive' });
    }
  };

  const handleRename = async (path: string, newName: string) => {
    try {
      await fileAPI.rename(path, newName);
      toast({ title: 'Item renamed', description: `Renamed to ${newName}` });
      loadFileTree();
    } catch {
      toast({ title: 'Error', description: 'Failed to rename', variant: 'destructive' });
    }
  };

  const handleDelete = async (path: string) => {
    try {
      await fileAPI.delete(path);
      toast({ title: 'Item deleted', description: `${path} has been deleted` });
      loadFileTree();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    }
  };

  const handleUpload = async (parentPath: string, files: FileList) => {
    const fileNames = Array.from(files).map((f) => f.name).join(', ');
    try {
      await fileAPI.upload(parentPath, files);
      toast({ title: 'Files uploaded', description: `Uploaded: ${fileNames}` });
      loadFileTree();
    } catch {
      toast({ title: 'Error', description: 'Failed to upload', variant: 'destructive' });
    }
  };

  const selectedFileName = selectedFile.split('/').pop() || '';
  const isEditable = isEditableFile(selectedFileName);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border bg-muted/20">
        <h1 className="text-lg font-medium">File Manager - {username}</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            authAPI.logout();
            onLogout();
          }}
        >
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