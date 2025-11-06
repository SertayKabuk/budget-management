import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { chatWithAIAndTools, chatWithAIAndToolsStream } from '../services/openai.service';
import { saveBase64Image } from '../utils/fileUtils';
import prisma from '../prisma';
import { convertDecimalsToNumbers } from '../utils/decimalUtils';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * WebSocket Events:
 * 
 * Emitted by server:
 * - 'expense-added': When a new expense is created (emitted to group room)
 * - 'payment-created': When a new payment is created (emitted from REST API to group room)
 * - 'payment-updated': When a payment status is updated (emitted from REST API to group room)
 * - 'reminder-created': When a new recurring reminder is created (emitted from REST API to group room)
 * - 'reminder-updated': When a reminder is updated (emitted from REST API to group room)
 * - 'reminder-deleted': When a reminder is deleted (emitted from REST API to group room)
 * 
 * Received from client:
 * - 'join-group': Client joins a group room to receive updates
 * - 'chat-message': Client sends a chat message for AI processing
 */

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
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
  {
    type: 'function',
    function: {
      name: 'query_database',
      description: 'Query the budget management database to retrieve expense information, statistics, and insights. Use this when the user asks questions about spending patterns, expense history, totals, averages, or wants to see specific expense records. Supports group-level queries (other members, summaries, debt calculations). Generates and executes SQL queries safely.',
      parameters: {
        type: 'object',
        properties: {
          query_description: {
            type: 'string',
            description: 'Natural language description of what data to retrieve (e.g., "total expenses this month", "Ayfer\'s spending", "group summary", "who owes whom", "debt calculation")',
          },
          time_period: {
            type: 'string',
            description: 'Optional time period filter (e.g., "this month", "last week", "today", "this year", "last 30 days")',
          },
          category: {
            type: 'string',
            description: 'Optional category filter (food, transport, entertainment, shopping, utilities, health, other)',
          },
          user_name: {
            type: 'string',
            description: 'Optional user name to query specific group member\'s expenses (e.g., "Ayfer", "John"). Use when user asks about another person in the group.',
          },
        },
        required: ['query_description'],
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
  io: Server,
  imageUrl?: string // Optional image URL to attach to the expense
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

  const expense = await prisma.expense.createWithAudit({
    data: {
      amount: args.amount,
      description: args.description,
      category: args.category || 'other',
      imageUrl: imageUrl || null, // Save the image URL if provided
      userId,
      groupId,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  // Emit to all group members (convert Decimal to number)
  io.to(`group-${groupId}`).emit('expense-added', {
    expense: convertDecimalsToNumbers(expense),
    addedBy: userName,
  });

  return expense;
}

// Text2SQL execution function with safety controls
async function executeQueryDatabase(
  args: { query_description: string; time_period?: string; category?: string; user_name?: string },
  userId: string,
  groupId: string
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

  const { query_description, time_period, category, user_name } = args;

  // Parse time period into date filters
  const now = new Date();
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  if (time_period) {
    const timePeriodLower = time_period.toLowerCase();
    
    if (timePeriodLower.includes('today')) {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (timePeriodLower.includes('this week')) {
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
    } else if (timePeriodLower.includes('this month')) {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (timePeriodLower.includes('last month')) {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (timePeriodLower.includes('this year')) {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else if (timePeriodLower.match(/last (\d+) days?/)) {
      const days = parseInt(timePeriodLower.match(/last (\d+) days?/)![1]);
      startDate = new Date(now);
      startDate.setDate(now.getDate() - days);
      startDate.setHours(0, 0, 0, 0);
    }
  }

  // Build where clause
  const whereClause: any = {
    groupId: groupId,
  };

  if (startDate) {
    whereClause.date = { gte: startDate };
    if (endDate) {
      whereClause.date = { gte: startDate, lte: endDate };
    }
  }

  if (category) {
    whereClause.category = category;
  }

  // If user_name is specified, find that user in the group
  if (user_name) {
    const targetUser = await prisma.groupMember.findFirst({
      where: {
        groupId: groupId,
        user: {
          name: {
            contains: user_name,
            mode: 'insensitive',
          },
        },
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    if (targetUser) {
      whereClause.userId = targetUser.user.id;
    } else {
      // User not found in group
      return {
        type: 'error',
        message: `"${user_name}" isimli kullanıcı bu grupta bulunamadı.`,
      };
    }
  }

  // Determine query type and execute appropriate query
  const descLower = query_description.toLowerCase();

  try {
    // Debt calculation queries
    if (descLower.includes('borç') || descLower.includes('debt') || descLower.includes('owe') || descLower.includes('kimin kime')) {
      // Get all group members
      const members = await prisma.groupMember.findMany({
        where: { groupId },
        include: {
          user: { select: { id: true, name: true } },
        },
      });

      // Get total expenses per user
      const expensesPerUser = await prisma.expense.groupBy({
        by: ['userId'],
        where: {
          groupId,
          ...(startDate && { date: { gte: startDate, ...(endDate && { lte: endDate }) } }),
        },
        _sum: { amount: true },
      });

      // Calculate total and fair share
      const totalSpent = expensesPerUser.reduce((sum, e) => sum + Number(e._sum.amount || 0), 0);
      const fairShare = totalSpent / members.length;

      // Calculate balances (positive = owed, negative = owes)
      const balances = members.map(member => {
        const userExpense = expensesPerUser.find(e => e.userId === member.user.id);
        const spent = Number(userExpense?._sum.amount || 0);
        const balance = spent - fairShare;

        return {
          userId: member.user.id,
          userName: member.user.name,
          spent,
          fairShare,
          balance,
        };
      });

      // Adjust balances based on completed payments
      const completedPayments = await prisma.payment.findMany({
        where: {
          groupId,
          status: 'COMPLETED',
          ...(startDate && { createdAt: { gte: startDate, ...(endDate && { lte: endDate }) } }),
        },
      });

      completedPayments.forEach(payment => {
        // Payment sender has paid, so their debt decreases (balance increases)
        const fromUser = balances.find(b => b.userId === payment.fromUserId);
        if (fromUser) {
          fromUser.balance += Number(payment.amount);
        }

        // Payment receiver has been paid, so what they're owed decreases (balance decreases)
        const toUser = balances.find(b => b.userId === payment.toUserId);
        if (toUser) {
          toUser.balance -= Number(payment.amount);
        }
      });

      // Calculate who owes whom
      const creditors = balances.filter(b => b.balance > 0).sort((a, b) => b.balance - a.balance);
      const debtors = balances.filter(b => b.balance < 0).sort((a, b) => a.balance - b.balance);

      const settlements: Array<{ from: string; to: string; amount: number }> = [];

      // Simple debt settlement algorithm
      let i = 0, j = 0;
      while (i < debtors.length && j < creditors.length) {
        const debtor = { ...debtors[i] };
        const creditor = { ...creditors[j] };

        const debtAmount = Math.abs(debtor.balance);
        const creditAmount = creditor.balance;

        const settleAmount = Math.min(debtAmount, creditAmount);

        if (settleAmount > 0.01) { // Ignore tiny amounts
          settlements.push({
            from: debtor.userName,
            to: creditor.userName,
            amount: settleAmount,
          });
        }

        debtors[i].balance += settleAmount;
        creditors[j].balance -= settleAmount;

        if (Math.abs(debtors[i].balance) < 0.01) i++;
        if (Math.abs(creditors[j].balance) < 0.01) j++;
      }

      return {
        type: 'debt_calculation',
        totalSpent,
        fairShare,
        balances,
        settlements,
        filters: { time_period },
      };
    }

    // Group summary queries (all members' spending)
    if (descLower.includes('özet') || descLower.includes('summary') || descLower.includes('kim ne') || descLower.includes('who spent')) {
      const membersWithExpenses = await prisma.groupMember.findMany({
        where: { groupId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      const summaryData = await Promise.all(
        membersWithExpenses.map(async (member) => {
          const userWhereClause = {
            ...whereClause,
            userId: member.user.id,
          };

          const result = await prisma.expense.aggregate({
            where: userWhereClause,
            _sum: { amount: true },
            _count: true,
          });

          return {
            userId: member.user.id,
            userName: member.user.name,
            total: Number(result._sum.amount || 0),
            count: result._count,
          };
        })
      );

      // Sort by total descending
      summaryData.sort((a, b) => b.total - a.total);

      const grandTotal = summaryData.reduce((sum, s) => sum + s.total, 0);

      return {
        type: 'group_summary',
        summary: summaryData,
        grandTotal,
        filters: { time_period, category },
      };
    }
    

    // Total/sum queries
    if (descLower.includes('total') || descLower.includes('sum') || descLower.includes('how much')) {
      const result = await prisma.expense.aggregate({
        where: whereClause,
        _sum: { amount: true },
        _count: true,
      });

      return {
        type: 'aggregate',
        total: result._sum.amount || 0,
        count: result._count,
        filters: { time_period, category },
      };
    }
    
    // Average queries
    if (descLower.includes('average') || descLower.includes('avg')) {
      const result = await prisma.expense.aggregate({
        where: whereClause,
        _avg: { amount: true },
        _count: true,
      });

      return {
        type: 'aggregate',
        average: result._avg.amount || 0,
        count: result._count,
        filters: { time_period, category },
      };
    }
    
    // Group by category
    if (descLower.includes('by category') || descLower.includes('per category') || descLower.includes('each category')) {
      const results = await prisma.expense.groupBy({
        by: ['category'],
        where: whereClause,
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
      });

      return {
        type: 'group_by_category',
        results: results.map(r => ({
          category: r.category,
          total: r._sum.amount || 0,
          count: r._count,
        })),
        filters: { time_period, category },
      };
    }
    
    // Top/highest expenses
    if (descLower.includes('top') || descLower.includes('highest') || descLower.includes('largest') || descLower.includes('biggest')) {
      const limit = parseInt(descLower.match(/top (\d+)/)?.[1] || '10');
      
      const expenses = await prisma.expense.findMany({
        where: whereClause,
        include: {
          user: { select: { name: true, email: true } },
        },
        orderBy: { amount: 'desc' },
        take: limit,
      });

      return {
        type: 'list',
        expenses: expenses.map(e => ({
          id: e.id,
          amount: e.amount,
          description: e.description,
          category: e.category,
          date: e.date,
          user: e.user.name,
        })),
        filters: { time_period, category },
      };
    }
    
    // Recent expenses
    if (descLower.includes('recent') || descLower.includes('latest') || descLower.includes('last')) {
      const limit = parseInt(descLower.match(/(\d+)/)?.[1] || '10');
      
      const expenses = await prisma.expense.findMany({
        where: whereClause,
        include: {
          user: { select: { name: true, email: true } },
        },
        orderBy: { date: 'desc' },
        take: limit,
      });

      return {
        type: 'list',
        expenses: expenses.map(e => ({
          id: e.id,
          amount: e.amount,
          description: e.description,
          category: e.category,
          date: e.date,
          user: e.user.name,
        })),
        filters: { time_period, category },
      };
    }

    // Default: return recent expenses
    const expenses = await prisma.expense.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { date: 'desc' },
      take: 20,
    });

    return {
      type: 'list',
      expenses: expenses.map(e => ({
        id: e.id,
        amount: e.amount,
        description: e.description,
        category: e.category,
        date: e.date,
        user: e.user.name,
      })),
      filters: { time_period, category },
    };

  } catch (error) {
    console.error('Error executing database query:', error);
    throw new Error('Failed to query database');
  }
}

export function setupWebSocket(io: Server) {
  // Authentication middleware for WebSocket
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    if (!JWT_SECRET) {
      throw new Error('JWT secret is not defined in environment variables.');
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
      imageBase64?: string; // Optional image attachment
    }) => {
      try {
        const { message, userId, groupId, userName, imageBase64 } = data;

        // Get or initialize conversation history
        let history = conversationHistory.get(socket.id) || [];
        
        // Save image to disk if provided
        let savedImageUrl: string | undefined;
        if (imageBase64) {
          try {
            savedImageUrl = saveBase64Image(imageBase64, 'invoice');
            console.log(`📸 Image saved: ${savedImageUrl}`);
          } catch (error) {
            console.error('Error saving image:', error);
            // Continue without saved image if save fails
          }
        }
        
        // Add system prompt if first message
        if (history.length === 0) {
          history.unshift({
            role: 'system',
            content: `You are a helpful budget management assistant for Turkish users. Help users track their expenses in Turkish Lira (TL/₺). 

CAPABILITIES:
1. Create expenses when users mention spending money using the create_expense tool
2. Query expense data and provide insights using the query_database tool
3. Analyze invoice/receipt images to extract expense information and create expenses using the create_expense tool

DATABASE SCHEMA:
- User: id, name, email, role, createdAt
- Group: id, name, description, createdAt
- Expense: id, amount (Float), description, category (food/transport/entertainment/shopping/utilities/health/other), date, imageUrl, userId, groupId, createdAt
- GroupMember: userId, groupId, role, joinedAt

QUERY EXAMPLES (Few-shot learning):

Example 1:
User: "Bu ay ne kadar harcadım?" / "How much did I spend this month?"
Tool: query_database
Args: { query_description: "total expenses", time_period: "this month" }
Expected Result: Total amount and count of expenses

Example 2:
User: "Yemek kategorisindeki son 10 harcamayı göster" / "Show me the last 10 food expenses"
Tool: query_database
Args: { query_description: "recent food expenses", category: "food" }
Expected Result: List of recent food expenses with amounts and descriptions

Example 3:
User: "Kategorilere göre harcamalarımı göster" / "Show my spending by category"
Tool: query_database
Args: { query_description: "spending by category" }
Expected Result: Breakdown of total spending per category

Example 4:
User: "Bu hafta en yüksek 5 harcamam neydi?" / "What were my top 5 expenses this week?"
Tool: query_database
Args: { query_description: "top 5 highest expenses", time_period: "this week" }
Expected Result: List of 5 highest expenses this week

Example 5:
User: "Geçen ay ortalama harcamam ne kadar?" / "What was my average expense last month?"
Tool: query_database
Args: { query_description: "average expense", time_period: "last month" }
Expected Result: Average expense amount

Example 6:
User: "Son 30 gündeki ulaşım harcamalarım" / "My transport expenses in the last 30 days"
Tool: query_database
Args: { query_description: "transport expenses", time_period: "last 30 days", category: "transport" }
Expected Result: List of transport expenses

Example 7 (Group Query - Specific User):
User: "Ayfer bu ay ne harcamış?" / "What did Ayfer spend this month?"
Tool: query_database
Args: { query_description: "Ayfer's expenses", time_period: "this month", user_name: "Ayfer" }
Expected Result: Total and list of Ayfer's expenses this month

Example 8 (Group Summary):
User: "Bu ayı özetler misin kim ne harcamış?" / "Can you summarize this month, who spent what?"
Tool: query_database
Args: { query_description: "group summary who spent what", time_period: "this month" }
Expected Result: Summary showing each group member's total spending

Example 9 (Debt Calculation):
User: "Kimin kime borcu var?" / "Who owes whom?"
Tool: query_database
Args: { query_description: "debt calculation who owes whom" }
Expected Result: Debt settlement showing who should pay whom how much

IMPORTANT GUIDELINES:
- Understand both Turkish and English queries. Default to Turkish in responses.
- Accept amounts in formats like "50 TL", "50 lira", "50₺" or just "50"
- When querying, use query_database tool for any question about past expenses, totals, statistics
- When creating, use create_expense tool for new spending mentions
- Support GROUP queries: ask about other members' spending, group summaries, debt calculations
- Use user_name parameter when user asks about specific group member (e.g., "Ayfer", "John")
- For "kim ne harcamış" use group_summary query type
- For "kimin kime borcu var" use debt_calculation query type
- Be conversational and provide insights in a friendly manner
- Format currency as Turkish Lira (₺) in responses
- When showing lists, limit to reasonable numbers (5-20 items)
- Provide context and interpretation with query results

RESPONSE FORMAT:
- Use markdown formatting for tabular data.`
          });
        }

        // Handle image upload with optional text message
        if (imageBase64) {
          // Build user message with image for AI analysis
          const userMessageContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
          
          if (message && message.trim()) {
            userMessageContent.push({
              type: 'text',
              text: message
            });
          } else {
            // If no text provided, ask AI to analyze the invoice
            userMessageContent.push({
              type: 'text',
              text: 'Please analyze this invoice/receipt image and create an expense with the extracted information.'
            });
          }
          
          userMessageContent.push({
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`
            }
          });

          history.push({ 
            role: 'user', 
            content: userMessageContent
          });
        } else {
          // Text-only message
          history.push({ role: 'user', content: message });
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
                  io,
                  savedImageUrl // Pass the saved image URL
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
                      imageUrl: expense.imageUrl,
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
            } else if (functionCall.function?.name === 'query_database') {
              try {
                const args = JSON.parse(functionCall.function.arguments);
                const queryResult = await executeQueryDatabase(
                  args,
                  userId,
                  groupId
                );

                // Add tool result to history
                history.push({
                  role: 'tool',
                  tool_call_id: functionCall.id,
                  name: 'query_database',
                  content: JSON.stringify({
                    success: true,
                    result: queryResult,
                  }),
                });

                // Emit query result to user
                socket.emit('query-result', { result: queryResult });
              } catch (error) {
                console.error('Error executing query_database:', error);
                history.push({
                  role: 'tool',
                  tool_call_id: functionCall.id,
                  name: 'query_database',
                  content: JSON.stringify({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to query database',
                  }),
                });
              }
            }
          }

          // Get final response from AI after tool execution (with streaming)
          const stream = await chatWithAIAndToolsStream(history, tools);
          let finalMessage = '';
          
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
              finalMessage += delta.content;
              // Stream each chunk to the client
              socket.emit('chat-stream', {
                content: delta.content,
                done: false,
              });
            }
          }
          
          // Signal completion
          socket.emit('chat-stream', {
            content: '',
            done: true,
          });
          
          history.push({ role: 'assistant', content: finalMessage });
          conversationHistory.set(socket.id, history);

          socket.emit('chat-response', {
            message: finalMessage,
            timestamp: new Date(),
          });
        } else {
          // No tool call, stream the regular response
          const stream = await chatWithAIAndToolsStream(history, tools);
          let aiResponse = '';
          
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
              aiResponse += delta.content;
              // Stream each chunk to the client
              socket.emit('chat-stream', {
                content: delta.content,
                done: false,
              });
            }
          }
          
          // Signal completion
          socket.emit('chat-stream', {
            content: '',
            done: true,
          });
          
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
