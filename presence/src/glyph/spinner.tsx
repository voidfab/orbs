import type { CSSProperties } from 'react';

/** Wave spinner from respinner — waiting / loading only. */
export function WaveSpinner({
  size = 40,
  color = '#e8e8ea',
  duration = 1.5
}: {
  size?: number;
  color?: string;
  duration?: number;
}) {
  const stroke = 2;
  const radius = size / 2 - stroke;
  const pos = size / 2;
  const style: CSSProperties = { display: 'block' };
  return (
    <svg width={size} height={size} style={style} aria-hidden="true">
      {Array.from({ length: 3 }, (_, i) => (
        <circle
          key={i}
          cx={pos}
          cy={pos}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
        >
          <animate
            attributeName="opacity"
            values="1;0.7;0"
            keyTimes="0;0.7;1"
            dur={`${duration}s`}
            begin={`${(duration / 3) * i}s`}
            repeatCount="indefinite"
          />
          <animateTransform
            attributeName="transform"
            type="scale"
            values=".1;1;1"
            keyTimes="0;0.7;1"
            dur={`${duration}s`}
            begin={`${(duration / 3) * i}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </svg>
  );
}
