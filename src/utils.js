import { verifyKey } from 'discord-interactions';

export function VerifyDiscordRequest(key) {
  return async (request, env) => {
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    const body = await request.clone().arrayBuffer();

    if (!signature || !timestamp) {
      return false;
    }

    const isValid = verifyKey(
      body,
      signature,
      timestamp,
      key
    );

    return isValid;
  };
}
