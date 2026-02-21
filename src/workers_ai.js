export async function generateVisionResponse(prompt, env, imageBuffer, mimeType, modelAlias = 'llama-vision') {
  if (!env.AI) {
    throw new Error("Cloudflare AI binding is not configured.");
  }

  // Map simplified alias to full model ID
  const modelMap = {
    'llama-vision': '@cf/meta/llama-3.2-11b-vision-instruct',
    'gemma-3-12b': '@cf/google/gemma-3-12b-it'
  };
  
  const modelId = modelMap[modelAlias] || modelMap['llama-vision'];

  // Convert buffer to base64 for data URI format
  const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
  const dataUri = `data:${mimeType};base64,${base64Image}`;

  const runModel = async () => {
    if (modelAlias === 'llama-vision') {
      // Llama 3.2 Vision on Cloudflare often performs better with this specific structure
      return await env.AI.run(
        modelId,
        {
          prompt: prompt,
          image: [...new Uint8Array(imageBuffer)],
          max_tokens: 1024
        }
      );
    } else {
      // Gemma 3 and others use the standard OpenAI-like multimodal messages
      return await env.AI.run(
        modelId,
        {
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: dataUri } }
              ]
            }
          ],
          max_tokens: 1024
        }
      );
    }
  };

  const agreeToLicense = async () => {
      // Only Llama currently requires this specific 'agree' handshake
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
