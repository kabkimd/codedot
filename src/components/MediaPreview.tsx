import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink } from 'lucide-react';

interface MediaPreviewProps {
  fileName: string;
  filePath: string;
  content?: string; // For text files or base64 content
}

const getFileType = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
    return 'image';
  }
  if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(extension || '')) {
    return 'video';
  }
  if (['mp3', 'wav', 'flac', 'ogg'].includes(extension || '')) {
    return 'audio';
  }
  if (['pdf'].includes(extension || '')) {
    return 'pdf';
  }
  return 'unknown';
};

export const MediaPreview = ({ fileName, filePath, content }: MediaPreviewProps) => {
  const [error, setError] = useState(false);
  const fileType = getFileType(fileName);

  const handleDownload = () => {
    // In a real app, this would download from the server
    const link = document.createElement('a');
    link.href = filePath;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (error) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="flex items-center justify-between p-2 border-b border-border bg-muted/20">
          <span className="text-sm font-medium">{fileName}</span>
          <Button size="sm" variant="outline" onClick={handleDownload}>
            <Download size={14} className="mr-1" />
            Download
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p>Cannot preview this file</p>
            <p className="text-xs mt-1">Click download to save the file</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center justify-between p-2 border-b border-border bg-muted/20">
        <span className="text-sm font-medium">{fileName}</span>
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline" onClick={handleDownload}>
            <Download size={14} className="mr-1" />
            Download
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {fileType === 'image' && (
          <div className="flex justify-center">
            <img
              src={content || filePath}
              alt={fileName}
              className="max-w-full max-h-full object-contain border border-border"
              onError={() => setError(true)}
            />
          </div>
        )}
        
        {fileType === 'video' && (
          <div className="flex justify-center">
            <video
              controls
              className="max-w-full max-h-full border border-border"
              onError={() => setError(true)}
            >
              <source src={content || filePath} />
              Your browser does not support video playback.
            </video>
          </div>
        )}
        
        {fileType === 'audio' && (
          <div className="flex justify-center items-center h-full">
            <audio
              controls
              className="w-full max-w-md"
              onError={() => setError(true)}
            >
              <source src={content || filePath} />
              Your browser does not support audio playback.
            </audio>
          </div>
        )}
        
        {fileType === 'pdf' && (
          <div className="h-full">
            <iframe
              src={content || filePath}
              className="w-full h-full border border-border"
              onError={() => setError(true)}
            />
          </div>
        )}
        
        {fileType === 'unknown' && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <p>No preview available for this file type</p>
              <p className="text-xs mt-1">Click download to save the file</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};