interface ConfirmationDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  destructive?: boolean;
}

export default function ConfirmationDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  loading = false,
  destructive = false,
}: ConfirmationDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/45 p-4">
      <section
        aria-describedby="confirmation-dialog-message"
        aria-labelledby="confirmation-dialog-title"
        aria-modal="true"
        className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl"
        role="dialog"
      >
        <h2 className="text-lg font-bold text-gray-900" id="confirmation-dialog-title">
          {title}
        </h2>
        <p className="mt-2 text-sm text-gray-600" id="confirmation-dialog-message">
          {message}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            disabled={loading}
            onClick={onCancel}
            type="button"
          >
            Annuler
          </button>
          <button
            className={`rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
              destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-[#b6532b] hover:bg-[#98411f]'
            }`}
            disabled={loading}
            onClick={onConfirm}
            type="button"
          >
            {loading ? 'Traitement...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
