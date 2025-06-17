import { redis, QUEUE_NAMES } from '../queues/config.js';
import { Queue } from 'bullmq';

async function clearQueue(queueName: string) {
    console.log(`Clearing queue: ${queueName}`);
    const queue = new Queue(queueName, { connection: redis });
    await queue.obliterate({ force: true });
    await queue.close();
    console.log(`Queue ${queueName} cleared successfully`);
}

async function clearRedisCache() {
    console.log('Clearing Redis cache...');
    await redis.flushall();
    console.log('Redis cache cleared successfully');
}

async function main() {
    try {
        // Clear all queues
        await clearQueue(QUEUE_NAMES.FILE_UPLOAD);
        await clearQueue(QUEUE_NAMES.FILE_CHUNKING);
        await clearQueue(QUEUE_NAMES.DATA_PROCESSING);

        // Clear Redis cache
        await clearRedisCache();

        console.log('All queues and cache cleared successfully');
    } catch (error) {
        console.error('Error clearing queues and cache:', error);
    } finally {
        await redis.quit();
    }
}

main();
