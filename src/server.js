import { Router } from 'itty-router';
import { InteractionResponseType, InteractionType } from 'discord-interactions';
import { generateGeminiResponse } from './gemini.js';

const router = Router();

// Helper to convert hex strings to Uint8Array
function hexToUint8Array(hex) {
  return new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

// Optimization: Cache the encoder and key to save CPU on the Free Tier
const encoder = new TextEncoder();
let CACHED_PUBLIC_KEY = null;

// Helper to truncate long messages
function truncateMessage(text, limit = 1900) {
  if (text.length <= limit) return text;
  return text.substring(0, limit) + '... (truncated)';
}

router.get('/', (request, env) => {
  const hasKey = !!env.DISCORD_PUBLIC_KEY;
  return new Response(`✅ Worker is LIVE\n🔑 Secrets: ${hasKey ? 'Loaded' : 'Missing'}\n\nUse this URL in Discord Developer Portal!`, {
      headers: { 'content-type': 'text/plain' }
  });
});

async function updateStatus(applicationId, interactionToken, message) {
    const url = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`;
    await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message })
    });
}

async function handleDeferredExecution(applicationId, interactionToken, resultPromise) {
    const url = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`;
    
    try {
        const result = await resultPromise;
        const body = typeof result === 'string' ? { content: result } : result;
        
        const resp = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!resp.ok) {
            const errorText = await resp.text();
            throw new Error(`Discord API ${resp.status}: ${errorText}`);
        }
    } catch (err) {
        console.error("CRITICAL ERROR:", err);
        try {
            await fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: `❌ **Bot Error:** ${err.message}` })
            });
        } catch (e) {}
    }
}

router.post('/', async (request, env, ctx) => {
  const { DISCORD_PUBLIC_KEY, GEMINI_API_KEY, DISCORD_APPLICATION_ID } = env;
  
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  const bodyText = await request.text();

  // Verify signature using the bodyText we just read
  const isValid = await (async () => {
    try {
      const timestampData = encoder.encode(timestamp);
      const bodyData = encoder.encode(bodyText);
      const message = new Uint8Array(timestampData.length + bodyData.length);
      message.set(timestampData);
      message.set(bodyData, timestampData.length);

      if (!CACHED_PUBLIC_KEY) {
          CACHED_PUBLIC_KEY = await crypto.subtle.importKey(
            'raw',
            hexToUint8Array(DISCORD_PUBLIC_KEY),
            { name: 'Ed25519', namedCurve: 'Ed25519' },
            false,
            ['verify']
          );
      }

      return await crypto.subtle.verify(
        'Ed25519',
        CACHED_PUBLIC_KEY,
        hexToUint8Array(signature),
        message
      );
    } catch (e) {
      console.error("Verification Error:", e);
      return false;
    }
  })();

  if (!isValid) {
    return new Response('Invalid request signature', { status: 401 });
  }

  const interaction = JSON.parse(bodyText);

  if (interaction.type === InteractionType.PING) {
    return new Response(JSON.stringify({ type: InteractionResponseType.PONG }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const { name, options, resolved } = interaction.data;

    // --- Command: /ping ---
    if (name === 'ping') {
        const now = Date.now();
        const latency = timestamp ? (now - (parseInt(timestamp) * 1000)) : 'unknown';
        
        // Cloudflare Specific Diagnostics
        const colo = request.cf?.colo || 'Unknown';
        const city = request.cf?.city || 'Unknown City';
        const country = request.cf?.country || 'Unknown Country';
        const region = request.cf?.region || 'Unknown Region';

        const embed = {
            title: "🏓 Pong!",
            color: 0x00ff00,
            fields: [
                { name: "📡 Interaction Latency", value: `\`${latency}ms\``, inline: true },
                { name: "☁️ Cloudflare Node", value: `\`${colo}\``, inline: true },
                { name: "🌍 Location", value: `${city}, ${region}, ${country}`, inline: false }
            ],
            footer: { text: `App ID: ${DISCORD_APPLICATION_ID} • Serverless` }
        };

        return new Response(JSON.stringify({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { embeds: [embed], flags: 64 }, // Ephemeral
        }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (name === 'test' || name === 'gemini' || name === 'describe' || name === 'esay' || name === 'testembed' || name === 'ocr' || name === 'Describe Image') {
        // Return Deferred Response IMMEDIATELY to stop timeouts
        // Flags: 64 makes it ephemeral (only user sees it)
        const response = new Response(JSON.stringify({ type: 5, data: { flags: 64 } }), { 
            headers: { 'Content-Type': 'application/json' } 
        });

        const logic = async () => {
            if (name === 'testembed') {
                return {
                    content: "This is a test embed!",
                    embeds: [{
                        title: "Success ✅",
                        description: "If you can see this, the bot's embed system is working perfectly.",
                        color: 0x00ff00
                    }]
                };
            }
            // Check Owner ID inside the background logic
            if (name === 'esay') {
                const embedJson = options.find(o => o.name === 'embed_json')?.value;
                try {
                    const data = JSON.parse(embedJson);
                    // If they provided the full { embeds: [...] } structure, use it
                    if (data.embeds) {
                        return { content: data.content || "", embeds: data.embeds };
                    }
                    // Otherwise, assume they provided a single embed object
                    return { content: "", embeds: Array.isArray(data) ? data : [data] };
                } catch (e) {
                    return `❌ **JSON Error:** ${e.message}`;
                }
            }

            const model = (options?.find(o => o.name === 'model'))?.value || 'gemini-3-flash-preview';
            
            if (name === 'test') {
                const text = await generateGeminiResponse("Test check. Is the API working?", GEMINI_API_KEY, null, null, model);
                return `**Test Result (${model}):**\n${text}`;
            }
            if (name === 'gemini') {
                const prompt = (options?.find(o => o.name === 'prompt'))?.value;
                const text = await generateGeminiResponse(prompt, GEMINI_API_KEY, null, null, model);
                return `**Prompt:** ${prompt}\n\n**Gemini (${model}):** ${text}`;
            }
            if (name === 'describe') {
                const imgOption = options.find(o => o.name === 'image');
                if (!imgOption) return '❌ Error: Image attachment not found.';
                
                const attachment = resolved.attachments[imgOption.value];
                if (!attachment) return '❌ Error: Could not resolve image attachment.';

                await updateStatus(DISCORD_APPLICATION_ID, interaction.token, '📥 **Downloading image...**');
                
                const imageResp = await fetch(attachment.url);
                if (!imageResp.ok) throw new Error(`Failed to download image from Discord (${imageResp.status})`);

                const arrayBuffer = await imageResp.arrayBuffer();
                if (arrayBuffer.byteLength > 5 * 1024 * 1024) {
                    return '❌ Error: Image is too large (max 5MB).';
                }

                await updateStatus(DISCORD_APPLICATION_ID, interaction.token, '🧠 **Analyzing with Gemini...**');
                
                const text = await generateGeminiResponse("Describe this image in detail for a blind user, focusing on the key objects, colors, and the overall scene. Keep the description under 2000 characters.", GEMINI_API_KEY, new Uint8Array(arrayBuffer), attachment.content_type, model);
                return truncateMessage(`**Image Description (${model}):**\n${text}`);
            }

            if (name === 'ocr') {
                const imgOption = options.find(o => o.name === 'image');
                if (!imgOption) return '❌ Error: Image attachment not found.';
                
                const attachment = resolved.attachments[imgOption.value];
                if (!attachment) return '❌ Error: Could not resolve image attachment.';

                await updateStatus(DISCORD_APPLICATION_ID, interaction.token, '📥 **Downloading image...**');
                
                const imageResp = await fetch(attachment.url);
                if (!imageResp.ok) throw new Error(`Failed to download image from Discord (${imageResp.status})`);

                const arrayBuffer = await imageResp.arrayBuffer();
                if (arrayBuffer.byteLength > 5 * 1024 * 1024) {
                    return '❌ Error: Image is too large (max 5MB).';
                }

                await updateStatus(DISCORD_APPLICATION_ID, interaction.token, '🔍 **Extracting text...**');
                
                const text = await generateGeminiResponse(
                    "Please extract all the text from this image exactly as it appears. Do not describe the image, just provide the text. If there is no text, say 'No text found'. Preserve the layout where possible.", 
                    GEMINI_API_KEY, 
                    new Uint8Array(arrayBuffer), 
                    attachment.content_type, 
                    model
                );
                return truncateMessage(`**OCR Result (${model}):**\n${text}`);
            }

            if (name === 'Describe Image') {
                const targetId = interaction.data.target_id;
                const targetMsg = resolved.messages[targetId];

                if (!targetMsg || !targetMsg.attachments || targetMsg.attachments.length === 0) {
                    return '❌ Error: No images found in the selected message.';
                }

                // Just grab the first image for now
                const attachment = targetMsg.attachments[0];

                // Check if it's actually an image
                if (!attachment.content_type.startsWith('image/')) {
                    return '❌ Error: The first attachment is not an image.';
                }

                await updateStatus(DISCORD_APPLICATION_ID, interaction.token, '📥 **Downloading image...**');
                
                const imageResp = await fetch(attachment.url);
                if (!imageResp.ok) throw new Error(`Failed to download image from Discord (${imageResp.status})`);

                const arrayBuffer = await imageResp.arrayBuffer();
                if (arrayBuffer.byteLength > 5 * 1024 * 1024) {
                    return '❌ Error: Image is too large (max 5MB).';
                }

                await updateStatus(DISCORD_APPLICATION_ID, interaction.token, '🧠 **Analyzing with Gemini...**');
                
                const text = await generateGeminiResponse(
                    "Describe this image in detail for a blind user, focusing on the key objects, colors, and the overall scene. Keep the description under 2000 characters.", 
                    GEMINI_API_KEY, 
                    new Uint8Array(arrayBuffer), 
                    attachment.content_type, 
                    'gemini-3-flash-preview' // Default model for context menu
                );
                return truncateMessage(`**Image Description:**\n${text}`);
            }
        };

        ctx.waitUntil(handleDeferredExecution(DISCORD_APPLICATION_ID, interaction.token, logic()));
        return response;
    }

    // --- Command: /say (Owner Only) ---
    if (name === 'say') {
        const ownerIds = env.OWNER_IDS ? env.OWNER_IDS.split(',') : [];
        const userId = interaction.member?.user?.id || interaction.user?.id;

        if (!ownerIds.includes(userId)) {
            return new Response(JSON.stringify({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: '❌ Error: This command is restricted to bot owners only.', flags: 64 },
            }), { headers: { 'Content-Type': 'application/json' } });
        }

        const message = options.find(o => o.name === 'message')?.value;
        return new Response(JSON.stringify({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: message },
        }), { headers: { 'Content-Type': 'application/json' } });
    }
  }

  return new Response(JSON.stringify({ error: 'Unknown Command or Interaction' }), { status: 400 });
});

router.all('*', () => new Response('Not Found.', { status: 404 }));

export default { fetch: router.fetch };
