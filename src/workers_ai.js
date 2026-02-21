export async function generateVisionResponse(prompt, env, imageBuffer, mimeType, modelAlias = 'llama-vision') {
  if (!env.AI) {
    throw new Error("Cloudflare AI binding is not configured.");
  }

  // Map simplified alias to full model ID
  const modelMap = {
    'llama-vision': '@cf/meta/llama-3.2-11b-vision-instruct',
    'gemma-3-27b': '@cf/google/gemma-3-27b-it'
  };
  
  const modelId = modelMap[modelAlias] || modelMap['llama-vision'];

  // Use Uint8Array directly for Workers AI performance
  const imageData = new Uint8Array(imageBuffer);

  const runModel = async () => {
    return await env.AI.run(
      modelId,
      {
        prompt: prompt,
        image: [...imageData],
        max_tokens: 1024
      }
    );
  };

  const agreeToLicense = async () => {
      // Only Llama currently requires this specific 'agree' handshake in this way
      if (modelAlias === 'llama-vision') {
          return await env.AI.run(modelId, { 
              messages: [{ role: "user", content: "agree" }] 
          });
      }
      return null;
  };

  try {
    let response = await runModel();

    if (response && response.error && response.error.toLowerCase().includes("license")) {
        console.log("Meta license agreement required. Attempting to agree...");
        await agreeToLicense();
        response = await runModel(); 
    }

    if (response && response.response) {
      return response.response;
    } else if (typeof response === 'string') {
        return response;
    }
    
    throw new Error("Empty or unexpected response from Workers AI.");

  } catch (error) {
    // Catch-all for license errors thrown as actual exceptions
    if (error.message && (error.message.toLowerCase().includes("license") || error.message.toLowerCase().includes("terms of use"))) {
        try {
            console.log("Caught license error in catch block. Attempting to agree...");
            await agreeToLicense();
            const retryResponse = await runModel();
            return retryResponse.response || retryResponse;
        } catch (retryError) {
            throw new Error(`Failed to agree to license: ${retryError.message}`);
        }
    }
    console.error("Workers AI Error:", error);
    throw error;
  }
}
