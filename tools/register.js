import dotenv from 'dotenv';
import process from 'node:process';

dotenv.config({ path: '.dev.vars' }); // Read from .dev.vars in the root

const token = process.env.DISCORD_TOKEN;
const applicationId = process.env.DISCORD_APPLICATION_ID;

if (!token || !applicationId) {
  console.error('Error: DISCORD_TOKEN and DISCORD_APPLICATION_ID are required.');
  console.error('Make sure they are set in your environment or .dev.vars file.');
  process.exit(1);
}

const commands = [
  {
    name: 'ping',
    description: 'Replies with Pong! and checks status.',
    integration_types: [0, 1],
    contexts: [0, 1, 2]
  },
  {
    name: 'test',
    description: 'Tests connection to Cloudflare Workers AI.',
    integration_types: [0, 1],
    contexts: [0, 1, 2],
    options: [
        {
            name: 'model',
            description: 'Specify the model to test (default: llama-vision)',
            type: 3, // STRING
            required: false,
            choices: [
                { name: 'Llama 3.2 11B Vision (Cloudflare)', value: 'llama-vision' },
                { name: 'Gemma 3 12B (Google)', value: 'gemma-3-12b' }
            ]
        }
    ]
  },
  {
    name: 'describe',
    description: 'Describes an attached image using Cloudflare Workers AI.',
    integration_types: [0, 1],
    contexts: [0, 1, 2],
    options: [
        {
            name: 'image',
            description: 'The image to describe',
            type: 11, // ATTACHMENT
            required: true
        },
        {
            name: 'model',
            description: 'Specify the model to use (default: llama-vision)',
            type: 3, // STRING
            required: false,
             choices: [
                { name: 'Llama 3.2 11B Vision (Cloudflare)', value: 'llama-vision' },
                { name: 'Gemma 3 12B (Google)', value: 'gemma-3-12b' }
            ]
        },
        {
            name: 'prompt',
            description: 'Optional: Custom instructions for the description (e.g. "be concise")',
            type: 3, // STRING
            required: false
        }
    ]
  },
  {
    name: 'ocr',
    description: 'Extracts text from an image using Cloudflare Workers AI.',
    integration_types: [0, 1],
    contexts: [0, 1, 2],
    options: [
        {
            name: 'image',
            description: 'The image to read text from',
            type: 11, // ATTACHMENT
            required: true
        },
        {
            name: 'model',
            description: 'Specify the model to use (default: llama-vision)',
            type: 3, // STRING
            required: false,
             choices: [
                { name: 'Llama 3.2 11B Vision (Cloudflare)', value: 'llama-vision' },
                { name: 'Gemma 3 12B (Google)', value: 'gemma-3-12b' }
            ]
        }
    ]
  },
  {
    name: 'Describe Image',
    type: 3, // MESSAGE context menu
    integration_types: [0, 1],
    contexts: [0, 1, 2]
  },
  {
    name: 'say',
    description: 'Bot Owner Only: Makes the bot say a plaintext message.',
    options: [
        {
            name: 'message',
            description: 'The message text to send.',
            type: 3, // STRING
            required: true
        }
    ]
  },
  {
    name: 'esay',
    description: 'Bot Owner Only: Makes the bot send a JSON-formatted embed.',
    options: [
        {
            name: 'embed_json',
            description: 'The JSON string for the Discord embed.',
            type: 3, // STRING
            required: true
        }
    ]
  },
  {
    name: 'testembed',
    description: 'Debug: Sends a hard-coded test embed.'
  },
  {
    name: 'logs',
    description: 'Bot Owner Only: Fetches recent Cloudflare Audit Logs for this account.'
  },
  {
    name: 'agree',
    description: 'Bot Owner Only: Agrees to Meta\'s Llama 3.2 license for Workers AI.'
  },
];

async function registerCommands() {
  const url = `https://discord.com/api/v10/applications/${applicationId}/commands`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${token}`,
    },
    body: JSON.stringify(commands),
  });

  if (response.ok) {
    console.log('Registered all commands');
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.error('Error registering commands');
    const text = await response.text();
    console.error(text);
  }
}

registerCommands();
