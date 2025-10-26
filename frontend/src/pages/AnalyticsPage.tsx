import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { expenseApi, groupApi } from '../services/api';
import type { Expense, Group } from '../types';
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
    }
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
    if (filteredExpenses.length === 0) return [];

    const usersMap = new Map<string, { name: string; spent: number }>();
    
    filteredExpenses.forEach((expense) => {
      if (!usersMap.has(expense.user.id)) {
        usersMap.set(expense.user.id, { name: expense.user.name, spent: 0 });
      }
      usersMap.get(expense.user.id)!.spent += expense.amount;
    });

    const users = Array.from(usersMap.entries()).map(([id, data]) => ({
      userId: id,
      userName: data.name,
      spent: data.spent
    }));

    if (users.length === 0) return [];

    const totalSpent = users.reduce((sum, u) => sum + u.spent, 0);
    const fairShare = totalSpent / users.length;

    const balances = users.map(u => ({
      userId: u.userId,
      userName: u.userName,
      balance: u.spent - fairShare,
      fairShare: fairShare
    }));

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
  }, [filteredExpenses]);

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
      // Prepare data for export
      const exportData = filteredExpenses.map(expense => ({
        [t.analytics.export.headers.date]: new Date(expense.date).toLocaleDateString('tr-TR'),
        [t.analytics.export.headers.description]: expense.description,
        [t.analytics.export.headers.category]: expense.category || t.spending.uncategorized,
        [t.analytics.export.headers.member]: expense.user.name,
        [t.analytics.export.headers.amount]: expense.amount,
      }));

      // Add summary row
      exportData.push({
        [t.analytics.export.headers.date]: '',
        [t.analytics.export.headers.description]: '',
        [t.analytics.export.headers.category]: '',
        [t.analytics.export.headers.member]: t.analytics.export.headers.total,
        [t.analytics.export.headers.amount]: summaryStats.total,
      });

      // Create workbook
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t.analytics.export.summarySheet.expenseSheet);

      // Add summary sheet
      const summaryData = [
        { [t.analytics.export.summarySheet.metric]: t.analytics.export.summarySheet.totalSpending, [t.analytics.export.summarySheet.value]: formatCurrency(summaryStats.total) },
        { [t.analytics.export.summarySheet.metric]: t.analytics.export.summarySheet.averageSpending, [t.analytics.export.summarySheet.value]: formatCurrency(summaryStats.average) },
        { [t.analytics.export.summarySheet.metric]: t.analytics.export.summarySheet.totalTransactions, [t.analytics.export.summarySheet.value]: summaryStats.count },
        { [t.analytics.export.summarySheet.metric]: t.analytics.export.summarySheet.topCategory, [t.analytics.export.summarySheet.value]: summaryStats.topCategory },
      ];
      const ws2 = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws2, t.analytics.export.summarySheet.name);

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
                        label={(entry: any) => 
                          `${entry.name}: ${(entry.percent * 100).toFixed(0)}%`
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
                    {debtSettlements.balances.map((balance: any) => (
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
                    {debtSettlements.settlements.map((settlement: any, index: number) => (
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
