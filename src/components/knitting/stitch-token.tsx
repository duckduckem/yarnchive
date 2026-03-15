interface StitchTokenProps {
  abbreviation: string
  onTap: (abbreviation: string) => void
}

export default function StitchToken({ abbreviation, onTap }: StitchTokenProps) {
  return (
    <button
      onClick={() => onTap(abbreviation)}
      className="inline underline decoration-dotted underline-offset-2 font-medium"
    >
      {abbreviation}
    </button>
  )
}
