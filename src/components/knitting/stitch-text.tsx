import { parseStitchText } from '../../lib/parse-stitch-text'
import StitchToken from './stitch-token'

interface StitchTextProps {
  text: string
  onTokenTap: (display: string, lookupKey: string) => void
}

export default function StitchText({ text, onTokenTap }: StitchTextProps) {
  const segments = parseStitchText(text)

  return (
    <span>
      {segments.map((seg, i) => {
        if (seg.type === 'token') {
          return (
            <StitchToken
              key={i}
              display={seg.display}
              lookupKey={seg.lookupKey}
              onTap={onTokenTap}
            />
          )
        }
        if (seg.type === 'number') {
          return <span key={i} className="text-amber-600 font-medium">{seg.value}</span>
        }
        return <span key={i}>{seg.value}</span>
      })}
    </span>
  )
}
