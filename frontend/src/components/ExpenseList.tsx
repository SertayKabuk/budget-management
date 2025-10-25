import type { Expense } from '../services/api';
import { useState, useMemo, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseApi } from '../services/api';
import { useTranslation } from '../contexts/LanguageContext';
import { formatCurrency } from '../utils/currency';
import { config } from '../config/runtime';

interface Props {
  expenses: Expense[];
  groupId: string;
}

type PresetFilter = 'current-month' | 'last-month' | 'all';

export default function ExpenseList({ expenses, groupId }: Props) {
  const { t } = useTranslation();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ amount: 0, description: '', category: '' });
  const queryClient = useQueryClient();

  // Filter states
  const [presetFilter, setPresetFilter] = useState<PresetFilter>('current-month');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [personFilter, setPersonFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Get unique categories and persons from expenses
  const uniqueCategories = useMemo(() => {
    const categories = expenses
      .map(e => e.category)
      .filter((c): c is string => !!c);
    return Array.from(new Set(categories)).sort();
  }, [expenses]);

  const uniquePersons = useMemo(() => {
    const persons = expenses.map(e => ({ id: e.user.id, name: e.user.name }));
    const uniqueMap = new Map(persons.map(p => [p.id, p.name]));
    return Array.from(uniqueMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [expenses]);

  // Calculate date ranges for preset filters
  const getDateRange = (preset: PresetFilter): { start: Date; end: Date } | null => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    switch (preset) {
      case 'current-month':
        return {
          start: new Date(year, month, 1),
          end: new Date(year, month + 1, 0, 23, 59, 59)
        };
      case 'last-month':
        return {
          start: new Date(year, month - 1, 1),
          end: new Date(year, month, 0, 23, 59, 59)
        };
      case 'all':
        return null;
      default:
        return null;
    }
  };

  // Apply preset filter when changed
  const handlePresetFilterChange = (preset: PresetFilter) => {
    setPresetFilter(preset);
    const range = getDateRange(preset);
    if (range) {
      setStartDate(range.start.toISOString().split('T')[0]);
      setEndDate(range.end.toISOString().split('T')[0]);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  // Filter expenses based on all criteria
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      // Category filter
      if (categoryFilter && expense.category !== categoryFilter) {
        return false;
      }

      // Person filter
      if (personFilter && expense.user.id !== personFilter) {
        return false;
      }

      // Date filter
      const expenseDate = new Date(expense.date);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (expenseDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (expenseDate > end) return false;
      }

      return true;
    });
  }, [expenses, categoryFilter, personFilter, startDate, endDate]);

  // Clear all filters
  const clearFilters = () => {
    setPresetFilter('current-month');
    handlePresetFilterChange('current-month');
    setCategoryFilter('');
    setPersonFilter('');
  };

  // Initialize default filter on mount
  useEffect(() => {
    handlePresetFilterChange('current-month');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expenseApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
      queryClient.invalidateQueries({ queryKey: ['summary', groupId] });
    },
  });

  const handleDelete = (id: string, description: string) => {
    if (window.confirm(`"${description}" ${t.expenses.deleteConfirm}`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense.id);
    setEditForm({
      amount: expense.amount,
      description: expense.description,
      category: expense.category || '',
    });
  };

  const handleUpdate = async (expenseId: string, userId: string) => {
    try {
      await expenseApi.update(expenseId, {
        ...editForm,
        userId,
        groupId,
      });
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
      queryClient.invalidateQueries({ queryKey: ['summary', groupId] });
      setEditingExpense(null);
    } catch (error) {
      console.error('Error updating expense:', error);
      alert(t.expenses.deleteConfirm);
    }
  };

  if (expenses.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>{t.expenses.noExpenses}</p>
      </div>
    );
  }

  if (filteredExpenses.length === 0) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">{t.expenses.title}</h2>
          
          {/* Filter Section */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            {/* Preset Filters */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handlePresetFilterChange('current-month')}
                className={`px-4 py-2 rounded ${
                  presetFilter === 'current-month'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {t.expenses.filters.currentMonth}
              </button>
              <button
                onClick={() => handlePresetFilterChange('last-month')}
                className={`px-4 py-2 rounded ${
                  presetFilter === 'last-month'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {t.expenses.filters.lastMonth}
              </button>
              <button
                onClick={() => handlePresetFilterChange('all')}
                className={`px-4 py-2 rounded ${
                  presetFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {t.expenses.filters.all}
              </button>
            </div>

            {/* Custom Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.expenses.filters.category}
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">{t.expenses.filters.allCategories}</option>
                  {uniqueCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Person Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.expenses.filters.person}
                </label>
                <select
                  value={personFilter}
                  onChange={(e) => setPersonFilter(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">{t.expenses.filters.allPeople}</option>
                  {uniquePersons.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.expenses.filters.startDate}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPresetFilter('all');
                  }}
                  className="w-full p-2 border rounded"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.expenses.filters.endDate}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPresetFilter('all');
                  }}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {t.expenses.filters.showing} {filteredExpenses.length} {t.expenses.filters.of} {expenses.length} {t.expenses.filters.expenses}
              </div>
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {t.expenses.filters.clearFilters}
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-gray-500 py-8">
          <p>{t.expenses.filters.noResults}</p>
        </div>
      </div>
    );
  }

  const API_URL = config.apiUrl;

  return (
    <>
      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white text-2xl hover:text-gray-300"
            >
              ✕
            </button>
            <img 
              src={`${API_URL}${selectedImage}`} 
              alt="Invoice" 
              className="max-w-full max-h-screen object-contain rounded"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">{t.expenses.title}</h2>
          
          {/* Filter Section */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            {/* Preset Filters */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handlePresetFilterChange('current-month')}
                className={`px-4 py-2 rounded ${
                  presetFilter === 'current-month'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {t.expenses.filters.currentMonth}
              </button>
              <button
                onClick={() => handlePresetFilterChange('last-month')}
                className={`px-4 py-2 rounded ${
                  presetFilter === 'last-month'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {t.expenses.filters.lastMonth}
              </button>
              <button
                onClick={() => handlePresetFilterChange('all')}
                className={`px-4 py-2 rounded ${
                  presetFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {t.expenses.filters.all}
              </button>
            </div>

            {/* Custom Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.expenses.filters.category}
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">{t.expenses.filters.allCategories}</option>
                  {uniqueCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Person Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.expenses.filters.person}
                </label>
                <select
                  value={personFilter}
                  onChange={(e) => setPersonFilter(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">{t.expenses.filters.allPeople}</option>
                  {uniquePersons.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.expenses.filters.startDate}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPresetFilter('all'); // Clear preset when custom date is set
                  }}
                  className="w-full p-2 border rounded"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.expenses.filters.endDate}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPresetFilter('all'); // Clear preset when custom date is set
                  }}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {t.expenses.filters.showing} {filteredExpenses.length} {t.expenses.filters.of} {expenses.length} {t.expenses.filters.expenses}
              </div>
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {t.expenses.filters.clearFilters}
              </button>
            </div>
          </div>
        </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t.expenses.date}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t.expenses.description}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t.expenses.category}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t.expenses.user}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t.expenses.amount}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t.expenses.actions}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredExpenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-gray-50">
                {editingExpense === expense.id ? (
                  // Edit Mode
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(expense.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <input
                        type="text"
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-full p-1 border rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <input
                        type="text"
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="w-full p-1 border rounded"
                        placeholder={t.expenses.categoryPlaceholder}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {expense.user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.amount}
                        onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })}
                        className="w-24 p-1 border rounded text-right"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right space-x-2">
                      <button
                        onClick={() => handleUpdate(expense.id, expense.user.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        {t.expenses.save}
                      </button>
                      <button
                        onClick={() => setEditingExpense(null)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        {t.expenses.cancelEdit}
                      </button>
                    </td>
                  </>
                ) : (
                  // View Mode
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(expense.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <span>{expense.description}</span>
                        {expense.imageUrl && (
                          <button
                            onClick={() => setSelectedImage(expense.imageUrl || null)}
                            className="text-blue-500 hover:text-blue-700 text-lg"
                            title={t.expenses.viewInvoice}
                          >
                            📎
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {expense.category || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {expense.user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right space-x-2">
                      <button
                        onClick={() => handleEdit(expense)}
                        className="text-blue-600 hover:text-blue-900"
                        title={t.expenses.edit}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id, expense.description)}
                        className="text-red-600 hover:text-red-900"
                        title={t.expenses.delete}
                      >
                        🗑️
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td colSpan={5} className="px-6 py-4 text-sm font-semibold text-gray-900">
                {t.expenses.total}
              </td>
              <td className="px-6 py-4 text-sm font-bold text-right text-gray-900">
                {formatCurrency(expenses.reduce((sum, exp) => sum + exp.amount, 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
    </>
  );
}
