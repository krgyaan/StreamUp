import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

interface ProgressUpdate {
  type: 'file_progress' | 'chunk_progress' | 'error';
  fileUploadId: string;
  data: any;
}

class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocket> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.setupWebSocket();
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New WebSocket client connected');

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          if (data.type === 'subscribe' && data.fileUploadId) {
            this.clients.set(data.fileUploadId, ws);
            console.log(`Client subscribed to file: ${data.fileUploadId}`);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        // Remove client from all subscriptions
        for (const [fileUploadId, client] of this.clients.entries()) {
          if (client === ws) {
            this.clients.delete(fileUploadId);
            console.log(`Client unsubscribed from file: ${fileUploadId}`);
          }
        }
      });
    });
  }

  public sendProgressUpdate(update: ProgressUpdate) {
    const client = this.clients.get(update.fileUploadId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(update));
    }
  }

  public broadcastToAll(message: any) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
}

export default WebSocketService;
