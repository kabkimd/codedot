import { useState, useEffect, useRef } from 'react';
import { FileTree, FileTreeNode } from './FileTree';
import { CodeEditor } from './CodeEditor';
import { MediaPreview } from './MediaPreview';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './ThemeToggle';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { LogOut, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { fileAPI } from '@/lib/api';

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
  const [currentContent, setCurrentContent] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [usage, setUsage] = useState<{ used: number; max: number }>({ used: 0, max: 250 * 1024 * 1024 });
  const pendingFileRef = useRef<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadTree = async () => {
      try {
        const [tree, u] = await Promise.all([
          fileAPI.getTree(),
          fileAPI.getUsage()
        ]);
        setFileSystem(tree);
        setUsage(u);
      } catch (err) {
        console.error('Failed to load file tree', err);
      }
    };
    loadTree();
  }, []);

  const refreshTree = async () => {
    try {
      const [tree, u] = await Promise.all([
        fileAPI.getTree(),
        fileAPI.getUsage()
      ]);
      setFileSystem(tree);
      setUsage(u);
    } catch (err) {
      console.error('Failed to refresh file tree', err);
    }
  };

  const loadFile = async (filePath: string) => {
    console.log('FileManager - loadFile called with:', filePath);
    setSelectedFile(filePath);
    console.log('FileManager - selectedFile set to:', filePath);
    try {
      const text = await fileAPI.getFile(filePath);
      setFileContent(text);
      setCurrentContent(text);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Failed to load file', err);
      setFileContent('');
      setCurrentContent('');
      setHasUnsavedChanges(false);
    }
  };

  const handleFileSelect = (filePath: string) => {
    if (hasUnsavedChanges && selectedFile && filePath !== selectedFile) {
      pendingFileRef.current = filePath;
      setShowUnsavedDialog(true);
      return;
    }
    loadFile(filePath);
  };

  const handleFileSave = (content: string) => {
    fileAPI
      .saveFile(selectedFile, content)
      .then(() => {
        setFileContent(content);
        setCurrentContent(content);
        setHasUnsavedChanges(false);
        toast({
          title: 'File saved',
          description: `${selectedFile} updated successfully`,
        });
      })
      .catch((err) => {
        console.error('Failed to save file', err);
      });
  };

  const handleCreateFile = (parentPath: string, name: string) => {
    fileAPI
      .createFile(parentPath, name)
      .then(() => {
        toast({
          title: 'File created',
          description: `${name} has been created in ${parentPath}`,
        });
        refreshTree();
      })
      .catch((err) => console.error('Failed to create file', err));
  };

  const handleCreateFolder = (parentPath: string, name: string) => {
    fileAPI
      .createFolder(parentPath, name)
      .then(() => {
        toast({
          title: 'Folder created',
          description: `${name} has been created in ${parentPath}`,
        });
        refreshTree();
      })
      .catch((err) => console.error('Failed to create folder', err));
  };

  const handleRename = (path: string, newName: string) => {
    fileAPI
      .renameItem(path, newName)
      .then(() => {
        toast({ title: 'Item renamed', description: `Renamed to ${newName}` });
        refreshTree();
      })
      .catch((err) => console.error('Failed to rename', err));
  };

  const handleDelete = (path: string) => {
    fileAPI
      .deleteItem(path)
      .then(() => {
        toast({ title: 'Item deleted', description: `${path} has been deleted` });
        refreshTree();
      })
      .catch((err) => console.error('Failed to delete', err));
  };

  const handleUpload = (parentPath: string, files: FileList) => {
    fileAPI
      .uploadFiles(parentPath, files)
      .then(() => {
        const fileNames = Array.from(files)
          .map((f) => f.name)
          .join(', ');
        toast({ title: 'Files uploaded', description: `Uploaded: ${fileNames}` });
        refreshTree();
      })
      .catch((err) => console.error('Failed to upload files', err));
  };

  const handleMove = (path: string, target: string) => {
    fileAPI
      .moveItem(path, target)
      .then(() => {
        toast({ title: 'Item moved', description: `Moved to ${target}` });
        refreshTree();
      })
      .catch((err) => console.error('Failed to move item', err));
  };

  const handleDownload = (path: string, name: string, isDir: boolean) => {
    fileAPI
      .downloadItem(path)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = isDir ? `${name}.zip` : name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch((err) => console.error('Failed to download', err));
  };

  const handleSaveAndContinue = () => {
    if (!pendingFileRef.current) return;
    handleFileSave(currentContent);
    const next = pendingFileRef.current;
    pendingFileRef.current = null;
    setShowUnsavedDialog(false);
    loadFile(next);
  };

  const handleDiscardChanges = () => {
    if (!pendingFileRef.current) return;
    const next = pendingFileRef.current;
    pendingFileRef.current = null;
    setShowUnsavedDialog(false);
    loadFile(next);
  };

  const selectedFileName = selectedFile.split('/').pop() || '';
  
  // Create a user-friendly display path (remove absolute path prefix)
  const getDisplayPath = (fullPath: string): string => {
    if (!fullPath) return '';
    
    // Normalize path separators (handle both Windows \ and Unix /)
    const normalizedPath = fullPath.replace(/\\/g, '/');
    const parts = normalizedPath.split('/');
    
    // Debug logging
    console.log('Full path:', fullPath);
    console.log('Normalized path:', normalizedPath);
    console.log('Username:', username);
    console.log('Path parts:', parts);
    
    // Find the username directory and show path relative to that
    const userIndex = parts.findIndex(part => part === username);
    console.log('User index:', userIndex);
    
    if (userIndex !== -1 && userIndex < parts.length - 1) {
      // Return path relative to user folder (exclude username from display)
      const relativePath = parts.slice(userIndex + 1).join('/');
      console.log('Relative path:', relativePath);
      return relativePath;
    }
    // Fallback to just filename if user folder not found
    const fallback = parts[parts.length - 1] || '';
    console.log('Fallback path:', fallback);
    return fallback;
  };
  
  const displayPath = getDisplayPath(selectedFile);
  console.log('FileManager - selectedFile for display:', selectedFile);
  console.log('FileManager - displayPath result:', displayPath);
  const isEditable = isEditableFile(selectedFileName);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border bg-muted/20">
        <h1 className="text-lg font-medium">File Manager - {username}</h1>
        <div className="flex gap-2">
          <ThemeToggle />
          <Button asChild variant="outline" size="sm">
            <Link to="/profile">
              <User size={14} className="mr-1" />
              Profile
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={onLogout}>
            <LogOut size={14} className="mr-1" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File tree sidebar */}
        <div className="w-80 min-w-80">
          <FileTree
            nodes={fileSystem}
            usage={usage}
            onFileSelect={handleFileSelect}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onRename={handleRename}
            onDelete={handleDelete}
            onUpload={handleUpload}
            onMove={handleMove}
            onDownload={handleDownload}
            selectedFile={selectedFile}
          />
        </div>

        {/* Editor/Preview area */}
        <div className="flex-1 min-w-0">
          {selectedFile ? (
            isEditable ? (
              <CodeEditor
                content={fileContent}
                fileName={displayPath}
                onSave={handleFileSave}
                onContentChange={setCurrentContent}
                onDirtyChange={setHasUnsavedChanges}
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
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              It looks like you've made changes to "{selectedFileName}" that
              haven't been saved yet. If you leave now, your edits will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={handleSaveAndContinue}>Save &amp; Continue</Button>
            <Button variant="destructive" onClick={handleDiscardChanges}>
              Discard Changes
            </Button>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};