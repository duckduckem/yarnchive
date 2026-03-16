import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface StitchDefinitionSheetProps {
  display: string | null      // text to show in the sheet title
  lookupKey: string | null    // 'id:xxx' | abbreviation (e.g. 'k12', 'sm')
  cachedDefinition: string | null | undefined  // undefined = not yet fetched
  onClose: () => void
  onFetched: (lookupKey: string, definition: string | null) => void
}

// Resolves a lookupKey to a stitch definition using the three-step priority:
//   1. Pipe syntax  → look up stitch_def by id  (lookupKey = 'id:xxx')
//   2. Exact match  → look up stitch_def by abbreviation
//   3. Digit strip  → strip trailing digits, look up by abbreviation again
async function fetchDefinition(lookupKey: string): Promise<string | null> {
  if (lookupKey.startsWith('id:')) {
    const id = lookupKey.slice(3)
    const { data } = await supabase
      .from('stitch_def')
      .select('description')
      .eq('id', id)
      .maybeSingle()
    return data?.description ?? null
  }

  // Exact match on abbreviation
  const { data: exact } = await supabase
    .from('stitch_def')
    .select('description')
    .eq('abbreviation', lookupKey)
    .maybeSingle()
  if (exact) return exact.description ?? null

  // Strip trailing digits and retry (e.g. k12 → k)
  const base = lookupKey.replace(/\d+$/, '')
  if (base === lookupKey) return null  // no digits to strip, nothing more to try
  const { data: stripped } = await supabase
    .from('stitch_def')
    .select('description')
    .eq('abbreviation', base)
    .maybeSingle()
  return stripped?.description ?? null
}

export default function StitchDefinitionSheet({
  display,
  lookupKey,
  cachedDefinition,
  onClose,
  onFetched,
}: StitchDefinitionSheetProps) {
  const [definition, setDefinition] = useState<string | null | undefined>(cachedDefinition)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!lookupKey || !display) return

    if (cachedDefinition !== undefined) {
      setDefinition(cachedDefinition)
      return
    }

    setLoading(true)
    setDefinition(undefined)

    fetchDefinition(lookupKey).then((result) => {
      setDefinition(result)
      onFetched(lookupKey, result)
      setLoading(false)
    })
  }, [lookupKey, display, cachedDefinition, onFetched])

  if (!display || !lookupKey) return null

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-40 rounded-t-2xl bg-white shadow-xl px-6 pt-5 pb-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-semibold font-mono">{display}</span>
          <button onClick={onClose} aria-label="Close" className="p-1 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading && <p className="text-sm text-gray-400">Loading...</p>}

        {!loading && definition !== undefined && definition !== null && (
          <p className="text-base leading-relaxed">{definition}</p>
        )}

        {!loading && definition === null && (
          <p className="text-sm text-gray-400 italic">No definition found for [{display}].</p>
        )}
      </div>
    </>
  )
}
