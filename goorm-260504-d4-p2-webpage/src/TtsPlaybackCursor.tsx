type Props = {
  visible: boolean;
  x: number;
  y: number;
};

const EMIT_ARCS =
  "M15 9 Q18 12 15 15 M16.5 7.5 Q21 12 16.5 16.5 M17.9 6.2 Q23.5 12 17.9 17.85";

const HOT_X = 5;
const HOT_Y = 25;

export default function TtsPlaybackCursor({ visible, x, y }: Props) {
  if (!visible) return null;

  return (
    <div
      className="tts-play-cursor-root"
      aria-hidden
      style={{ transform: `translate(${x - HOT_X}px, ${y - HOT_Y}px)` }}
    >
      <div className="tts-play-cursor-stack">
        <svg
          className="tts-play-speaker-slice"
          width={32}
          height={32}
          viewBox="0 0 24 24"
          overflow="visible"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            stroke="#1a1510"
            strokeWidth="1.1"
            fill="#ffd85c"
            d="M11 5.2L6.2 8.9H4.1v6.2h2.1L11 18.8z"
          />
        </svg>

        <svg
          className="tts-play-wave-plane"
          width={32}
          height={32}
          viewBox="0 0 24 24"
          overflow="visible"
        >
          <g className="tts-play-wave-layer">
            <path
              className="tts-play-wave"
              fill="none"
              stroke="#1a1510"
              strokeWidth="2"
              strokeLinecap="round"
              vectorEffect="nonScalingStroke"
              d={EMIT_ARCS}
            />
            <path
              className="tts-play-wave"
              fill="none"
              stroke="#1a1510"
              strokeWidth="2"
              strokeLinecap="round"
              vectorEffect="nonScalingStroke"
              d={EMIT_ARCS}
            />
            <path
              className="tts-play-wave"
              fill="none"
              stroke="#1a1510"
              strokeWidth="2"
              strokeLinecap="round"
              vectorEffect="nonScalingStroke"
              d={EMIT_ARCS}
            />
          </g>
        </svg>
      </div>
    </div>
  );
}
