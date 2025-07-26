import { useState, useEffect } from 'react';

interface ScrollingTextProps {
  className?: string;
}

export const ScrollingText = ({ className = '' }: ScrollingTextProps) => {
  const [currentText, setCurrentText] = useState('Connection established...');

  useEffect(() => {
    // Load BBS messages and pick one random message for this session
    const loadBbsMessages = async () => {
      try {
        const response = await fetch('/bbs.json');
        const messages = await response.json();
        if (messages.length > 0) {
          const randomMessage = messages[Math.floor(Math.random() * messages.length)];
          setCurrentText(randomMessage);
        }
      } catch (error) {
        console.error('Failed to load BBS messages:', error);
        setCurrentText('Connection established...');
      }
    };

    loadBbsMessages();
  }, []); // Only run on mount, not during session

  return (
    <div className={`overflow-hidden ${className}`} style={{ width: '100%' }}>
      <div 
        className="text-sm text-muted-foreground font-mono whitespace-nowrap animate-marquee"
      >
        {currentText}
      </div>
    </div>
  );
};