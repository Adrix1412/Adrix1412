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
    <circle r="7" fill="${charColor}" />
    <circle cx="-3" cy="-2" r="1.4" fill="${bg}" />
    <circle cx="3" cy="-2" r="1.4" fill="${bg}" />
    <animateMotion dur="${duration}s" repeatCount="indefinite" rotate="auto">
      <mpath href="#runPath" />
    </animateMotion>
    <animateTransform attributeName="transform" type="scale" additive="sum"
      values="1 1; 1.15 0.85; 1 1" keyTimes="0;0.5;1" dur="0.4s" repeatCount="indefinite" />
  </g>
</svg>`;
}
