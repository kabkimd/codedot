import { useState, useRef, useEffect } from 'react';
import { FileIcon } from './FileIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  FolderPlus,
  Upload,
  Trash2,
  Edit3,
  Download
} from 'lucide-react';

export interface FileTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  children?: FileTreeNode[];
  expanded?: boolean;
}

interface FileTreeProps {
  nodes: FileTreeNode[];
  usage: { used: number; max: number };
  onFileSelect: (path: string) => void;
  onCreateFile: (parentPath: string, name: string) => void;
  onCreateFolder: (parentPath: string, name: string) => void;
  onRename: (path: string, newName: string) => void;
  onDelete: (path: string) => void;
  onUpload: (parentPath: string, files: FileList) => void;
  onMove: (path: string, target: string) => void;
  onDownload: (path: string, name: string, isDirectory: boolean) => void;
  selectedFile?: string;
}

export const FileTree = ({
  nodes,
  usage,
  onFileSelect,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
  onUpload,
  onMove,
  onDownload,
  selectedFile
}: FileTreeProps) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState<{
    type: 'file' | 'folder';
    parentPath: string;
  } | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const uploadParentPathRef = useRef<string | null>(null);
  const [draggedPath, setDraggedPath] = useState<string | null>(null);

  // Expand the root folder by default when the tree loads
  useEffect(() => {
    if (nodes.length > 0 && expandedNodes.size === 0) {
      setExpandedNodes(new Set([nodes[0].path]));
    }
  }, [nodes]);

  const toggleExpanded = (path: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedNodes(newExpanded);
  };

  const handleCreate = () => {
    if (!showCreateDialog || !newItemName.trim()) return;
    
    if (showCreateDialog.type === 'file') {
      onCreateFile(showCreateDialog.parentPath, newItemName.trim());
    } else {
      onCreateFolder(showCreateDialog.parentPath, newItemName.trim());
    }
    
    setShowCreateDialog(null);
    setNewItemName('');
  };

  const handleFileUpload = () => {
    const parentPath = uploadParentPathRef.current;
    const files = uploadInputRef.current?.files || null;
    if (parentPath && files && files.length > 0) {
      onUpload(parentPath, files);
    }
    if (uploadInputRef.current) {
      uploadInputRef.current.value = '';
    }
    uploadParentPathRef.current = null;
  };

  const renderNode = (node: FileTreeNode, level = 0) => {
    const isExpanded = expandedNodes.has(node.path);
    const isSelected = selectedFile === node.path;

    return (
      <div key={node.path}>
        <ContextMenu>
          <ContextMenuTrigger>
            <div
              className={`flex items-center py-1 px-2 hover:bg-muted cursor-pointer select-none ${
                isSelected ? 'bg-primary text-primary-foreground' : ''
              }`}
              style={{ paddingLeft: `${level * 16 + 8}px` }}
              draggable
              onDragStart={(e) => {
                e.stopPropagation();
                setDraggedPath(node.path);
              }}
              onDragEnd={() => setDraggedPath(null)}
              onDragOver={(e) => {
                if (draggedPath && node.isDirectory && node.path !== draggedPath) {
                  e.preventDefault();
                }
              }}
              onDrop={(e) => {
                if (draggedPath && node.isDirectory && node.path !== draggedPath) {
                  e.preventDefault();
                  onMove(draggedPath, node.path);
                }
              }}
              onClick={() => {
                if (node.isDirectory) {
                  toggleExpanded(node.path);
                } else {
                  onFileSelect(node.path);
                }
              }}
            >
              {node.isDirectory && (
                <button
                  className="p-0 h-4 w-4 mr-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpanded(node.path);
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown size={12} />
                  ) : (
                    <ChevronRight size={12} />
                  )}
                </button>
              )}
              <FileIcon 
                name={node.name} 
                isDirectory={node.isDirectory} 
                size={14} 
              />
              <span className="ml-2 text-sm truncate">{node.name}</span>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            {node.isDirectory && (
              <>
                <ContextMenuItem
                  onClick={() => setShowCreateDialog({ type: 'file', parentPath: node.path })}
                >
                  <Plus size={14} className="mr-2" />
                  New File
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => setShowCreateDialog({ type: 'folder', parentPath: node.path })}
                >
                  <FolderPlus size={14} className="mr-2" />
                  New Folder
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => {
                    uploadParentPathRef.current = node.path;
                    uploadInputRef.current?.click();
                  }}
                >
                  <Upload size={14} className="mr-2" />
                  Upload Files
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => onDownload(node.path, node.name, true)}
                >
                  <Download size={14} className="mr-2" />
                  Download Folder
                </ContextMenuItem>
              </>
            )}
            <ContextMenuItem
              onClick={() => {
                const newName = prompt('Enter new name', node.name);
                if (newName && newName.trim() && newName !== node.name) {
                  onRename(node.path, newName.trim());
                }
              }}
            >
              <Edit3 size={14} className="mr-2" />
              Rename
            </ContextMenuItem>
            <ContextMenuItem
              className="text-destructive"
              onClick={() => onDelete(node.path)}
            >
              <Trash2 size={14} className="mr-2" />
              Delete
            </ContextMenuItem>
            {!node.isDirectory && (
              <ContextMenuItem onClick={() => onDownload(node.path, node.name, false)}>
                <Download size={14} className="mr-2" />
                Download File
              </ContextMenuItem>
            )}
          </ContextMenuContent>
        </ContextMenu>

        {node.isDirectory && isExpanded && node.children && (
          <div>
            {node.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const formatMB = (b: number) => (b / (1024 * 1024)).toFixed(1);

  return (
    <div className="h-full flex flex-col border-r border-border bg-background">
      <div className="p-2 border-b border-border">
        <h3 className="text-sm font-medium">Files</h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {nodes.map((node) => renderNode(node))}
      </div>
      <div className="border-t border-border p-2">
        <progress className="w-full h-2" value={usage.used} max={usage.max} />
        <div className="text-xs text-center mt-1">
          {formatMB(usage.used)} MB / {formatMB(usage.max)} MB (
          {Math.round((usage.used / usage.max) * 100)}%)
        </div>
      </div>

      <Dialog open={!!showCreateDialog} onOpenChange={() => setShowCreateDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Create New {showCreateDialog?.type === 'file' ? 'File' : 'Folder'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder={`Enter ${showCreateDialog?.type} name`}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(null)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <input
        type="file"
        ref={uploadInputRef}
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  );
};