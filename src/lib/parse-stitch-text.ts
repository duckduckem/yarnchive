export type Segment =
  | { type: 'text'; value: string }
  | { type: 'token'; display: string; lookupKey: string }
  | { type: 'number'; value: string }

// lookupKey encoding:
//   'id:xxx'   → look up stitch_def by id field (pipe syntax)
//   anything else → look up stitch_def by abbreviation, with trailing-digit strip fallback

const SEGMENT_RE = /\[([^\]]+)\]|(\d+)/g

function parseToken(raw: string): { display: string; lookupKey: string } {
  const pipeIndex = raw.indexOf('|')
  if (pipeIndex !== -1) {
    // Pipe syntax: [display text|stitch_def_id]
    return {
      display: raw.slice(0, pipeIndex),
      lookupKey: 'id:' + raw.slice(pipeIndex + 1),
    }
  }
  // Regular token — display is the full content; lookup resolves at fetch time
  return { display: raw, lookupKey: raw }
}

export function parseStitchText(input: string): Segment[] {
  if (!input) return []

  const segments: Segment[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = SEGMENT_RE.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: input.slice(lastIndex, match.index) })
    }

    if (match[1] !== undefined) {
      segments.push({ type: 'token', ...parseToken(match[1]) })
    } else if (match[2] !== undefined) {
      segments.push({ type: 'number', value: match[2] })
    }

    lastIndex = SEGMENT_RE.lastIndex
  }

  if (lastIndex < input.length) {
    segments.push({ type: 'text', value: input.slice(lastIndex) })
  }

  return segments
}
