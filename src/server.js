import express from 'express';
import { config } from './config.js';
import { processUpdate } from './handlers/update.js';

const app = express();
app.use(express.json());

// Basic sanity check to ensure server is running
app.get('/', (req, res) => {
  res.send('Telegram Bot is running.');
});

// The Webhook Endpoint
app.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    
    // In Leapcell / Serverless environments, Telegram expects a 200 OK fast.
    // However, handling it asynchronously might result in termination if the environment halts execution after the response.
    // Depending on the platform, waiting for completion could be better, or separating into a worker.
    // For standard Express instances on a VM or container, floating the promise is perfectly fine.
    // We will await it to ensure no premature exit on strictly serverless functions,
    // though the prompt implies a continuous 24/7 deployment like Leapcell containers.
    
    // If you need faster ACKs at the risk of serverless cutoffs: 
    // processUpdate(update).catch(console.error);
    // res.sendStatus(200);
    
    // Using await for safe execution:
    await processUpdate(update);
    res.sendStatus(200);
  } catch (error) {
    console.error('[System Error] Root Webhook Error:', error);
    // Always return 200 so Telegram doesn't retry indefinitely for a permanent bug
    res.sendStatus(200); 
  }
});

app.listen(config.PORT, () => {
  console.log(`[🚀 SERVER] Bot webhook listening on port ${config.PORT}`);
  console.log(`[ℹ️ INFO] Make sure to set your Telegram webhook URL to: ${config.WEBHOOK_URL}/webhook`);
});
