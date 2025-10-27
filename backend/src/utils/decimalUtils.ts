import { Decimal } from '@prisma/client/runtime/library';

/**
 * Recursively converts Prisma Decimal objects to JavaScript numbers in a data structure.
 * This is necessary because Prisma Decimal types are not automatically serialized to numbers
 * when sent via JSON responses, causing issues in frontend calculations.
 * 
 * @param obj - The object to process (can be an object, array, or primitive)
 * @returns The same structure with all Decimal values converted to numbers
 */
export function convertDecimalsToNumbers<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle Decimal instances
  if (obj instanceof Decimal) {
    return obj.toNumber() as T;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => convertDecimalsToNumbers(item)) as T;
  }

  // Handle objects
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = convertDecimalsToNumbers((obj as any)[key]);
      }
    }
    return result as T;
  }

  // Return primitives as-is
  return obj;
}
