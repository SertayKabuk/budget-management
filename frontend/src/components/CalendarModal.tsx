import ExpenseCalendar from './ExpenseCalendar';

interface CalendarModalProps {
  groupId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function CalendarModal({ groupId, isOpen, onClose }: CalendarModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div 
          className="relative bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-gray-600 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
            aria-label="Close calendar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Calendar Content */}
          <div className="p-4 sm:p-6">
            <ExpenseCalendar groupId={groupId} />
          </div>
        </div>
      </div>
    </div>
  );
}
