interface RestartConfirmDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function RestartConfirmDialog({
  open,
  onConfirm,
  onCancel,
}: RestartConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold mb-2">Restart this project?</h2>
        <p className="text-sm text-gray-500 mb-6">
          Your progress will be reset to the beginning. This can't be undone.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirm}
            className="w-full rounded-xl bg-red-500 px-4 py-3 text-white font-medium active:bg-red-600"
          >
            Restart
          </button>
          <button
            onClick={onCancel}
            className="w-full rounded-xl bg-gray-100 px-4 py-3 text-gray-700 font-medium active:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
