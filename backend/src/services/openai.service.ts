import { DefaultAzureCredential, getBearerTokenProvider } from "@azure/identity";
import { OpenAI } from "openai";

const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT || '';
const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4';
const useApiKey = process.env.AZURE_OPENAI_USE_API_KEY === 'true';

let client: OpenAI | null = null;

if (azureEndpoint) {
  if (useApiKey) {
    // Use API Key authentication
    const apiKey = process.env.AZURE_OPENAI_API_KEY || '';
    client = new OpenAI({
      baseURL: `${azureEndpoint}`,
      apiKey: apiKey,
    });
  } else {
    // Use Azure AD authentication
    const tokenProvider = getBearerTokenProvider(
      new DefaultAzureCredential(),
      'https://cognitiveservices.azure.com/.default'
    );
    client = new OpenAI({
      baseURL: `${azureEndpoint}`,
      apiKey: tokenProvider
    });
  }
}

export async function chatWithAI(messages: Array<{ role: string; content: string }>) {
  if (!client) {
    throw new Error('Azure OpenAI client not configured');
  }

  const response = await client.chat.completions.create({
    model: deploymentName,
    messages: messages as any,
  });

  return response.choices[0]?.message?.content || '';
}

export async function parseInvoice(base64Image: string) {
  if (!client) {
    throw new Error('Azure OpenAI client not configured');
  }

  const messages = [
    {
      role: 'system',
      content: 'You are a helpful assistant that extracts information from invoice images. Extract the total amount, date, and description. The currency is Turkish Lira (TL/₺). Return ONLY a JSON object with fields: amount (number in TL), date (ISO string), description (string). Do not include any markdown formatting or code blocks.'
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Please analyze this invoice image and extract the relevant information. Return only the JSON object.'
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${base64Image}`
          }
        }
      ]
    }
  ];

  const response = await client.chat.completions.create({
    model: deploymentName,
    messages: messages as any,
  });

  const content = response.choices[0]?.message?.content || '{}';
  
  try {
    // Remove markdown code blocks if present
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanContent);
  } catch {
    return { amount: 0, date: new Date().toISOString(), description: 'Failed to parse invoice' };
  }
}

export async function parseExpenseFromText(text: string) {
  if (!client) {
    throw new Error('Azure OpenAI client not configured');
  }

  const messages = [
    {
      role: 'system',
      content: 'You are a helpful assistant that extracts expense information from natural language. The currency is Turkish Lira (TL/₺). Extract the amount in TL, description, and optionally category. Return ONLY a JSON object with fields: amount (number in TL), description (string), category (string or null). Do not include any markdown formatting or code blocks. Examples: "market alışverişine 50 TL harcadım" -> {"amount": 50, "description": "market alışverişi", "category": "food"}, "yemek için 100 lira ödedim" -> {"amount": 100, "description": "yemek", "category": "food"}'
    },
    {
      role: 'user',
      content: text
    }
  ];

  const response = await client.chat.completions.create({
    model: deploymentName,
    messages: messages as any,
  });

  const content = response.choices[0]?.message?.content || '{}';
  
  try {
    // Remove markdown code blocks if present
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanContent);
  } catch {
    return { amount: 0, description: text, category: null };
  }
}

// Function calling approach for chat-based expense creation
export async function chatWithAIAndTools(
  messages: Array<{ role: string; content: string }>,
  tools: Array<any>
) {
  if (!client) {
    throw new Error('Azure OpenAI client not configured');
  }

  const response = await client.chat.completions.create({
    model: deploymentName,
    messages: messages as any,
    tools: tools,
    tool_choice: 'auto', // Let the model decide when to call tools
  });

  return response;
}
