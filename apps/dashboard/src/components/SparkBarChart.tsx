export function SparkBarChart({ points, height = 140 }: { points: { date: string; count: number }[]; height?: number }) {
  if (points.length === 0) return null;
  const max = Math.max(1, ...points.map((p) => p.count));
  const barWidth = 100 / points.length;

  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
        {points.map((p, i) => {
          const barHeight = (p.count / max) * (height - 4);
          return (
            <rect
              key={p.date}
              x={i * barWidth + barWidth * 0.15}
              y={height - barHeight}
              width={barWidth * 0.7}
              height={barHeight}
              fill="var(--observe)"
              opacity={p.count === 0 ? 0.15 : 0.85}
            >
              <title>
                {p.date}: {p.count.toLocaleString()}
              </title>
            </rect>
          );
        })}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--text-muted)", marginTop: 4 }}>
        <span>{points[0].date}</span>
        {points.length > 1 && <span>{points[points.length - 1].date}</span>}
      </div>
    </div>
  );
}
