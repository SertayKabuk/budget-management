import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { expenseApi, groupApi, paymentApi, reminderApi } from '../services/api';
import type { Expense, Group, Payment, RecurringReminder, GroupMember } from '../types';
import * as XLSX from 'xlsx';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { formatCurrency } from '../utils/currency';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];

interface FilterState {
  startDate: string;
  endDate: string;
  category: string;
  memberId: string;
  minAmount: string;
  maxAmount: string;
  searchText: string;
  quickFilter: string;
}

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reminders, setReminders] = useState<RecurringReminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    startDate: '',
    endDate: '',
    category: '',
    memberId: '',
    minAmount: '',
    maxAmount: '',
    searchText: '',
    quickFilter: 'allTime',
  });

  // Load groups on mount
  useEffect(() => {
    loadGroups();
  }, []);

  // Load expenses when group changes
  useEffect(() => {
    if (selectedGroupId && groups.length > 0) {
      loadExpenses();
      loadGroupMembers();
      loadPayments();
      loadReminders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroupId, groups.length]);

  // Apply quick filter when it changes
  useEffect(() => {
    applyQuickFilter(filters.quickFilter);
  }, [filters.quickFilter]);

  const loadGroups = async () => {
    try {
      // groupApi.getAll() automatically filters to only return groups where the authenticated user is a member
      const response = await groupApi.getAll();
      setGroups(response.data);
      if (response.data.length > 0) {
        setSelectedGroupId(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  };

  const loadExpenses = async () => {
    if (!selectedGroupId || !user) return;
    
    setLoading(true);
    try {
      const response = await expenseApi.getAll(selectedGroupId);
      console.log('Loaded expenses:', response.data.length, 'expenses for group', selectedGroupId);
      setExpenses(response.data);
    } catch (error) {
      console.error('Failed to load expenses:', error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupMembers = async () => {
    if (!selectedGroupId) return;
    
    try {
      const response = await groupApi.getMembers(selectedGroupId);
      setGroupMembers(response.data);
    } catch (error) {
      console.error('Failed to load group members:', error);
      setGroupMembers([]);
    }
  };

  const loadPayments = async () => {
    if (!selectedGroupId) return;
    
    try {
      const response = await paymentApi.getAll(selectedGroupId);
      setPayments(response.data);
    } catch (error) {
      console.error('Failed to load payments:', error);
      setPayments([]);
    }
  };

  const loadReminders = async () => {
    if (!selectedGroupId) return;
    
    try {
      const response = await reminderApi.getAll(selectedGroupId);
      setReminders(response.data);
    } catch (error) {
      console.error('Failed to load reminders:', error);
      setReminders([]);
    }
  };

  const applyQuickFilter = (filterType: string) => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (filterType) {
      case 'allTime':
        // Clear date filters to show all expenses
        setFilters(prev => ({
          ...prev,
          startDate: '',
          endDate: '',
        }));
        return;
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'thisWeek':
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'last3Months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case 'last6Months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'customRange':
        return; // Don't set dates for custom range
      default:
        return;
    }

    setFilters(prev => ({
      ...prev,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    }));
  };

  // Filter expenses based on current filters
  const filteredExpenses = useMemo(() => {
    const filtered = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const amount = expense.amount;

      // Date range filter
      if (filters.startDate && expenseDate < new Date(filters.startDate)) return false;
      if (filters.endDate && expenseDate > new Date(filters.endDate + 'T23:59:59')) return false;

      // Category filter
      if (filters.category && expense.category !== filters.category) return false;

      // Member filter
      if (filters.memberId && expense.user.id !== filters.memberId) return false;

      // Amount range filter
      if (filters.minAmount && amount < parseFloat(filters.minAmount)) return false;
      if (filters.maxAmount && amount > parseFloat(filters.maxAmount)) return false;

      // Search text filter
      if (filters.searchText && !expense.description.toLowerCase().includes(filters.searchText.toLowerCase())) {
        return false;
      }

      return true;
    });
    
    console.log('Filtering:', expenses.length, 'total expenses →', filtered.length, 'filtered expenses');
    console.log('Current filters:', {
      startDate: filters.startDate,
      endDate: filters.endDate,
      quickFilter: filters.quickFilter
    });
    
    return filtered;
  }, [expenses, filters]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const total = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const average = filteredExpenses.length > 0 ? total / filteredExpenses.length : 0;
    
    // Find top category
    const categoryTotals = filteredExpenses.reduce((acc, exp) => {
      const cat = exp.category || t.spending.uncategorized;
      acc[cat] = (acc[cat] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);
    
    const topCategory = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || '-';

    return {
      total,
      average,
      count: filteredExpenses.length,
      topCategory,
    };
  }, [filteredExpenses, t]);

  // Prepare data for charts
  const chartData = useMemo(() => {
    // Spending trend (by day)
    const dailyTotals = filteredExpenses.reduce((acc, exp) => {
      const date = new Date(exp.date).toLocaleDateString('tr-TR');
      acc[date] = (acc[date] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

    const trendData = Object.entries(dailyTotals)
      .sort((a, b) => new Date(a[0].split('.').reverse().join('-')).getTime() - 
                      new Date(b[0].split('.').reverse().join('-')).getTime())
      .map(([date, amount]) => ({ date, amount }));

    // Category distribution
    const categoryData = Object.entries(
      filteredExpenses.reduce((acc, exp) => {
        const cat = exp.category || t.spending.uncategorized;
        acc[cat] = (acc[cat] || 0) + exp.amount;
        return acc;
      }, {} as Record<string, number>)
    )
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Member spending
    const memberData = Object.entries(
      filteredExpenses.reduce((acc, exp) => {
        const name = exp.user.name;
        acc[name] = (acc[name] || 0) + exp.amount;
        return acc;
      }, {} as Record<string, number>)
    )
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    return {
      trendData,
      categoryData,
      memberData,
    };
  }, [filteredExpenses, t]);

  // Monthly breakdown analysis
  const monthlyBreakdown = useMemo(() => {
    const monthsMap = new Map<string, {
      monthKey: string;
      monthLabel: string;
      total: number;
      count: number;
      avgPerExpense: number;
      categories: Record<string, number>;
      members: Record<string, { name: string; total: number; count: number }>;
    }>();

    filteredExpenses.forEach((expense) => {
      const date = new Date(expense.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });

      if (!monthsMap.has(monthKey)) {
        monthsMap.set(monthKey, {
          monthKey,
          monthLabel,
          total: 0,
          count: 0,
          avgPerExpense: 0,
          categories: {},
          members: {}
        });
      }

      const monthData = monthsMap.get(monthKey)!;
      monthData.total += expense.amount;
      monthData.count += 1;
      
      const category = expense.category || t.spending.uncategorized;
      monthData.categories[category] = (monthData.categories[category] || 0) + expense.amount;

      if (!monthData.members[expense.user.id]) {
        monthData.members[expense.user.id] = { name: expense.user.name, total: 0, count: 0 };
      }
      monthData.members[expense.user.id].total += expense.amount;
      monthData.members[expense.user.id].count += 1;
    });

    // Calculate averages
    monthsMap.forEach((month) => {
      month.avgPerExpense = month.count > 0 ? month.total / month.count : 0;
    });

    return Array.from(monthsMap.values())
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [filteredExpenses, t]);

  // Debt settlement calculation
  const debtSettlements = useMemo(() => {
    if (filteredExpenses.length === 0 || groupMembers.length === 0) return [];

    // Get all group members and their spending
    const usersMap = new Map<string, { name: string; spent: number }>();
    
    // Initialize all group members with 0 spending
    groupMembers.forEach((member: GroupMember) => {
      if (member.user) {
        usersMap.set(member.user.id, { name: member.user.name, spent: 0 });
      }
    });

    // Add actual expenses to the map
    filteredExpenses.forEach((expense) => {
      if (usersMap.has(expense.user.id)) {
        usersMap.get(expense.user.id)!.spent += expense.amount;
      }
    });

    const users = Array.from(usersMap.entries()).map(([id, data]) => ({
      userId: id,
      userName: data.name,
      spent: data.spent
    }));

    if (users.length === 0) return [];

    // Calculate fair share based on ALL group members
    const totalSpent = users.reduce((sum, u) => sum + u.spent, 0);
    const fairShare = totalSpent / users.length;

    const balances = users.map(u => ({
      userId: u.userId,
      userName: u.userName,
      balance: u.spent - fairShare,
      fairShare: fairShare
    }));

    // Adjust balances based on completed payments
    if (payments && payments.length > 0) {
      payments.forEach((payment: Payment) => {
        if (payment.status === 'COMPLETED') {
          // Payment sender has paid, so their debt decreases (balance increases)
          const fromUser = balances.find(b => b.userId === payment.fromUserId);
          if (fromUser) {
            fromUser.balance += payment.amount;
          }
          
          // Payment receiver has been paid, so what they're owed decreases (balance decreases)
          const toUser = balances.find(b => b.userId === payment.toUserId);
          if (toUser) {
            toUser.balance -= payment.amount;
          }
        }
      });
    }

    const creditors = balances.filter(b => b.balance > 0.01).sort((a, b) => b.balance - a.balance);
    const debtors = balances.filter(b => b.balance < -0.01).sort((a, b) => a.balance - b.balance);

    const settlements: { from: string; to: string; amount: number }[] = [];
    const creditorsCopy = creditors.map(c => ({ ...c }));
    const debtorsCopy = debtors.map(d => ({ ...d }));

    while (creditorsCopy.length > 0 && debtorsCopy.length > 0) {
      const creditor = creditorsCopy[0];
      const debtor = debtorsCopy[0];
      
      const amount = Math.min(creditor.balance, Math.abs(debtor.balance));
      
      if (amount > 0.01) {
        settlements.push({
          from: debtor.userName,
          to: creditor.userName,
          amount: amount
        });
      }

      creditor.balance -= amount;
      debtor.balance += amount;

      if (Math.abs(creditor.balance) < 0.01) creditorsCopy.shift();
      if (Math.abs(debtor.balance) < 0.01) debtorsCopy.shift();
    }

    return { settlements, balances, fairShare };
  }, [filteredExpenses, groupMembers, payments]);

  // Day of week analysis
  const dayOfWeekData = useMemo(() => {
    const days = [
      t.analytics.dayOfWeek.days.sunday,
      t.analytics.dayOfWeek.days.monday,
      t.analytics.dayOfWeek.days.tuesday,
      t.analytics.dayOfWeek.days.wednesday,
      t.analytics.dayOfWeek.days.thursday,
      t.analytics.dayOfWeek.days.friday,
      t.analytics.dayOfWeek.days.saturday
    ];
    const dayTotals: Record<string, { total: number; count: number }> = {};

    days.forEach(day => {
      dayTotals[day] = { total: 0, count: 0 };
    });

    filteredExpenses.forEach(expense => {
      const dayIndex = new Date(expense.date).getDay();
      const dayName = days[dayIndex];
      dayTotals[dayName].total += expense.amount;
      dayTotals[dayName].count += 1;
    });

    return days.map(day => ({
      day,
      total: dayTotals[day].total,
      count: dayTotals[day].count,
      average: dayTotals[day].count > 0 ? dayTotals[day].total / dayTotals[day].count : 0
    }));
  }, [filteredExpenses, t]);

  // Top expenses
  const topExpenses = useMemo(() => {
    return [...filteredExpenses]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [filteredExpenses]);

  // Payment Analytics
  const paymentAnalytics = useMemo(() => {
    if (!payments || payments.length === 0) {
      return {
        total: 0,
        count: 0,
        completed: 0,
        pending: 0,
        cancelled: 0,
        average: 0,
        statusData: [],
        timelineData: [],
        topPayers: [],
        topReceivers: [],
      };
    }

    // Filter payments by date range if applicable
    const filteredPayments = payments.filter(payment => {
      const paymentDate = new Date(payment.createdAt);
      if (filters.startDate && paymentDate < new Date(filters.startDate)) return false;
      if (filters.endDate && paymentDate > new Date(filters.endDate + 'T23:59:59')) return false;
      return true;
    });

    const total = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const count = filteredPayments.length;
    const completed = filteredPayments.filter(p => p.status === 'COMPLETED').length;
    const pending = filteredPayments.filter(p => p.status === 'PENDING').length;
    const cancelled = filteredPayments.filter(p => p.status === 'CANCELLED').length;
    const average = count > 0 ? total / count : 0;

    // Status distribution
    const statusData = [
      { name: t.analytics.paymentAnalytics.paymentStatus.COMPLETED, value: completed, status: 'COMPLETED' },
      { name: t.analytics.paymentAnalytics.paymentStatus.PENDING, value: pending, status: 'PENDING' },
      { name: t.analytics.paymentAnalytics.paymentStatus.CANCELLED, value: cancelled, status: 'CANCELLED' },
    ].filter(s => s.value > 0);

    // Payment timeline
    const dailyPayments = filteredPayments.reduce((acc, payment) => {
      const date = new Date(payment.createdAt).toLocaleDateString('tr-TR');
      if (!acc[date]) {
        acc[date] = { date, amount: 0, count: 0 };
      }
      acc[date].amount += payment.amount;
      acc[date].count += 1;
      return acc;
    }, {} as Record<string, { date: string; amount: number; count: number }>);

    const timelineData = Object.values(dailyPayments)
      .sort((a, b) => new Date(a.date.split('.').reverse().join('-')).getTime() - 
                      new Date(b.date.split('.').reverse().join('-')).getTime());

    // Top payers and receivers
    const payerTotals = filteredPayments.reduce((acc, payment) => {
      if (payment.fromUser) {
        const name = payment.fromUser.name;
        acc[name] = (acc[name] || 0) + payment.amount;
      }
      return acc;
    }, {} as Record<string, number>);

    const receiverTotals = filteredPayments.reduce((acc, payment) => {
      if (payment.toUser) {
        const name = payment.toUser.name;
        acc[name] = (acc[name] || 0) + payment.amount;
      }
      return acc;
    }, {} as Record<string, number>);

    const topPayers = Object.entries(payerTotals)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const topReceivers = Object.entries(receiverTotals)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      total,
      count,
      completed,
      pending,
      cancelled,
      average,
      statusData,
      timelineData,
      topPayers,
      topReceivers,
    };
  }, [payments, filters.startDate, filters.endDate, t]);

  // Reminder Analytics
  const reminderAnalytics = useMemo(() => {
    if (!reminders || reminders.length === 0) {
      return {
        activeCount: 0,
        overdueCount: 0,
        totalProjected30Days: 0,
        totalProjected60Days: 0,
        totalProjected90Days: 0,
        frequencyData: [],
        upcomingReminders: [],
      };
    }

    const now = new Date();
    const active = reminders.filter(r => r.isActive);
    const activeCount = active.length;
    
    const overdueCount = active.filter(r => new Date(r.nextDueDate) < now).length;

    // Calculate projected spending for next 30, 60, 90 days
    const calculate30DayProjection = () => {
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 30);
      let total = 0;

      active.forEach(reminder => {
        const nextDue = new Date(reminder.nextDueDate);
        while (nextDue <= endDate) {
          total += reminder.amount;
          // Calculate next occurrence based on frequency
          switch (reminder.frequency) {
            case 'WEEKLY':
              nextDue.setDate(nextDue.getDate() + 7);
              break;
            case 'MONTHLY':
              nextDue.setMonth(nextDue.getMonth() + 1);
              break;
            case 'EVERY_6_MONTHS':
              nextDue.setMonth(nextDue.getMonth() + 6);
              break;
            case 'YEARLY':
              nextDue.setFullYear(nextDue.getFullYear() + 1);
              break;
          }
        }
      });
      return total;
    };

    const calculate60DayProjection = () => {
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 60);
      let total = 0;

      active.forEach(reminder => {
        const nextDue = new Date(reminder.nextDueDate);
        while (nextDue <= endDate) {
          total += reminder.amount;
          switch (reminder.frequency) {
            case 'WEEKLY':
              nextDue.setDate(nextDue.getDate() + 7);
              break;
            case 'MONTHLY':
              nextDue.setMonth(nextDue.getMonth() + 1);
              break;
            case 'EVERY_6_MONTHS':
              nextDue.setMonth(nextDue.getMonth() + 6);
              break;
            case 'YEARLY':
              nextDue.setFullYear(nextDue.getFullYear() + 1);
              break;
          }
        }
      });
      return total;
    };

    const calculate90DayProjection = () => {
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 90);
      let total = 0;

      active.forEach(reminder => {
        const nextDue = new Date(reminder.nextDueDate);
        while (nextDue <= endDate) {
          total += reminder.amount;
          switch (reminder.frequency) {
            case 'WEEKLY':
              nextDue.setDate(nextDue.getDate() + 7);
              break;
            case 'MONTHLY':
              nextDue.setMonth(nextDue.getMonth() + 1);
              break;
            case 'EVERY_6_MONTHS':
              nextDue.setMonth(nextDue.getMonth() + 6);
              break;
            case 'YEARLY':
              nextDue.setFullYear(nextDue.getFullYear() + 1);
              break;
          }
        }
      });
      return total;
    };

    const totalProjected30Days = calculate30DayProjection();
    const totalProjected60Days = calculate60DayProjection();
    const totalProjected90Days = calculate90DayProjection();

    // Frequency distribution
    const frequencyCounts = active.reduce((acc, r) => {
      const freq = r.frequency;
      acc[freq] = (acc[freq] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const frequencyData = Object.entries(frequencyCounts).map(([frequency, count]) => ({
      name: t.reminders.frequency[frequency as keyof typeof t.reminders.frequency] || frequency,
      value: count,
    }));

    // Upcoming reminders (next 30 days)
    const upcomingReminders = active
      .map(r => {
        const nextDue = new Date(r.nextDueDate);
        const daysUntil = Math.ceil((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return { ...r, daysUntil };
      })
      .filter(r => r.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    return {
      activeCount,
      overdueCount,
      totalProjected30Days,
      totalProjected60Days,
      totalProjected90Days,
      frequencyData,
      upcomingReminders,
    };
  }, [reminders, t]);

  // Get unique categories and members for filters
  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(expenses.map(e => e.category || t.spending.uncategorized)));
  }, [expenses, t]);

  const uniqueMembers = useMemo(() => {
    return Array.from(new Set(expenses.map(e => e.user)))
      .filter((user, index, self) => self.findIndex(u => u.id === user.id) === index);
  }, [expenses]);

  // Export to Excel
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      // Create workbook
      const wb = XLSX.utils.book_new();

      // === EXPENSES SHEET ===
      const exportData = filteredExpenses.map(expense => ({
        [t.analytics.export.headers.date]: new Date(expense.date).toLocaleDateString('tr-TR'),
        [t.analytics.export.headers.description]: expense.description,
        [t.analytics.export.headers.category]: expense.category || t.spending.uncategorized,
        [t.analytics.export.headers.member]: expense.user.name,
        [t.analytics.export.headers.amount]: expense.amount,
      }));

      // Add summary row for expenses
      exportData.push({
        [t.analytics.export.headers.date]: '',
        [t.analytics.export.headers.description]: '',
        [t.analytics.export.headers.category]: '',
        [t.analytics.export.headers.member]: t.analytics.export.headers.total,
        [t.analytics.export.headers.amount]: summaryStats.total,
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, t.analytics.export.summarySheet.expenseSheet);

      // === PAYMENTS SHEET ===
      if (payments && payments.length > 0) {
        const paymentExportData = payments.map(payment => ({
          [t.analytics.export.headers.date]: new Date(payment.createdAt).toLocaleDateString('tr-TR'),
          [t.analytics.export.headers.from]: payment.fromUser?.name || 'N/A',
          [t.analytics.export.headers.to]: payment.toUser?.name || 'N/A',
          [t.analytics.export.headers.amount]: payment.amount,
          [t.analytics.export.headers.status]: t.analytics.paymentAnalytics.paymentStatus[payment.status] || payment.status,
          [t.analytics.export.headers.description]: payment.description || '',
          [t.analytics.export.headers.completedAt]: payment.completedAt 
            ? new Date(payment.completedAt).toLocaleDateString('tr-TR') 
            : '',
        }));

        // Add payment summary
        paymentExportData.push({
          [t.analytics.export.headers.date]: '',
          [t.analytics.export.headers.from]: '',
          [t.analytics.export.headers.to]: '',
          [t.analytics.export.headers.amount]: paymentAnalytics.total,
          [t.analytics.export.headers.status]: t.analytics.export.headers.total,
          [t.analytics.export.headers.description]: '',
          [t.analytics.export.headers.completedAt]: '',
        });

        const ws2 = XLSX.utils.json_to_sheet(paymentExportData);
        XLSX.utils.book_append_sheet(wb, ws2, t.analytics.export.summarySheet.paymentSheet);
      }

      // === REMINDERS SHEET ===
      if (reminders && reminders.length > 0) {
        const reminderExportData = reminders.map(reminder => ({
          [t.analytics.export.headers.title]: reminder.title,
          [t.analytics.export.headers.description]: reminder.description || '',
          [t.analytics.export.headers.amount]: reminder.amount,
          [t.analytics.export.headers.frequency]: t.reminders.frequency[reminder.frequency] || reminder.frequency,
          [t.analytics.export.headers.nextDue]: new Date(reminder.nextDueDate).toLocaleDateString('tr-TR'),
          [t.analytics.export.headers.isActive]: reminder.isActive ? t.analytics.reminderAnalytics.active : t.analytics.reminderAnalytics.inactive,
        }));

        const ws3 = XLSX.utils.json_to_sheet(reminderExportData);
        XLSX.utils.book_append_sheet(wb, ws3, t.analytics.export.summarySheet.reminderSheet);
      }

      // === SUMMARY SHEET ===
      const summaryData = [
        { [t.analytics.export.summarySheet.metric]: t.analytics.export.summarySheet.totalSpending, [t.analytics.export.summarySheet.value]: formatCurrency(summaryStats.total) },
        { [t.analytics.export.summarySheet.metric]: t.analytics.export.summarySheet.averageSpending, [t.analytics.export.summarySheet.value]: formatCurrency(summaryStats.average) },
        { [t.analytics.export.summarySheet.metric]: t.analytics.export.summarySheet.totalTransactions, [t.analytics.export.summarySheet.value]: summaryStats.count },
        { [t.analytics.export.summarySheet.metric]: t.analytics.export.summarySheet.topCategory, [t.analytics.export.summarySheet.value]: summaryStats.topCategory },
        { [t.analytics.export.summarySheet.metric]: '', [t.analytics.export.summarySheet.value]: '' },
        { [t.analytics.export.summarySheet.metric]: t.analytics.export.summarySheet.totalPayments, [t.analytics.export.summarySheet.value]: formatCurrency(paymentAnalytics.total) },
        { [t.analytics.export.summarySheet.metric]: t.analytics.export.summarySheet.paymentCount, [t.analytics.export.summarySheet.value]: paymentAnalytics.count },
        { [t.analytics.export.summarySheet.metric]: t.analytics.export.summarySheet.completedPayments, [t.analytics.export.summarySheet.value]: paymentAnalytics.completed },
        { [t.analytics.export.summarySheet.metric]: t.analytics.export.summarySheet.pendingPayments, [t.analytics.export.summarySheet.value]: paymentAnalytics.pending },
        { [t.analytics.export.summarySheet.metric]: '', [t.analytics.export.summarySheet.value]: '' },
        { [t.analytics.export.summarySheet.metric]: t.analytics.export.summarySheet.activeReminders, [t.analytics.export.summarySheet.value]: reminderAnalytics.activeCount },
        { [t.analytics.export.summarySheet.metric]: t.analytics.export.summarySheet.totalProjected, [t.analytics.export.summarySheet.value]: formatCurrency(reminderAnalytics.totalProjected30Days) },
      ];

      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, t.analytics.export.summarySheet.name);

      // Generate filename with date
      const filename = `${t.analytics.export.filename}-${new Date().toISOString().split('T')[0]}.xlsx`;

      // Download
      XLSX.writeFile(wb, filename);
      
      alert(t.analytics.export.success);
    } catch (error) {
      console.error('Export failed:', error);
      alert(t.analytics.export.error);
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      category: '',
      memberId: '',
      minAmount: '',
      maxAmount: '',
      searchText: '',
      quickFilter: 'thisMonth',
    });
  };

  if (groups.length === 0) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-700">{t.analytics.noGroups}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <a
          href="/"
          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium mb-2 inline-block"
        >
          {t.analytics.backToHome}
        </a>
        <h1 className="text-3xl font-bold text-gray-900">{t.analytics.title}</h1>
        <p className="mt-1 text-sm text-gray-600">{t.analytics.subtitle}</p>
      </div>

      {/* Group Selection */}
      <div className="mb-6 bg-white rounded-lg shadow-md p-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="text-lg">👥</span>
          {t.analytics.selectGroup}
        </label>
        <select
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
          className="block w-full md:w-96 px-4 py-3 text-base rounded-lg border-2 border-gray-300 bg-white shadow-sm 
                     hover:border-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 
                     transition-colors duration-200 cursor-pointer appearance-none bg-no-repeat bg-right pr-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236366f1'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
            backgroundSize: '1.5rem',
            backgroundPosition: 'right 0.75rem center'
          }}
        >
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-gray-500">
          {t.analytics.groupsAvailable.replace('{count}', groups.length.toString())}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">{t.analytics.loading}</p>
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-600 text-lg mb-2">{t.analytics.noExpenses}</p>
          <p className="text-gray-500 text-sm">{t.analytics.noExpensesInGroup}</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">{t.analytics.summary.totalSpending}</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(summaryStats.total)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">{t.analytics.summary.averageExpense}</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(summaryStats.average)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">{t.analytics.summary.totalTransactions}</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{summaryStats.count}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">{t.analytics.summary.topCategory}</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{summaryStats.topCategory}</p>
            </div>
          </div>

          {/* Filters Section */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.analytics.filters.title}</h3>
            
            {/* Quick Filters */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.analytics.filters.quickFilters}
              </label>
              <div className="flex flex-wrap gap-2">
                {['allTime', 'today', 'thisWeek', 'thisMonth', 'lastMonth', 'last3Months', 'last6Months', 'thisYear', 'customRange'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setFilters(prev => ({ ...prev, quickFilter: filter }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filters.quickFilter === filter
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {t.analytics.filters[filter as keyof typeof t.analytics.filters]}
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.analytics.filters.startDate}
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value, quickFilter: 'customRange' }))}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.analytics.filters.endDate}
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value, quickFilter: 'customRange' }))}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.analytics.filters.category}
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">{t.analytics.filters.allCategories}</option>
                  {uniqueCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.analytics.filters.member}
                </label>
                <select
                  value={filters.memberId}
                  onChange={(e) => setFilters(prev => ({ ...prev, memberId: e.target.value }))}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">{t.analytics.filters.allMembers}</option>
                  {uniqueMembers.map((member) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.analytics.filters.minAmount}
                </label>
                <input
                  type="number"
                  value={filters.minAmount}
                  onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                  placeholder="0"
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.analytics.filters.maxAmount}
                </label>
                <input
                  type="number"
                  value={filters.maxAmount}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                  placeholder="999999"
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.analytics.filters.search}
                </label>
                <input
                  type="text"
                  value={filters.searchText}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchText: e.target.value }))}
                  placeholder={t.analytics.filters.searchPlaceholder}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {t.analytics.filters.clearFilters}
              </button>
              <button
                onClick={handleExportExcel}
                disabled={exporting || filteredExpenses.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {exporting ? t.analytics.export.exporting : t.analytics.export.excel}
              </button>
            </div>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-600 text-lg mb-2">{t.analytics.noData}</p>
              <p className="text-gray-500 text-sm mb-4">
                {expenses.length} {t.analytics.noMatchingExpenses}
              </p>
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {t.analytics.filters.clearFilters}
              </button>
            </div>
          ) : (
            <>
              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Spending Trend */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {t.analytics.charts.spendingTrend}
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData.trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#6366f1"
                        strokeWidth={2}
                        name={t.analytics.charts.amount}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Category Distribution */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {t.analytics.charts.categoryDistribution}
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData.categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry: Record<string, unknown>) => 
                          `${entry.name}: ${((entry.percent as number) * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.categoryData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Member Spending */}
                <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {t.analytics.charts.memberSpending}
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData.memberData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Bar dataKey="amount" fill="#6366f1" name={t.analytics.charts.amount} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Payment Analytics Section */}
              {payments && payments.length > 0 && (
                <>
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg shadow p-6 mb-6 border-l-4 border-green-500">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <span>💰</span> {t.analytics.paymentAnalytics.title}
                    </h2>
                    
                    {/* Payment Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-600">{t.analytics.paymentAnalytics.totalPayments}</p>
                        <p className="text-xl font-bold text-green-600 mt-2">
                          {formatCurrency(paymentAnalytics.total)}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-600">{t.analytics.paymentAnalytics.paymentCount}</p>
                        <p className="text-xl font-bold text-gray-900 mt-2">{paymentAnalytics.count}</p>
                      </div>
                      <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-600">{t.analytics.paymentAnalytics.completedPayments}</p>
                        <p className="text-xl font-bold text-green-600 mt-2">{paymentAnalytics.completed}</p>
                      </div>
                      <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-600">{t.analytics.paymentAnalytics.pendingPayments}</p>
                        <p className="text-xl font-bold text-orange-600 mt-2">{paymentAnalytics.pending}</p>
                      </div>
                    </div>

                    {/* Payment Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Payment Status Distribution */}
                      {paymentAnalytics.statusData.length > 0 && (
                        <div className="bg-white rounded-lg shadow p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            {t.analytics.paymentAnalytics.statusDistribution}
                          </h3>
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                              <Pie
                                data={paymentAnalytics.statusData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(entry: Record<string, unknown>) => 
                                  `${entry.name}: ${entry.value}`
                                }
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {paymentAnalytics.statusData.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.status === 'COMPLETED' ? '#10b981' : entry.status === 'PENDING' ? '#f59e0b' : '#ef4444'} 
                                  />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Payment Timeline */}
                      {paymentAnalytics.timelineData.length > 0 && (
                        <div className="bg-white rounded-lg shadow p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            {t.analytics.paymentAnalytics.paymentTimeline}
                          </h3>
                          <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={paymentAnalytics.timelineData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis />
                              <Tooltip 
                                formatter={(value: number | string, name: string) => [
                                  name === 'amount' ? formatCurrency(Number(value)) : value,
                                  name === 'amount' ? t.analytics.charts.amount : name
                                ]} 
                              />
                              <Legend />
                              <Area 
                                type="monotone" 
                                dataKey="amount" 
                                stroke="#10b981" 
                                fill="#10b981" 
                                fillOpacity={0.3}
                                name={t.analytics.charts.amount}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Top Payers */}
                      {paymentAnalytics.topPayers.length > 0 && (
                        <div className="bg-white rounded-lg shadow p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            {t.analytics.paymentAnalytics.topPayers}
                          </h3>
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={paymentAnalytics.topPayers} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" />
                              <YAxis dataKey="name" type="category" width={100} />
                              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                              <Bar dataKey="amount" fill="#10b981" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Top Receivers */}
                      {paymentAnalytics.topReceivers.length > 0 && (
                        <div className="bg-white rounded-lg shadow p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            {t.analytics.paymentAnalytics.topReceivers}
                          </h3>
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={paymentAnalytics.topReceivers} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" />
                              <YAxis dataKey="name" type="category" width={100} />
                              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                              <Bar dataKey="amount" fill="#3b82f6" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Reminder Analytics Section */}
              {reminders && reminders.length > 0 && (
                <>
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg shadow p-6 mb-6 border-l-4 border-purple-500">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <span>🔔</span> {t.analytics.reminderAnalytics.title}
                    </h2>
                    
                    {/* Reminder Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-600">{t.analytics.reminderAnalytics.activeReminders}</p>
                        <p className="text-xl font-bold text-purple-600 mt-2">{reminderAnalytics.activeCount}</p>
                      </div>
                      <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-600">{t.analytics.reminderAnalytics.next30Days}</p>
                        <p className="text-xl font-bold text-indigo-600 mt-2">
                          {formatCurrency(reminderAnalytics.totalProjected30Days)}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-600">{t.analytics.reminderAnalytics.next60Days}</p>
                        <p className="text-xl font-bold text-indigo-600 mt-2">
                          {formatCurrency(reminderAnalytics.totalProjected60Days)}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-600">{t.analytics.reminderAnalytics.next90Days}</p>
                        <p className="text-xl font-bold text-indigo-600 mt-2">
                          {formatCurrency(reminderAnalytics.totalProjected90Days)}
                        </p>
                      </div>
                    </div>

                    {/* Reminder Charts and Lists */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Frequency Distribution */}
                      {reminderAnalytics.frequencyData.length > 0 && (
                        <div className="bg-white rounded-lg shadow p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            {t.analytics.reminderAnalytics.remindersByFrequency}
                          </h3>
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                              <Pie
                                data={reminderAnalytics.frequencyData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(entry: Record<string, unknown>) => 
                                  `${entry.name}: ${entry.value}`
                                }
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {reminderAnalytics.frequencyData.map((_entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Upcoming Reminders List */}
                      {reminderAnalytics.upcomingReminders.length > 0 && (
                        <div className="bg-white rounded-lg shadow p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            {t.analytics.reminderAnalytics.upcomingExpenses}
                          </h3>
                          <div className="space-y-2 max-h-[250px] overflow-y-auto">
                            {reminderAnalytics.upcomingReminders.slice(0, 10).map((reminder) => (
                              <div 
                                key={reminder.id} 
                                className={`flex items-center justify-between p-3 rounded-lg ${
                                  reminder.daysUntil < 0 ? 'bg-red-50 border border-red-200' :
                                  reminder.daysUntil === 0 ? 'bg-orange-50 border border-orange-200' :
                                  reminder.daysUntil <= 7 ? 'bg-yellow-50 border border-yellow-200' :
                                  'bg-gray-50 border border-gray-200'
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900 truncate">
                                    {reminder.title}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(reminder.nextDueDate).toLocaleDateString('tr-TR')} • {' '}
                                    {reminder.daysUntil < 0 
                                      ? `${Math.abs(reminder.daysUntil)} ${t.analytics.reminderAnalytics.overdue}` 
                                      : reminder.daysUntil === 0 
                                      ? t.reminders.dueToday 
                                      : `${reminder.daysUntil} ${t.analytics.reminderAnalytics.daysUntilDue}`}
                                  </div>
                                </div>
                                <div className="text-sm font-bold text-gray-900 ml-2">
                                  {formatCurrency(reminder.amount)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Monthly Breakdown Section */}
              {monthlyBreakdown.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span>📅</span> {t.analytics.monthlyAnalysis.title}
                  </h3>
                  <div className="space-y-4">
                    {monthlyBreakdown.map((month) => (
                      <details key={month.monthKey} className="border rounded-lg overflow-hidden">
                        <summary className="bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3 cursor-pointer hover:from-indigo-100 hover:to-purple-100 transition-colors">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-semibold text-gray-900">{month.monthLabel}</span>
                              <span className="text-sm text-gray-600 ml-3">
                                {month.count} {t.analytics.monthlyAnalysis.expenseCount} • {t.analytics.monthlyAnalysis.average}: {formatCurrency(month.avgPerExpense)}
                              </span>
                            </div>
                            <span className="text-xl font-bold text-indigo-600">
                              {formatCurrency(month.total)}
                            </span>
                          </div>
                        </summary>
                        <div className="p-4 bg-gray-50">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Members in this month */}
                            <div>
                              <h4 className="font-semibold text-sm text-gray-700 mb-2">{t.analytics.monthlyAnalysis.byMembers}</h4>
                              <div className="space-y-2">
                                {Object.values(month.members)
                                  .sort((a, b) => b.total - a.total)
                                  .map((member) => {
                                    const percentage = (member.total / month.total) * 100;
                                    return (
                                      <div key={member.name} className="bg-white rounded p-2">
                                        <div className="flex justify-between text-sm mb-1">
                                          <span className="font-medium">{member.name}</span>
                                          <span className="font-semibold">{formatCurrency(member.total)}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                          <div
                                            className="bg-indigo-600 h-2 rounded-full"
                                            style={{ width: `${percentage}%` }}
                                          />
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          {member.count} {t.analytics.monthlyAnalysis.expenseCount} • {percentage.toFixed(1)}%
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                            {/* Categories in this month */}
                            <div>
                              <h4 className="font-semibold text-sm text-gray-700 mb-2">{t.analytics.monthlyAnalysis.byCategories}</h4>
                              <div className="space-y-2">
                                {Object.entries(month.categories)
                                  .sort(([, a], [, b]) => b - a)
                                  .map(([category, amount]) => {
                                    const percentage = (amount / month.total) * 100;
                                    return (
                                      <div key={category} className="bg-white rounded p-2">
                                        <div className="flex justify-between text-sm mb-1">
                                          <span className="font-medium">{category}</span>
                                          <span className="font-semibold">{formatCurrency(amount)}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                          <div
                                            className="bg-purple-600 h-2 rounded-full"
                                            style={{ width: `${percentage}%` }}
                                          />
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          {percentage.toFixed(1)}% {t.analytics.monthlyAnalysis.ofMonth}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              )}

              {/* Debt Settlement Section */}
              {(Array.isArray(debtSettlements) ? false : debtSettlements.settlements.length > 0) && !Array.isArray(debtSettlements) && (
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <span>💰</span> {t.analytics.debtSettlement.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {t.analytics.debtSettlement.fairSharePerPerson} <span className="font-semibold">{formatCurrency(debtSettlements.fairShare)}</span>
                  </p>
                  
                  {/* Balance Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                    {debtSettlements.balances.map((balance: { userId: string; userName: string; balance: number; fairShare: number }) => (
                      <div 
                        key={balance.userId} 
                        className={`rounded-lg p-3 ${
                          balance.balance > 0.01 
                            ? 'bg-green-50 border border-green-200' 
                            : balance.balance < -0.01 
                            ? 'bg-red-50 border border-red-200' 
                            : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <div className="font-medium text-sm">{balance.userName}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {t.analytics.debtSettlement.totalSpent} {formatCurrency(balance.balance + balance.fairShare)}
                        </div>
                        <div className={`text-sm font-semibold mt-1 ${
                          balance.balance > 0.01 ? 'text-green-700' : 
                          balance.balance < -0.01 ? 'text-red-700' : 'text-gray-700'
                        }`}>
                          {balance.balance > 0.01 ? `+${formatCurrency(balance.balance)} ${t.analytics.debtSettlement.creditor}` :
                           balance.balance < -0.01 ? `${formatCurrency(Math.abs(balance.balance))} ${t.analytics.debtSettlement.debtor}` :
                           t.analytics.debtSettlement.balanced}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Settlement Transactions */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-gray-700 mb-2">{t.analytics.debtSettlement.recommendedPayments}</h4>
                    {debtSettlements.settlements.map((settlement: { from: string; to: string; amount: number }, index: number) => (
                      <div key={index} className="bg-gradient-to-r from-orange-50 to-yellow-50 border-l-4 border-orange-400 rounded-lg p-4">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
                              {settlement.from}
                            </span>
                            <span className="text-gray-400 text-xl">→</span>
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                              {settlement.to}
                            </span>
                          </div>
                          <span className="text-xl font-bold text-orange-600">
                            {formatCurrency(settlement.amount)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          {t.analytics.debtSettlement.shouldPay
                            .replace('{from}', settlement.from)
                            .replace('{to}', settlement.to)
                            .replace('{amount}', formatCurrency(settlement.amount))}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-blue-50 rounded-lg p-3 mt-4">
                    <div className="flex gap-2 text-xs text-blue-700">
                      <span>💡</span>
                      <p>{t.analytics.debtSettlement.helpText}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Insights Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Day of Week Analysis */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span>📊</span> {t.analytics.dayOfWeek.title}
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dayOfWeekData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'total' ? formatCurrency(Number(value)) : value,
                          name === 'total' ? t.analytics.dayOfWeek.totalSpending : t.analytics.dayOfWeek.expenseCount
                        ]} 
                      />
                      <Legend />
                      <Bar dataKey="total" fill="#6366f1" name={t.analytics.dayOfWeek.totalSpending} />
                      <Bar dataKey="count" fill="#8b5cf6" name={t.analytics.dayOfWeek.expenseCount} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Top 10 Expenses */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span>🏆</span> {t.analytics.topExpenses.title}
                  </h3>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {topExpenses.map((expense, index) => (
                      <div key={expense.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-400 text-yellow-900' :
                          index === 1 ? 'bg-gray-300 text-gray-700' :
                          index === 2 ? 'bg-orange-300 text-orange-900' :
                          'bg-gray-200 text-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {expense.description}
                          </div>
                          <div className="text-xs text-gray-500">
                            {expense.user.name} • {new Date(expense.date).toLocaleDateString('tr-TR')}
                          </div>
                        </div>
                        <div className="text-sm font-bold text-gray-900">
                          {formatCurrency(expense.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Category Average Spending */}
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span>📈</span> {t.analytics.categoryAverages.title}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {chartData.categoryData.map((cat, index) => {
                    const categoryExpenses = filteredExpenses.filter(e => 
                      (e.category || t.spending.uncategorized) === cat.name
                    );
                    const avgPerExpense = categoryExpenses.length > 0 ? cat.value / categoryExpenses.length : 0;
                    
                    return (
                      <div key={cat.name} className="bg-gradient-to-br from-gray-50 to-white border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">{cat.name}</h4>
                          <div 
                            className="w-8 h-8 rounded-full flex-shrink-0"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">{t.analytics.categoryAverages.total}</span>
                            <span className="font-semibold">{formatCurrency(cat.value)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">{t.analytics.categoryAverages.count}</span>
                            <span className="font-semibold">{categoryExpenses.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">{t.analytics.categoryAverages.average}</span>
                            <span className="font-semibold">{formatCurrency(avgPerExpense)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500 pt-1 border-t">
                            <span>{t.analytics.categoryAverages.percentageOfTotal}</span>
                            <span>{((cat.value / summaryStats.total) * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Expense Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t.analytics.table.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {t.analytics.table.showing} {filteredExpenses.length} {t.analytics.table.of} {expenses.length} {t.analytics.table.expenses}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t.analytics.table.date}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t.analytics.table.description}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t.analytics.table.category}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t.analytics.table.member}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t.analytics.table.amount}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredExpenses.map((expense) => (
                        <tr key={expense.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(expense.date).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {expense.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {expense.category || t.spending.uncategorized}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {expense.user.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                            {formatCurrency(expense.amount)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-bold">
                        <td colSpan={4} className="px-6 py-4 text-sm text-gray-900 text-right">
                          {t.analytics.charts.total}:
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {formatCurrency(summaryStats.total)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
