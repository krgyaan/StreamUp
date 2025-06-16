import { useState, useEffect, useCallback } from 'react';

export interface WebSocketMessage {
  type: string;
  data: any;
}

export const useWebSocket = (
  channel: string,
  onMessage?: (data: any) => void
) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);

  useEffect(() => {
    // For now, simulate WebSocket connection since we don't have a backend
    setIsConnected(true);

    // Simulate receiving messages for demo purposes
    const simulateMessages = () => {
      if (channel === 'upload-progress' && onMessage) {
        // Simulate progress updates
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 20;
          if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
          }

          const mockData = {
            jobId: 'mock-job-id',
            stage: progress < 25 ? 'uploading' : progress < 50 ? 'parsing' : progress < 100 ? 'processing' : 'complete',
            progress,
            totalRows: 1000000,
            processedRows: Math.floor((progress / 100) * 1000000),
            message: progress < 25 ? 'Uploading file...' : progress < 50 ? 'Parsing CSV...' : progress < 100 ? 'Processing rows...' : 'Complete!'
          };

          setLastMessage(mockData);
          onMessage(mockData);

          if (progress >= 100) {
            clearInterval(interval);
          }
        }, 1000);

        return () => clearInterval(interval);
      }
    };

    const cleanup = simulateMessages();

    return () => {
      setIsConnected(false);
      if (cleanup) cleanup();
    };
  }, [channel, onMessage]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    // Placeholder for sending messages
    console.log('Sending message:', message);
  }, []);

  return {
    isConnected,
    lastMessage,
    sendMessage
  };
};
