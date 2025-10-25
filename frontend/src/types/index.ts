export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  members?: any[];
  expenses?: any[];
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  category?: string;
  date: string;
  imageUrl?: string;
  user: User;
  group: Group;
}
