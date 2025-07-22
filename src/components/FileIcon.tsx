import { 
  File, 
  Folder, 
  Image, 
  Video, 
  Music, 
  FileText,
  Code,
  Archive,
  FileJson
} from 'lucide-react';

interface FileIconProps {
  name: string;
  isDirectory: boolean;
  size?: number;
}

const getFileIcon = (fileName: string, isDirectory: boolean) => {
  if (isDirectory) {
    return Folder;
  }

  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
    case 'svg':
      return Image;
    
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'mkv':
    case 'webm':
      return Video;
    
    case 'mp3':
    case 'wav':
    case 'flac':
    case 'ogg':
      return Music;
    
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'html':
    case 'css':
    case 'scss':
    case 'py':
    case 'java':
    case 'cpp':
    case 'c':
    case 'php':
      return Code;
    
    case 'json':
      return FileJson;
    
    case 'txt':
    case 'md':
    case 'readme':
      return FileText;
    
    case 'zip':
    case 'rar':
    case 'tar':
    case 'gz':
      return Archive;
    
    default:
      return File;
  }
};

export const FileIcon = ({ name, isDirectory, size = 16 }: FileIconProps) => {
  const IconComponent = getFileIcon(name, isDirectory);
  
  return (
    <IconComponent 
      size={size} 
      className={isDirectory ? 'text-primary' : 'text-foreground'} 
    />
  );
};