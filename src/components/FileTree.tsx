import { useState } from 'react';
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
  Edit3
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
  onFileSelect: (path: string) => void;
  onCreateFile: (parentPath: string, name: string) => void;
  onCreateFolder: (parentPath: string, name: string) => void;
  onRename: (path: string, newName: string) => void;
  onDelete: (path: string) => void;
  onUpload: (parentPath: string, files: FileList) => void;
  selectedFile?: string;
}

export const FileTree = ({
  nodes,
  onFileSelect,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
  onUpload,
  selectedFile
}: FileTreeProps) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState<{
    type: 'file' | 'folder';
    parentPath: string;
  } | null>(null);
  const [newItemName, setNewItemName] = useState('');

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

  const handleFileUpload = (parentPath: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onUpload(parentPath, files);
    }
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
                <ContextMenuItem>
                  <label className="flex items-center cursor-pointer">
                    <Upload size={14} className="mr-2" />
                    Upload Files
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFileUpload(node.path, e)}
                    />
                  </label>
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

  return (
    <div className="h-full border-r border-border bg-background">
      <div className="p-2 border-b border-border">
        <h3 className="text-sm font-medium">Files</h3>
      </div>
      <div className="overflow-y-auto h-full">
        {nodes.map((node) => renderNode(node))}
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
    </div>
  );
};