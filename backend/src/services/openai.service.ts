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

// Function calling approach for chat-based expense creation
export async function chatWithAIAndTools(
  messages: Array<{ role: string; content: string | Array<any> }>,
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

// Streaming version for better UX
export async function chatWithAIAndToolsStream(
  messages: Array<{ role: string; content: string | Array<any> }>,
  tools: Array<any>
) {
  if (!client) {
    throw new Error('Azure OpenAI client not configured');
  }

  const stream = await client.chat.completions.create({
    model: deploymentName,
    messages: messages as any,
    tools: tools,
    tool_choice: 'auto',
    stream: true,
  });

  return stream;
}
