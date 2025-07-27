import { useState, useEffect, useRef } from 'react';
import { FileTree, FileTreeNode } from './FileTree';
import { CodeEditor } from './CodeEditor';
import { MediaPreview } from './MediaPreview';
import { ScrollingText } from './ScrollingText';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { LogOut, User, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { fileAPI } from '@/lib/api';
import { detectMimeType, isTextMime } from '@/lib/utils';
import { P5_INDEX_HTML, P5_STYLE_CSS, P5_SKETCH_JS } from '@/templates/p5js';

interface FileManagerProps {
  username: string;
  onLogout: () => void;
}



export const FileManager = ({ username, onLogout }: FileManagerProps) => {
  const [fileSystem, setFileSystem] = useState<FileTreeNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [selectedMime, setSelectedMime] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [currentContent, setCurrentContent] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [showP5Dialog, setShowP5Dialog] = useState(false);
  const [p5FolderName, setP5FolderName] = useState('p5js');
  const [usage, setUsage] = useState<{ used: number; max: number }>({ used: 0, max: 250 * 1024 * 1024 });
  const pendingFileRef = useRef<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);
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

  // Helper function to detect if a file should be treated as text based on extension
  const isTextFile = (filePath: string): boolean => {
    const textExtensions = [
      '.txt', '.md', '.json', '.js', '.ts', '.jsx', '.tsx', '.css', '.scss', 
      '.html', '.htm', '.xml', '.svg', '.csv', '.yaml', '.yml', '.ini', 
      '.conf', '.config', '.log', '.sql', '.py', '.java', '.c', '.cpp', 
      '.h', '.hpp', '.php', '.rb', '.go', '.rs', '.sh', '.bat', '.ps1'
    ];
    
    const extension = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
    return textExtensions.includes(extension);
  };

  const loadFile = async (filePath: string) => {
    console.log('FileManager - loadFile called with:', filePath);
    
    // Clean up previous object URL
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    
    setSelectedFile(filePath);
    setSelectedMime('');
    console.log('FileManager - selectedFile set to:', filePath);
    
    try {
      // Check if this is a text file based on extension
      if (isTextFile(filePath)) {
        // Use direct text API for text files
        const text = await fileAPI.getFile(filePath);
        const blob = new Blob([text], { type: 'text/plain' });
        const mime = await detectMimeType(blob);
        
        setSelectedMime(mime);
        setFileContent(text);
        setCurrentContent(text);
      } else {
        // Use blob API for binary/media files
        const blob = await fileAPI.downloadItem(filePath);
        const mime = await detectMimeType(blob);
        setSelectedMime(mime);

        const objectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objectUrl;
        setFileContent(objectUrl);
        setCurrentContent(objectUrl);
      }
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Failed to load file', err);
      setFileContent('');
      setCurrentContent('');
      setSelectedMime('');
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

  const handleCreateP5Project = () => {
    setP5FolderName('p5js');
    setShowP5Dialog(true);
  };

  const createP5Project = async () => {
    const root = fileSystem[0]?.path;
    if (!root) return;
    const folderName = p5FolderName.trim();
    if (!folderName) return;
    try {
      await fileAPI.createFolder(root, folderName);
      const base = `${root}/${folderName}`;
      await fileAPI.createFile(base, 'index.html');
      await fileAPI.saveFile(`${base}/index.html`, P5_INDEX_HTML);
      await fileAPI.createFile(base, 'style.css');
      await fileAPI.saveFile(`${base}/style.css`, P5_STYLE_CSS);
      await fileAPI.createFile(base, 'sketch.js');
      await fileAPI.saveFile(`${base}/sketch.js`, P5_SKETCH_JS);
      toast({ title: 'P5js project created', description: `${folderName} added` });
      refreshTree();
      setShowP5Dialog(false);
    } catch (err) {
      console.error('Failed to create p5js project', err);
    }
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
  const isEditable = isTextMime(selectedMime);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border bg-muted/20">
        {/* Left side - Editing link */}
        <div className="flex-1 max-w-xs">
          <span className="text-sm text-muted-foreground inline-flex items-center gap-1">
            you are editing{' '}
            <a
              href={`https://kabkimd.nl/${username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:text-primary/80 transition-colors underline decoration-primary/60 hover:decoration-primary underline-offset-2 inline-flex items-center gap-1"
            >
              kabkimd.nl/{username}
              <ExternalLink size={12} className="opacity-80" />
            </a>
          </span>
        </div>

        {/* Center - Scrolling text */}
        <div className="flex-1 flex justify-center">
          <ScrollingText />
        </div>
        
        {/* Right side - Controls */}
        <div className="flex-1 flex justify-end gap-2">
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
            onCreateP5Project={handleCreateP5Project}
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
                fileName={displayPath}
                mimeType={selectedMime}
                contentUrl={fileContent}
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
      <Dialog open={showP5Dialog} onOpenChange={setShowP5Dialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create P5.js Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Folder name"
              value={p5FolderName}
              onChange={(e) => setP5FolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createP5Project()}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowP5Dialog(false)}>
                Cancel
              </Button>
              <Button onClick={createP5Project}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};