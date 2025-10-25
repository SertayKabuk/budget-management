import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { chatWithAI, chatWithAIAndTools } from '../services/openai.service';
import prisma from '../prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

const conversationHistory = new Map<string, ChatMessage[]>();

// Define the create_expense tool
const tools = [
  {
    type: 'function',
    function: {
      name: 'create_expense',
      description: 'Create a new expense entry when the user mentions spending money, buying something, or making a payment. The currency is Turkish Lira (TL/₺). Extract the amount in TL, description, and category from the conversation.',
      parameters: {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            description: 'The amount of money spent in Turkish Lira (e.g., 50.00)',
          },
          description: {
            type: 'string',
            description: 'A brief description of what was purchased or paid for',
          },
          category: {
            type: 'string',
            description: 'The category of the expense (e.g., food, transport, entertainment, shopping, utilities, other)',
            enum: ['food', 'transport', 'entertainment', 'shopping', 'utilities', 'health', 'other'],
          },
        },
        required: ['amount', 'description'],
      },
    },
  },
];

// Tool execution function
async function executeCreateExpense(
  args: { amount: number; description: string; category?: string },
  userId: string,
  groupId: string,
  userName: string,
  io: Server
) {
  // Verify user is a member of the group
  const groupMembership = await prisma.groupMember.findFirst({
    where: {
      groupId: groupId,
      userId: userId
    }
  });

  if (!groupMembership) {
    throw new Error('Access denied: You are not a member of this group');
  }

  const expense = await prisma.expense.create({
    data: {
      amount: args.amount,
      description: args.description,
      category: args.category || 'other',
      userId,
      groupId,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  // Emit to all group members
  io.to(`group-${groupId}`).emit('expense-added', {
    expense,
    addedBy: userName,
  });

  return expense;
}

export function setupWebSocket(io: Server) {
  // Authentication middleware for WebSocket
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; name: string };
      socket.data.user = decoded;
      next();
    } catch (error) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id, 'User:', socket.data.user?.name);

    socket.on('join-group', (groupId: string) => {
      socket.join(`group-${groupId}`);
      console.log(`Socket ${socket.id} joined group ${groupId}`);
    });

    socket.on('chat-message', async (data: { 
      message: string; 
      userId: string; 
      groupId: string;
      userName: string;
    }) => {
      try {
        const { message, userId, groupId, userName } = data;

        // Get or initialize conversation history
        let history = conversationHistory.get(socket.id) || [];
        
        // Add user message
        history.push({ role: 'user', content: message });

        // Add system prompt if first message
        if (history.length === 1) {
          history.unshift({
            role: 'system',
            content: 'You are a helpful budget management assistant for Turkish users. Help users track their expenses in Turkish Lira (TL/₺). When users describe spending money, buying something, or making a payment, use the create_expense tool to record it. Be conversational and friendly. Understand both Turkish and English. Accept amounts in formats like "50 TL", "50 lira", "50₺" or just "50". Confirm when expenses are created.'
          });
        }

        // Call AI with tools
        const response = await chatWithAIAndTools(history, tools);
        const assistantMessage = response.choices[0]?.message;

        if (!assistantMessage) {
          throw new Error('No response from AI');
        }

        // Check if AI wants to call a tool
        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
          // Add assistant's tool call to history
          history.push({
            role: 'assistant',
            content: assistantMessage.content || '',
            tool_calls: assistantMessage.tool_calls,
          });

          // Execute each tool call
          for (const toolCall of assistantMessage.tool_calls) {
            const functionCall = toolCall as any; // Type assertion for OpenAI tool calls
            if (functionCall.function?.name === 'create_expense') {
              try {
                const args = JSON.parse(functionCall.function.arguments);
                const expense = await executeCreateExpense(
                  args,
                  userId,
                  groupId,
                  userName,
                  io
                );

                // Add tool result to history
                history.push({
                  role: 'tool',
                  tool_call_id: functionCall.id,
                  name: 'create_expense',
                  content: JSON.stringify({
                    success: true,
                    expense: {
                      id: expense.id,
                      amount: expense.amount,
                      description: expense.description,
                      category: expense.category,
                    },
                  }),
                });

                // Emit confirmation to user
                socket.emit('expense-created', { expense });
              } catch (error) {
                console.error('Error executing create_expense:', error);
                history.push({
                  role: 'tool',
                  tool_call_id: functionCall.id,
                  name: 'create_expense',
                  content: JSON.stringify({
                    success: false,
                    error: 'Failed to create expense',
                  }),
                });
              }
            }
          }

          // Get final response from AI after tool execution
          const finalResponse = await chatWithAIAndTools(history, tools);
          const finalMessage = finalResponse.choices[0]?.message?.content || 'Expense recorded!';
          
          history.push({ role: 'assistant', content: finalMessage });
          conversationHistory.set(socket.id, history);

          socket.emit('chat-response', {
            message: finalMessage,
            timestamp: new Date(),
          });
        } else {
          // No tool call, just a regular response
          const aiResponse = assistantMessage.content || '';
          history.push({ role: 'assistant', content: aiResponse });
          conversationHistory.set(socket.id, history);

          socket.emit('chat-response', {
            message: aiResponse,
            timestamp: new Date(),
          });
        }

      } catch (error) {
        console.error('Error in chat:', error);
        socket.emit('chat-error', { 
          message: 'Sorry, I encountered an error. Please try again.' 
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      conversationHistory.delete(socket.id);
    });
  });
}
