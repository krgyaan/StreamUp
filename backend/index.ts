import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { fileUploadWorker, fileChunkingWorker, dataProcessingWorker, setWebSocketService } from './src/queues/fileProcessor.js';
import uploadRouter from './src/routes/uploadRoutes.js';
import WebSocketService from './src/services/websocketService.js';
import db from "./src/db/index.js"
import { sql } from 'drizzle-orm';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const port = process.env.PORT || 4000;

// Initialize WebSocket service
const wsService = new WebSocketService(server);
setWebSocketService(wsService);

// Middleware
app.use(cors());
app.use(express.json());

// Test database connection
app.get('/api/test-db', async (req, res) => {
    try {
        // Try to execute a simple query
        const result = await db.execute(sql`SELECT NOW()`);
        const timestamp = result.rows[0]?.now;

        res.json({
            status: 'success',
            message: 'Database connection successful',
            timestamp
        });
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Database connection failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Routes
app.use('/api', uploadRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Start server
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing workers...');
  await fileUploadWorker.close();
  await fileChunkingWorker.close();
  await dataProcessingWorker.close();
  process.exit(0);
});
