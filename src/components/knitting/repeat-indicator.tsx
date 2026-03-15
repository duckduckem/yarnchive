interface RepeatIndicatorProps {
  current: number
  total: number
}

export default function RepeatIndicator({ current, total }: RepeatIndicatorProps) {
  return (
    <p className="text-sm text-gray-500 mt-2">
      Repeat {current} of {total}
    </p>
  )
}
