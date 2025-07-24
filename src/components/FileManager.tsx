import { useState, useEffect } from 'react';
import { FileTree, FileTreeNode } from './FileTree';
import { CodeEditor } from './CodeEditor';
import { MediaPreview } from './MediaPreview';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
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
  const [unsavedFiles, setUnsavedFiles] = useState<Map<string, string>>(new Map());
  const { toast } = useToast();

  useEffect(() => {
    const loadTree = async () => {
      try {
        const data = await fileAPI.getTree();
        setFileSystem(data);
      } catch (err) {
        console.error('Failed to load file tree', err);
      }
    };
    loadTree();
  }, []);

  const refreshTree = async () => {
    try {
      const data = await fileAPI.getTree();
      setFileSystem(data);
    } catch (err) {
      console.error('Failed to refresh file tree', err);
    }
  };

  const handleFileSelect = async (filePath: string) => {
    setSelectedFile(filePath);
    const unsaved = unsavedFiles.get(filePath);
    if (unsaved !== undefined) {
      setFileContent(unsaved);
    } else {
      try {
        const text = await fileAPI.getFile(filePath);
        setFileContent(text);
      } catch (err) {
        console.error('Failed to load file', err);
        setFileContent('');
      }
    }
  };

  const handleFileSave = (content: string) => {
    fileAPI
      .saveFile(selectedFile, content)
      .then(() => {
        setFileContent(content);
        setUnsavedFiles((prev) => {
          const map = new Map(prev);
          map.delete(selectedFile);
          return map;
        });
        toast({
          title: 'File saved',
          description: `${selectedFile} updated successfully`,
        });
      })
      .catch((err) => {
        console.error('Failed to save file', err);
      });
  };

  const handleEditorChange = (path: string, text: string, dirty: boolean) => {
    setUnsavedFiles((prev) => {
      const map = new Map(prev);
      if (dirty) {
        map.set(path, text);
      } else {
        map.delete(path);
      }
      return map;
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

  const selectedFileName = selectedFile.split('/').pop() || '';
  const isEditable = isEditableFile(selectedFileName);
  const fileIsDirty = unsavedFiles.has(selectedFile);

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
          onMove={handleMove}
          selectedFile={selectedFile}
          unsavedFiles={new Set(unsavedFiles.keys())}
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
                onChange={(val, dirty) =>
                  handleEditorChange(selectedFile, val, dirty)
                }
                initialDirty={fileIsDirty}
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