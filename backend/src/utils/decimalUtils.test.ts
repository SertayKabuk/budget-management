import { Decimal } from '@prisma/client/runtime/library';
import { convertDecimalsToNumbers } from './decimalUtils';

describe('convertDecimalsToNumbers', () => {
  test('converts Decimal to number', () => {
    const decimal = new Decimal('123.45');
    const result = convertDecimalsToNumbers(decimal);
    expect(result).toBe(123.45);
    expect(typeof result).toBe('number');
  });

  test('handles null and undefined', () => {
    expect(convertDecimalsToNumbers(null)).toBe(null);
    expect(convertDecimalsToNumbers(undefined)).toBe(undefined);
  });

  test('converts Decimals in objects', () => {
    const input = {
      id: 'test-id',
      amount: new Decimal('50.00'),
      description: 'Test expense',
      count: 5
    };
    const result = convertDecimalsToNumbers(input);
    expect(result.amount).toBe(50.00);
    expect(typeof result.amount).toBe('number');
    expect(result.id).toBe('test-id');
    expect(result.count).toBe(5);
  });

  test('converts Decimals in arrays', () => {
    const input = [
      { amount: new Decimal('10.50') },
      { amount: new Decimal('20.75') },
      { amount: new Decimal('30.25') }
    ];
    const result = convertDecimalsToNumbers(input);
    expect(result[0].amount).toBe(10.50);
    expect(result[1].amount).toBe(20.75);
    expect(result[2].amount).toBe(30.25);
  });

  test('converts nested Decimals', () => {
    const input = {
      user: {
        name: 'Test User',
        expenses: [
          { amount: new Decimal('100.00'), category: 'Food' },
          { amount: new Decimal('200.00'), category: 'Transport' }
        ]
      },
      total: new Decimal('300.00')
    };
    const result = convertDecimalsToNumbers(input);
    expect(result.total).toBe(300.00);
    expect(result.user.expenses[0].amount).toBe(100.00);
    expect(result.user.expenses[1].amount).toBe(200.00);
  });

  test('handles primitives', () => {
    expect(convertDecimalsToNumbers('string')).toBe('string');
    expect(convertDecimalsToNumbers(42)).toBe(42);
    expect(convertDecimalsToNumbers(true)).toBe(true);
    expect(convertDecimalsToNumbers(false)).toBe(false);
  });

  test('simulates expense calculation scenario', () => {
    // Simulate the issue: expenses with Decimal amounts being reduced
    const expenses = [
      { id: '1', amount: new Decimal('50.50'), description: 'Lunch' },
      { id: '2', amount: new Decimal('100.25'), description: 'Groceries' },
      { id: '3', amount: new Decimal('25.75'), description: 'Coffee' }
    ];

    const converted = convertDecimalsToNumbers(expenses);
    
    // Now we can safely reduce with numbers
    const total = converted.reduce((sum: number, exp: any) => sum + exp.amount, 0);
    
    expect(total).toBe(176.50);
    expect(typeof total).toBe('number');
  });
});
