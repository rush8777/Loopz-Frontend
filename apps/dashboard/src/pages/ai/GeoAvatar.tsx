import "./GeoAvatar.css";

type GeoAvatarState = "idle" | "thinking" | "replying" | "resting";

export function GeoAvatar({
  state,
  size = "compact",
}: {
  state: GeoAvatarState;
  size?: "hero" | "compact";
}) {
  return (
    <span className="geo-avatar" data-size={size} data-state={state} aria-hidden="true">
      <svg className="geo-avatar__cube" viewBox="0 0 64 64" focusable="false">
        <path
          fill="#add8f5"
          d="M4.5 21c0-4 2-7 5.5-9l16.5-9.3a11 11 0 0 1 10.7 0L54 12c3.5 2 5.5 5 5.5 9v21.5c0 3.7-1.9 7-5.2 9l-16.9 9.7a11 11 0 0 1-10.8 0l-17-9.8a10.3 10.3 0 0 1-5.1-8.9Z"
        />
        <path
          fill="#f8fbff"
          d="M7 16.2c.8-1.6 2-2.9 3.7-3.8l15.8-9.7a11 11 0 0 1 10.7 0L54 12c1.8 1 3.2 2.3 4.1 4L33.6 30.2a3.2 3.2 0 0 1-3.2 0Z"
        />
        <path
          fill="#fff"
          d="M34.8 29.5 58 16.2c1 1.5 1.5 3 1.5 4.8v21.5c0 3.7-1.9 7-5.2 9l-16.9 9.7c-2.4 1.4-5.4-.3-5.4-3.1V34.4c0-2 1.1-3.9 2.8-4.9Z"
        />
        <path
          fill="none"
          stroke="#0b365f"
          strokeWidth="3.1"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.5 21c0-4 2-7 5.5-9l16.5-9.3a11 11 0 0 1 10.7 0L54 12c3.5 2 5.5 5 5.5 9v21.5c0 3.7-1.9 7-5.2 9l-16.9 9.7a11 11 0 0 1-10.8 0l-17-9.8a10.3 10.3 0 0 1-5.1-8.9ZM6.1 16l23.4 13.7c1.5.9 3.4.9 5 0L57.9 16M32 31v26.1c0 2.6 1.2 4.4 3.1 4.7"
        />
        <g className="geo-avatar__gaze">
          <g transform="rotate(-29 46 39.4)">
            <g className="geo-avatar__eyes" fill="#0b365f">
              <ellipse cx="40" cy="39.4" rx="2.1" ry="2.8" transform="rotate(52 40 39.4)" />
              <ellipse cx="52" cy="39.4" rx="2.1" ry="2.8" transform="rotate(52 52 39.4)" />
            </g>
          </g>
          <path
            className="geo-avatar__smile"
            fill="none"
            stroke="#0b365f"
            strokeWidth="2.2"
            strokeLinecap="round"
            d="M37.8 43.3c.6-3.4 3.4-5 5.3-3m5.3-2.9c.6-3.4 3.4-5 5.3-3"
          />
        </g>
      </svg>
    </span>
  );
}
