import { chatWithAIAndTools } from './openai.service';

// Simple test to verify OpenAI service is working
async function testOpenAIService() {
  console.log('🧪 Testing OpenAI Service...\n');

  try {
    // Test 1: Chat with function calling (simulating expense creation)
    console.log('Test 1: Chat with Function Calling');
    
    const tools = [
      {
        type: 'function',
        function: {
          name: 'create_expense',
          description: 'Create an expense entry',
          parameters: {
            type: 'object',
            properties: {
              amount: { type: 'number', description: 'Amount in TL' },
              description: { type: 'string', description: 'Expense description' },
              category: { type: 'string', description: 'Expense category' },
            },
            required: ['amount', 'description'],
          },
        },
      },
    ];

    const messages = [
      { 
        role: 'system', 
        content: 'You are a budget assistant. When users mention spending money, use the create_expense tool.' 
      },
      { 
        role: 'user', 
        content: 'I spent 50 TL on groceries' 
      }
    ];

    const response = await chatWithAIAndTools(messages, tools);
    const assistantMessage = response.choices[0]?.message;
    
    console.log('✅ AI Response:', assistantMessage.content || '(Tool call requested)');
    if (assistantMessage.tool_calls) {
      console.log('🔧 Tool Calls:', JSON.stringify(assistantMessage.tool_calls, null, 2));
    }
    console.log();

    console.log('🎉 Test passed!');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.message.includes('not configured')) {
      console.log('\n💡 Make sure to configure your Azure OpenAI credentials in .env file');
    }
  }
}

// Only run if called directly
if (require.main === module) {
  testOpenAIService();
}

export { testOpenAIService };
