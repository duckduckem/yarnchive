import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface StitchDefinitionSheetProps {
  abbreviation: string | null
  cachedDefinition: string | null | undefined  // undefined = not yet fetched
  onClose: () => void
  onFetched: (abbreviation: string, definition: string | null) => void
}

export default function StitchDefinitionSheet({
  abbreviation,
  cachedDefinition,
  onClose,
  onFetched,
}: StitchDefinitionSheetProps) {
  const [definition, setDefinition] = useState<string | null | undefined>(cachedDefinition)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!abbreviation) return

    // Already cached
    if (cachedDefinition !== undefined) {
      setDefinition(cachedDefinition)
      return
    }

    // Fetch from Supabase
    setLoading(true)
    setDefinition(undefined)

    supabase
      .from('stitch_def')
      .select('definition')
      .eq('abbreviation', abbreviation)
      .single()
      .then(({ data }) => {
        const result = data?.definition ?? null
        setDefinition(result)
        onFetched(abbreviation, result)
        setLoading(false)
      })
  }, [abbreviation, cachedDefinition, onFetched])

  if (!abbreviation) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/20"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-40 rounded-t-2xl bg-white shadow-xl px-6 pt-5 pb-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-semibold">{abbreviation}</span>
          <button onClick={onClose} aria-label="Close" className="p-1 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading && (
          <p className="text-sm text-gray-400">Loading...</p>
        )}

        {!loading && definition !== undefined && definition !== null && (
          <p className="text-base leading-relaxed">{definition}</p>
        )}

        {!loading && definition === null && (
          <p className="text-sm text-gray-400 italic">No definition found for [{abbreviation}].</p>
        )}
      </div>
    </>
  )
}
