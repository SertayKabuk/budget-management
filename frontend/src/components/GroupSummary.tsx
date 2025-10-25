import { useTranslation } from '../contexts/LanguageContext';
import { formatCurrency } from '../utils/currency';

interface Props {
  summary: any;
}

export default function GroupSummary({ summary }: Props) {
  const { t } = useTranslation();

  if (!summary) {
    return <div>{t.summary.loading}</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">{t.summary.title}</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">{t.summary.totalSpending}</p>
          <p className="text-3xl font-bold text-blue-600">
            {formatCurrency(summary.totalSpending || 0)}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">{t.summary.totalExpenses}</p>
          <p className="text-3xl font-bold text-green-600">
            {summary.expenseCount || 0}
          </p>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">{t.summary.spendingByMember}</h3>
        <div className="space-y-3">
          {summary.spendingByUser?.map((userSpending: any) => (
            <div key={userSpending.user.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">{userSpending.user.name}</span>
                <span className="text-lg font-bold">
                  {formatCurrency(userSpending.total || 0)}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {userSpending.count} {userSpending.count === 1 ? t.summary.expense : t.summary.expenses}
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{
                    width: `${(userSpending.total / summary.totalSpending) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
