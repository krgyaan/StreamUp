import { useEffect, useRef, useState } from 'react';

interface WebSocketMessage {
  type: 'file_progress' | 'chunk_progress' | 'processing_progress' | 'error';
  fileUploadId: string;
  data: any;
}

interface UseWebSocketProps {
  fileUploadId?: string;
  onMessage?: (message: WebSocketMessage) => void;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export const useWebSocket = ({ fileUploadId, onMessage }: UseWebSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Update the ref when onMessage changes
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = () => {
    if (!fileUploadId) return;

    try {
      const ws = new WebSocket(`ws://localhost:8080`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        retryCountRef.current = 0;
        console.log('WebSocket connected');

        // Subscribe to file updates
        ws.send(JSON.stringify({
          type: 'subscribe',
          fileUploadId
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          onMessageRef.current?.(message);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        setError('WebSocket connection error');
        console.error('WebSocket error:', event);
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');

        // Attempt to reconnect if we haven't exceeded max retries
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current += 1;
          retryTimeoutRef.current = setTimeout(connect, RETRY_DELAY);
        }
      };
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      setError('Failed to create WebSocket connection');
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [fileUploadId]);

  return {
    isConnected,
    error
  };
};
