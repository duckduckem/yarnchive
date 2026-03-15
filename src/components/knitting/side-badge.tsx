interface SideBadgeProps {
  side: 'RS' | 'WS'
}

export default function SideBadge({ side }: SideBadgeProps) {
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold tracking-wide bg-gray-100 text-gray-600">
      {side}
    </span>
  )
}
