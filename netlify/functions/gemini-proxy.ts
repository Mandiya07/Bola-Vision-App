import { GoogleGenAI, GenerateContentResponse, GenerateImagesResponse } from "@google/genai";
import type { Handler, HandlerEvent } from "@netlify/functions";

const API_KEY = process.env.API_KEY;

// Initialize the AI client outside the handler for reuse across invocations.
// This is a performance optimization for serverless environments.
let ai: GoogleGenAI;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
}

const handler: Handler = async (event: HandlerEvent) => {
  // Ensure the API key is configured on the server
  if (!ai) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "API_KEY is not configured on the server." }),
    };
  }
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { method, params } = JSON.parse(event.body || '{}');

    if (!method || !params) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing method or params in request body' }),
      };
    }
    
    let result: GenerateContentResponse | GenerateImagesResponse;

    switch (method) {
        case 'generateContent':
            result = await ai.models.generateContent(params);
            break;
        case 'generateImages':
            result = await ai.models.generateImages(params);
            break;
        default:
            return {
                statusCode: 400,
                body: JSON.stringify({ error: `Unsupported method: ${method}` }),
            };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      // The entire response from the Gemini API is forwarded to the client.
      body: JSON.stringify(result),
    };

  } catch (error: any) {
    console.error('Error in Gemini proxy function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'An internal server error occurred' }),
    };
  }
};

export { handler };