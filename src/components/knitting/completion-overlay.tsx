interface CompletionOverlayProps {
  projectName: string
  onMarkFinished: () => void
  onDismiss: () => void
}

export default function CompletionOverlay({
  projectName,
  onMarkFinished,
  onDismiss,
}: CompletionOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl">
        <p className="text-4xl mb-4">🎉</p>
        <h2 className="text-xl font-semibold mb-2">You finished it!</h2>
        <p className="text-gray-500 mb-8">{projectName}</p>

        <div className="flex flex-col gap-3">
          <button
            onClick={onMarkFinished}
            className="w-full rounded-xl bg-green-500 px-4 py-3 text-white font-medium active:bg-green-600"
          >
            Mark as Finished
          </button>
          <button
            onClick={onDismiss}
            className="w-full rounded-xl bg-gray-100 px-4 py-3 text-gray-700 font-medium active:bg-gray-200"
          >
            Not yet
          </button>
        </div>
      </div>
    </div>
  )
}
