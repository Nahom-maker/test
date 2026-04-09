# Telegram AI Webhook Chatbot (Production-Grade)

This repository contains a full-featured, zero-shortcut Telegram AI Chatbot designed using **Express (Webhook)**, **Supabase (Persistent Memory & Pagination)**, and **NVIDIA NIM API**. 

It is strictly built for production robustness, eschewing bloated Telegram SDKs in favor of native ES6 fetch implementations and reliable state management.

---

## 🏗️ Architecture Explanations

1. **Webhook Serverless Design**: Instead of long-polling (which crashes, times out, and scales poorly), this Express app is natively designed as a generic HTTP endpoint. This makes it directly deployable on highly resilient platforms like Leapcell with 24/7 uptime guarantees.
2. **Native Fetch Clients**: To keep execution precise and unhindered by abstraction errors (common in unmaintained SDKs), the Telegram and NVIDIA API clients are written tightly around `fetch`.
3. **Database-backed Pagination**: The challenge with chatbots returning long AI generations is that Telegram has a ~4096 char limit, and doing massive page chunks breaks UX. By routing all outputs through an intelligent semantic chunker and storing the resultant array into Supabase via `pagination_states`, the webhook can instantly answer "Next Page" or "Previous Page" clicks without keeping data in volatile memory (which resets on serverless cold starts).
4. **Resilience**: NVIDIA NIM calls are wrapped in 1-2 retries with explicit `AbortController` timeouts. 
5. **Content Normalizer**: An advanced formatter strips messy AI Markdown, translates Math formulas into standard code blocks, and sanitizes dangerous HTML, preventing sudden 400 Bad Request Telegram API errors.

---

## 📂 File-by-file Breakdown

- **`src/server.js`**: Core Express setup taking over the root entry and mapping `/webhook` to handling events.
- **`src/config.js`**: Universal mapping and validation of required environment variables.
- **`src/handlers/update.js`**: Traffic controller identifying if the ping is a `message` or a `callback_query`.
- **`src/handlers/message.js`**: Receives user inputs and PDFs, queries the NVIDIA NIM model alongside previous conversational context loaded from DB, normalizes the text, and splits it into chunks.
- **`src/handlers/callback.js`**: Responsible for the Inline UI Keyboard. It executes actions like FAST mode toggles, memory clearing, page flipping, and response regeneration.
- **`src/services/db.js`**: Wraps `@supabase/supabase-js` heavily typed methods to log contexts, fetch user mode preferences, and load persistent pagination JSON chunks securely.
- **`src/services/telegram.js`**: Handles Telegram API interaction via fetch.
- **`src/services/llm.js`**: Integrates NVIDIA NIM configurations, injecting memory contexts cleanly into the target model schemas.
- **`src/services/document.js`**: Downloads native Buffer arrays directly off the Telegram raw file streams and processes them through `pdf-parse`.
- **`src/utils/formatter.js`**: Re-maps LaTeX inputs commonly outputted by LLaMA implementations (`$..$`/`$$..$$`) into standard Telegram `<code>` blocks and cleans list structures.
- **`src/utils/pagination.js`**: Prevents chunking paragraphs directly in half. Keeps limits explicitly at roughly ~1000 characters so messages fit optimally on mobile phone screens.
- **`supabase_schema.sql`**: The entire relational PostgreSQL topology.

---

## 💾 Supabase Setup 

1. Create a project at [Supabase](https://supabase.com/).
2. Navigate to **SQL Editor**.
3. Copy the contents of `supabase_schema.sql` into the editor and hit **Run**.
4. Retrieve your `Project URL` and `anon public` keys from **Project Settings > API** and place them in the `.env` file.

---

## 🚀 Setup Steps (Local)

1. Clone or ensure you are in the project root containing `package.json`.
2. Run `npm install` to grab dependencies (`express`, `dotenv`, `@supabase/supabase-js`, `pdf-parse`).
3. Copy `.env.example` to `.env` and fill the variables.
4. Download [Ngrok](https://ngrok.com/). We need this to expose your local Express app to the internet.
5. Boot your server:
   ```bash
   npm run start
   ```
   *Expect output:* `[🚀 SERVER] Bot webhook listening on port 3000`

6. In a new terminal, boot Ngrok:
   ```bash
   ngrok http 3000
   ```
7. Copy the Ngrok Forwarding URL (e.g., `https://abcdef.ngrok-free.app`).

---

## 🔌 Webhook Setup (Telegram)

Now that you have a public endpoint (Ngrok or Leapcell domain), bind it to your bot.

Run this simple CURL command or paste this directly into your browser URL bar:

```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<YOUR_DOMAIN>/webhook
```

*Example:* `https://api.telegram.org/bot123456:ABC-DEF/setWebhook?url=https://abcdef.ngrok-free.app/webhook`

If you visit `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo`, it should show the URL perfectly installed and active.

---

## ☁️ Leapcell Deployment Guide

1. Push your repository to GitHub.
2. In Leapcell Dashboard, create a new **App**.
3. Link your GitHub account and select this repository.
4. Set the command to: `npm run start` (Though Leapcell automatically detects standard `server.js` Express defaults).
5. In your Leapcell **Environment Variables**, duplicate ALL values from your `.env` string.
6. Important: Under `WEBHOOK_URL`, place the given `.leapcell.dev` container URL.
7. Click **Deploy**.
8. Once live, configure the new Leapcell URL locally with the `setWebhook` API logic referenced above to transition from local Ngrok to fully hosted.

---

## ✅ Example Requests & Responses

* **User**: "What is the capital of France?"
  * **System Action**: Extracts input -> Fetches last 15 array entries from `messages` in DB -> Appends to Llama3.
  * **AI Output**: "The capital of France is Paris."
  * **UI Rendered**:
    ```
    The capital of France is Paris.

    [ ⚡ Fast ] [ 🗑️ Clear Memory ] [ 🔄 Regenerate ]
    ```
* **User clicks '[ 🔄 Regenerate ]'**:
  * **System Action**: `src/handlers/callback.js` drops the old instance from contextual history array -> invokes LLM again -> edits original message.
  * **AI Output**: "Paris is the capital of France, known for its history."
* **User sends a PDF File**:
  * **System Action**: Downloads Blob from Telegram -> parses text -> Injects standard system prompt wrapper `[PDF Content excerpt]: ...` -> calls NIM.
  * **AI Output**: "Here is a brief summary of the parsed scientific document provided: ..."
