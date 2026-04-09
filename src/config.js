import dotenv from 'dotenv';
dotenv.config();

export const config = {
  PORT: process.env.PORT || 3000,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  WEBHOOK_URL: process.env.WEBHOOK_URL,
  NVIDIA: {
    API_KEY: process.env.FAST_API_KEY,
    MODEL: process.env.FAST_MODEL || 'qwen/qwen3.5-122b-a10b',
    BASE_URL: 'https://integrate.api.nvidia.com/v1/chat/completions'
  },
  SUPABASE: {
    URL: process.env.SUPABASE_URL,
    KEY: process.env.SUPABASE_ANON_KEY
  }
};

// Validate critical tokens
const missingEnv = [];
if (!config.TELEGRAM_BOT_TOKEN) missingEnv.push('TELEGRAM_BOT_TOKEN');
if (!config.NVIDIA.API_KEY) missingEnv.push('FAST_API_KEY');
if (!config.SUPABASE.URL) missingEnv.push('SUPABASE_URL');
if (!config.SUPABASE.KEY) missingEnv.push('SUPABASE_ANON_KEY');

if (missingEnv.length > 0) {
  console.warn(`[WARNING] Missing environment variables: ${missingEnv.join(', ')}`);
}
