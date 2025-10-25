import { chatWithAI, parseExpenseFromText } from './openai.service';

// Simple test to verify OpenAI service is working
async function testOpenAIService() {
  console.log('🧪 Testing OpenAI Service...\n');

  try {
    // Test 1: Simple chat
    console.log('Test 1: Simple Chat');
    const chatResponse = await chatWithAI([
      { role: 'user', content: 'Say "Hello from Budget App!"' }
    ]);
    console.log('✅ Chat Response:', chatResponse);
    console.log();

    // Test 2: Expense parsing
    console.log('Test 2: Expense Parsing');
    const expense = await parseExpenseFromText('I spent $50 on groceries');
    console.log('✅ Parsed Expense:', JSON.stringify(expense, null, 2));
    console.log();

    console.log('🎉 All tests passed!');
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
