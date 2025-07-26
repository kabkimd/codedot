import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface MediaPreviewProps {
  fileName: string;
  mimeType: string;
  contentUrl: string;
}

const getFileType = (mime: string) => {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'application/pdf') return 'pdf';
  return 'unknown';
};

export const MediaPreview = ({ fileName, mimeType, contentUrl }: MediaPreviewProps) => {
  const [error, setError] = useState(false);
  const fileType = getFileType(mimeType);


  if (error) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="flex items-center justify-between p-2 border-b border-border bg-muted/20">
          <span className="text-sm font-medium">{fileName}</span>
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
      </div>
      <div className="flex-1 overflow-auto p-4">
        {fileType === 'image' && (
          <div className="flex justify-center">
            <img
              src={contentUrl}
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
              <source src={contentUrl} />
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
              <source src={contentUrl} />
              Your browser does not support audio playback.
            </audio>
          </div>
        )}
        
        {fileType === 'pdf' && (
          <div className="h-full">
            <iframe
              src={contentUrl}
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