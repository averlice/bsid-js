# BSID-JS: Serverless Gemini Discord Bot

A high-performance Discord bot powered by Google's Gemini AI, designed to run 24/7 on Cloudflare Workers.

## 🚀 Setup Instructions

### 1. Discord Developer Portal Setup
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create a **New Application**.
3. Under the **Bot** tab:
   - Reset/Copy your **Token**.
   - Enable **Message Content Intent** (required for some features).
4. Under **General Information**:
   - Copy your **Application ID** and **Public Key**.

### 2. Local Configuration
1. Clone this repository.
2. Install the necessary tools:
   ```bash
   npm install
   ```
3. Create your secrets file:
   - Rename `.dev.vars.example` to `.dev.vars`.
   - Paste your **Token**, **Application ID**, **Public Key**, and **Gemini API Key** into this file.

### 3. Command Registration
Before deploying, tell Discord what commands your bot has:
```bash
npm run register
```

### 4. Cloudflare Deployment
1. Log in to Cloudflare via the terminal:
   ```bash
   npx wrangler login
   ```
2. Deploy the code:
   ```bash
   npm run deploy
   ```
3. **Upload your Secrets to the Cloud:**
   Because Cloudflare Workers don't use `.dev.vars` in production, you must upload your keys once:
   ```bash
   npx wrangler secret put DISCORD_TOKEN
   npx wrangler secret put DISCORD_PUBLIC_KEY
   npx wrangler secret put DISCORD_APPLICATION_ID
   npx wrangler secret put GEMINI_API_KEY
   npx wrangler secret put OWNER_IDS
   ```
   *(The terminal will ask you to paste each key one by one.)*

### 5. Final Connection
1. After deploying, Cloudflare will give you a URL (e.g., `https://bsid-js.username.workers.dev`).
2. Go back to the **Discord Developer Portal** -> **General Information**.
3. Paste your URL into the **Interactions Endpoint URL** field and click **Save Changes**.

---

## 🛠 Commands Included
- `/gemini` - Chat with Gemini 3.
- `/describe` - Detailed image description for accessibility.
- `/ping` - Check latency and status.
- `/say` - (Owner Only) Send plaintext.
- `/esay` - (Owner Only) Send JSON-formatted embeds.

## 📝 License
This project is licensed under the MIT License.