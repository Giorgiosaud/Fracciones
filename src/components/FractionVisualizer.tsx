import type { FractionValue } from '../lib/types'

interface Props {
  fraction: FractionValue
  size?: number
  color?: string
}

function CircleVisualizer({ fraction, size = 80, color = '#6366f1' }: Props) {
  const { numerator, denominator } = fraction
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 4

  if (denominator === 1) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill={color} stroke="#475569" strokeWidth="1" />
      </svg>
    )
  }

  const sectors = Array.from({ length: denominator }, (_, i) => {
    const startAngle = (i / denominator) * 2 * Math.PI - Math.PI / 2
    const endAngle = ((i + 1) / denominator) * 2 * Math.PI - Math.PI / 2
    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)
    const largeArc = 1 / denominator > 0.5 ? 1 : 0
    const filled = i < numerator

    return (
      <path
        key={i}
        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
        fill={filled ? color : '#1e293b'}
        stroke="#334155"
        strokeWidth="1.5"
      />
    )
  })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {sectors}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#475569" strokeWidth="1" />
    </svg>
  )
}

function BarVisualizer({ fraction, color = '#6366f1' }: Props) {
  const { numerator, denominator } = fraction
  const cellW = 32
  const h = 28
  const totalW = Math.min(cellW * denominator, 320)
  const actualCellW = totalW / denominator

  return (
    <svg width={totalW} height={h} viewBox={`0 0 ${totalW} ${h}`}>
      {Array.from({ length: denominator }, (_, i) => (
        <rect
          key={i}
          x={i * actualCellW}
          y={0}
          width={actualCellW - 2}
          height={h}
          rx={3}
          fill={i < numerator ? color : '#1e293b'}
          stroke="#334155"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  )
}

export default function FractionVisualizer({ fraction, size, color }: Props) {
  const wholes = Math.floor(fraction.numerator / fraction.denominator)
  const remainder = fraction.numerator % fraction.denominator
  const isImproper = wholes > 0 && remainder > 0

  if (isImproper) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-2 flex-wrap justify-center">
          {Array.from({ length: wholes }, (_, i) => (
            <CircleVisualizer
              key={i}
              fraction={{ numerator: fraction.denominator, denominator: fraction.denominator }}
              size={size}
              color={color}
            />
          ))}
          {remainder > 0 && (
            <CircleVisualizer
              fraction={{ numerator: remainder, denominator: fraction.denominator }}
              size={size}
              color={color}
            />
          )}
        </div>
        <BarVisualizer fraction={fraction} color={color} />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <CircleVisualizer fraction={fraction} size={size} color={color} />
      <BarVisualizer fraction={fraction} color={color} />
    </div>
  )
}
