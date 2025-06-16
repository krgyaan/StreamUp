import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import uploadRoutes from "./src/routes/uploadRoutes.js";
import db from "./src/db/index.js"
import { sql } from 'drizzle-orm';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: 'http://localhost:5173',
  }));
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

app.use('/api', uploadRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
  console.log('Database connection pool initialized');
});
