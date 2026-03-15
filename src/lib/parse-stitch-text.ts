export type Segment =
  | { type: 'text'; value: string }
  | { type: 'token'; value: string }
  | { type: 'number'; value: string }

const SEGMENT_RE = /\[([^\]]+)\]|(\d+)/g

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
      segments.push({ type: 'token', value: match[1] })
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
