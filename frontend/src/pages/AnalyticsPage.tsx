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
        'Tarih': new Date(expense.date).toLocaleDateString('tr-TR'),
        'Açıklama': expense.description,
        'Kategori': expense.category || t.spending.uncategorized,
        'Üye': expense.user.name,
        'Tutar': expense.amount,
      }));

      // Add summary row
      exportData.push({
        'Tarih': '',
        'Açıklama': '',
        'Kategori': '',
        'Üye': 'TOPLAM',
        'Tutar': summaryStats.total,
      });

      // Create workbook
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Harcamalar');

      // Add summary sheet
      const summaryData = [
        { 'Metrik': 'Toplam Harcama', 'Değer': formatCurrency(summaryStats.total) },
        { 'Metrik': 'Ortalama Harcama', 'Değer': formatCurrency(summaryStats.average) },
        { 'Metrik': 'Toplam İşlem', 'Değer': summaryStats.count },
        { 'Metrik': 'En Çok Harcanan Kategori', 'Değer': summaryStats.topCategory },
      ];
      const ws2 = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Özet');

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
          {groups.length} {groups.length === 1 ? 'grup mevcut' : 'grup mevcut'}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">{t.analytics.loading}</p>
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-600 text-lg mb-2">{t.analytics.noExpenses}</p>
          <p className="text-gray-500 text-sm">Seçili grupta henüz harcama bulunmuyor. Ana sayfadan harcama ekleyebilirsiniz.</p>
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
                {expenses.length} harcama var ama seçili filtrelere uymuyor.
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
