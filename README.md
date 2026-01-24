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
   npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
   npx wrangler secret put CLOUDFLARE_API_TOKEN
   ```
   *(The terminal will ask you to paste each key one by one.)*

### 5. Final Connection
1. After deploying, Cloudflare will give you a URL (e.g., `https://bsid-js.username.workers.dev`).
2. Go back to the **Discord Developer Portal** -> **General Information**.
3. Paste your URL into the **Interactions Endpoint URL** field and click **Save Changes**.

---

## 🔄 How to Enable Automatic Updates
To have your bot automatically redeploy when you modify code on GitHub, follow these steps:

1. Go to your GitHub Repository -> **Settings** -> **Secrets and variables** -> **Actions**.
2. Click **New repository secret** and add the following keys (copy exact names):

| Secret Name | Description |
|:---|:---|
| `CLOUDFLARE_API_TOKEN` | Create this in Cloudflare Dashboard -> My Profile -> API Tokens. Permissions: `Worker Scripts: Edit` and `Audit Logs: Read`. |
| `CLOUDFLARE_ACCOUNT_ID`| Found in the Cloudflare Dashboard URL or sidebar. |
| `DISCORD_TOKEN` | Your Bot Token. |
| `DISCORD_PUBLIC_KEY` | Found in General Info of Discord Dev Portal. |
| `DISCORD_APPLICATION_ID`| Found in General Info of Discord Dev Portal. |
| `GEMINI_API_KEY` | Your AI Studio API Key. |
| `OWNER_IDS` | Comma-separated user IDs (e.g., `12345,67890`) |

<p>your bot should now be up to date and stay that way!</p>

### Auto-Sync with Developer
This repository includes a `Sync with Upstream` workflow. It checks the main developer repository (`averlice/bsid-js`) every hour. If there are updates, it pulls them into your fork automatically.
- **Combined with the Deploy workflow**, this means your bot effectively updates itself entirely on its own!

<h1>how do i play with the bot?</h1>


---

## 🛠 Commands Included
- `/gemini` - Chat with Gemini 3.
- `/describe` - Detailed image description for accessibility.
- `/ocr` - Extract text from images.
- `/ping` - Check latency and Cloudflare diagnostics.
- `/logs` - (Owner Only) View recent Cloudflare audit logs.
- `/say` - (Owner Only) Send plaintext.
- `/esay` - (Owner Only) Send JSON-formatted embeds.

## 📝 License
This project is licensed under the MIT License.
