interface StitchTokenProps {
  display: string
  lookupKey: string
  onTap: (display: string, lookupKey: string) => void
}

export default function StitchToken({ display, lookupKey, onTap }: StitchTokenProps) {
  return (
    <button
      onClick={() => onTap(display, lookupKey)}
      className="inline font-mono underline decoration-dotted underline-offset-2"
    >
      {display}
    </button>
  )
}
