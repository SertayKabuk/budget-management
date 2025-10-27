import type { PaymentStatus } from '../types';
import { useTranslation } from '../contexts/LanguageContext';

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const { t } = useTranslation();

  const statusConfig = {
    PENDING: {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      label: t.payments.status.PENDING,
    },
    COMPLETED: {
      color: 'bg-green-100 text-green-800 border-green-300',
      label: t.payments.status.COMPLETED,
    },
    CANCELLED: {
      color: 'bg-gray-100 text-gray-800 border-gray-300',
      label: t.payments.status.CANCELLED,
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`px-2 py-1 text-xs font-medium rounded-full border ${config.color}`}
    >
      {config.label}
    </span>
  );
}
