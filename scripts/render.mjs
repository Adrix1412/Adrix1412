// render.mjs â€” pure function: takes daily contribution counts, returns an animated SVG string.
// No network calls here on purpose, so it can be tested in isolation.

export function buildParkourSVG(counts, opts = {}) {
  const {
    width = 900,
    barGap = 6,
    barWidth = 10,
    trackHeight = 160,
    baseline = 140,   // y coordinate of the "ground"
    maxBarHeight = 100,
    bg = "#1e1408",
    barColor = "#2a1c0a",
    barActiveColor = "#C8A96E",
    trackColor = "rgba(200,169,110,.25)",
    charColor = "#4FC3C8",
    duration = 14, // seconds for one full run across all days
  } = opts;

  const n = counts.length;
  const maxCount = Math.max(1, ...counts);

  // --- bars ---
  const barsSVG = counts
    .map((c, i) => {
      const h = c === 0 ? 4 : Math.max(6, Math.round((c / maxCount) * maxBarHeight));
      const x = i * (barWidth + barGap) + 20;
      const y = baseline - h;
      const fill = c === 0 ? barColor : barActiveColor;
      return `<rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="2" fill="${fill}" />`;
    })
    .join("\n    ");

  // --- motion path: hops along the top of each bar ---
  // Build a smooth path visiting the top-center of every bar, with an arc between each.
  let path = "";
  for (let i = 0; i < n; i++) {
    const c = counts[i];
    const h = c === 0 ? 4 : Math.max(6, Math.round((c / maxCount) * maxBarHeight));
    const x = i * (barWidth + barGap) + 20 + barWidth / 2;
    const y = baseline - h - 14; // character floats 14px above the bar top
    if (i === 0) {
      path += `M ${x} ${y} `;
    } else {
      const prevC = counts[i - 1];
      const prevH = prevC === 0 ? 4 : Math.max(6, Math.round((prevC / maxCount) * maxBarHeight));
      const prevX = (i - 1) * (barWidth + barGap) + 20 + barWidth / 2;
      const prevY = baseline - prevH - 14;
      const midX = (prevX + x) / 2;
      const jumpApex = Math.min(prevY, y) - 22; // arc peak above both points
      path += `Q ${midX} ${jumpApex} ${x} ${y} `;
    }
  }

  const totalWidth = n * (barWidth + barGap) + 40;
  const svgWidth = Math.max(width, totalWidth);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${trackHeight}" viewBox="0 0 ${svgWidth} ${trackHeight}">
  <rect width="100%" height="100%" fill="${bg}" />
  <line x1="15" y1="${baseline + 4}" x2="${svgWidth - 15}" y2="${baseline + 4}" stroke="${trackColor}" stroke-width="1" />

  <g>
    ${barsSVG}
  </g>

  <path id="runPath" d="${path.trim()}" fill="none" stroke="none" />

  <g id="runner">
    <g>
      <circle cy="-11" r="5.5" fill="${charColor}" />
      <path d="M -4 -5 L 4 -5 L 6 7 L -6 7 Z" fill="${charColor}" />
      <path d="M -4 6 L -8 14 M 4 6 L 8 14" fill="none" stroke="${charColor}" stroke-width="3" stroke-linecap="round">
        <animate attributeName="d" dur="0.34s" repeatCount="indefinite"
          values="M -4 6 L -8 14 M 4 6 L 8 14;M -4 6 L -1 14 M 4 6 L 11 9;M -4 6 L -8 14 M 4 6 L 8 14" />
      </path>
      <path d="M -5 -2 L -11 3 M 5 -2 L 11 2" fill="none" stroke="${charColor}" stroke-width="2.5" stroke-linecap="round">
        <animate attributeName="d" dur="0.34s" repeatCount="indefinite"
          values="M -5 -2 L -11 3 M 5 -2 L 11 2;M -5 -2 L -10 -5 M 5 -2 L 10 5;M -5 -2 L -11 3 M 5 -2 L 11 2" />
      </path>
      <circle cx="-2" cy="-12" r="0.9" fill="${bg}" />
      <circle cx="2" cy="-12" r="0.9" fill="${bg}" />
      <animateTransform attributeName="transform" type="translate"
        values="0 0; 0 -2; 0 0" keyTimes="0;0.5;1" dur="0.34s" repeatCount="indefinite" />
    </g>
    <animateMotion dur="${duration}s" repeatCount="indefinite" rotate="auto">
      <mpath href="#runPath" />
    </animateMotion>
  </g>
</svg>`;
}
