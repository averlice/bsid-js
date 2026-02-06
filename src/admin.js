export async function handleAdminRequest(request, env) {
    const url = new URL(request.url);
    const { DISCORD_CLIENT_SECRET, DISCORD_APPLICATION_ID, OWNER_IDS } = env;
    
    const REDIRECT_URI = 'https://ali.galaxy4productions.com/admin/callback';

    console.log(`[Admin] Path: ${url.pathname} | Using Redirect: ${REDIRECT_URI}`);

    if (url.pathname === '/admin/api/debug-logs') {
        const logsRaw = await env.LOG_STORAGE.get('debug_logs');
        return new Response(logsRaw || "[]", {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (url.pathname === '/admin/login') {
        const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_APPLICATION_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify`;
        console.log(`[Admin] Login redirecting to: ${oauthUrl}`);
        return Response.redirect(oauthUrl, 302);
    }

    if (url.pathname === '/admin/callback') {
        const code = url.searchParams.get('code');
        if (!code) return new Response('No code provided', { status: 400 });

        const tokenResp = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: DISCORD_APPLICATION_ID,
                client_secret: DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: REDIRECT_URI,
            }),
        });

        const tokenData = await tokenResp.json();
        if (!tokenData.access_token) {
            console.error('Discord OAuth Error:', tokenData);
            return new Response(`Failed to get access token: ${tokenData.error_description || tokenData.error || 'Unknown Error'}`, { status: 401 });
        }

        const userResp = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const user = await userResp.json();

        const owners = OWNER_IDS ? OWNER_IDS.split(',') : [];
        if (!owners.includes(user.id)) {
            console.warn(`[SECURITY ALERT] Unauthorized Admin Access Attempt by User: ${user.username} (${user.id}) IP: ${request.headers.get('CF-Connecting-IP')}`);
            return new Response('403 Forbidden', { status: 403 });
        }

        return new Response(renderDashboard(user, env), {
            headers: { 'Content-Type': 'text/html' }
        });
    }

    return new Response('Admin Portal: <a href="/admin/login">Login</a>', { 
        headers: { 'Content-Type': 'text/html' } 
    });
}

function renderDashboard(user, env) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>BSID Admin</title>
        <style>
            body { font-family: sans-serif; background: #121212; color: #e0e0e0; padding: 20px; line-height: 1.5; }
            .card { background: #1e1e1e; padding: 20px; margin-bottom: 20px; border-radius: 8px; border: 1px solid #333; }
            h1 { color: #5865F2; }
            textarea { 
                width: 100%; 
                height: 500px; 
                background: #000; 
                color: #00ff00; 
                font-family: monospace; 
                padding: 10px; 
                border-radius: 4px; 
                border: 1px solid #444;
                resize: vertical;
            }
            .controls { margin-bottom: 10px; }
            button { background: #5865F2; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
        </style>
    </head>
    <body>
        <h1>🛡️ BSID Admin Dashboard</h1>
        
        <div class="card">
            <h3>User Information</h3>
            <p>User: <strong>${user.username}</strong></p>
            <p>ID: <code>${user.id}</code></p>
        </div>

        <div class="card">
            <h3>📟 Debug Logs</h3>
            <div class="controls">
                <button onclick="fetchLogs()">🔄 Refresh Logs Manually</button>
                <label style="margin-left: 20px;">
                    <input type="checkbox" id="auto-refresh"> Auto-refresh every 5 seconds
                </label>
            </div>
            <textarea id="log-view" readonly aria-label="Console debug logs" placeholder="Logs will appear here..."></textarea>
            <p style="font-size: 0.8em; color: #888;">Note: This text area is read-only. Use your screen reader's navigation keys to read line-by-line.</p>
        </div>

        <script>
            async function fetchLogs() {
                try {
                    const resp = await fetch('/admin/api/debug-logs');
                    const logs = await resp.json();
                    const view = document.getElementById('log-view');
                    
                    const textContent = logs.map(l => {
                        return \`[\${new Date(l.time).toLocaleTimeString()}] [\${l.level.toUpperCase()}] \${l.msg}\`;
                    }).join('\\n');
                    
                    view.value = textContent || "No logs yet.";
                    
                    // Keep scroll at bottom if not manually moved
                    if (view.selectionStart === view.selectionEnd) {
                        view.scrollTop = view.scrollHeight;
                    }
                } catch (e) {
                    console.error("Failed to fetch logs", e);
                }
            }

            setInterval(() => {
                if (document.getElementById('auto-refresh').checked) {
                    fetchLogs();
                }
            }, 5000);

            fetchLogs();
        </script>
    </body>
    </html>
    `;
}
