import { useState, useEffect } from 'react';

interface ScrollingTextProps {
  className?: string;
}

export const ScrollingText = ({ className = '' }: ScrollingTextProps) => {
  const [currentText, setCurrentText] = useState('');
  const [bbsMessages, setBbsMessages] = useState<string[]>([]);

  useEffect(() => {
    // Load BBS messages
    const loadBbsMessages = async () => {
      try {
        const response = await fetch('/bbs.json');
        const messages = await response.json();
        setBbsMessages(messages);
        if (messages.length > 0) {
          setCurrentText(messages[Math.floor(Math.random() * messages.length)]);
        }
      } catch (error) {
        console.error('Failed to load BBS messages:', error);
        setCurrentText('Connection established...');
      }
    };

    loadBbsMessages();
  }, []);

  useEffect(() => {
    if (bbsMessages.length === 0) return;

    const interval = setInterval(() => {
      const randomMessage = bbsMessages[Math.floor(Math.random() * bbsMessages.length)];
      setCurrentText(randomMessage);
    }, 4000); // Change message every 4 seconds

    return () => clearInterval(interval);
  }, [bbsMessages]);

  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="animate-pulse text-sm text-muted-foreground font-mono">
        {currentText}
      </div>
    </div>
  );
};