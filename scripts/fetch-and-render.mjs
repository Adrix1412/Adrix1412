import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const USERNAME = process.env.GH_USERNAME;
const TOKEN = process.env.GH_TOKEN;
const DAYS_TO_SHOW = 84;
const FRAME_COUNT = 48;
const WIDTH = 900;
const HEIGHT = 160;
const BASELINE = 140;
const OUTPUT_PATH = "dist/parkour.gif";
const SPRITESHEET_PATH = "assets/itachi-spritesheet.webp";

if (!USERNAME || !TOKEN) {
  throw new Error("GH_USERNAME and GH_TOKEN are required.");
}

if (!existsSync(SPRITESHEET_PATH)) {
  throw new Error(`Missing spritesheet: ${SPRITESHEET_PATH}`);
}

const query = `
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          weeks { contributionDays { contributionCount } }
        }
      }
    }
  }
`;

function runConvert(args) {
  execFileSync("convert", args, { stdio: "pipe" });
}

function barHeight(count, maxCount) {
  return count === 0 ? 4 : Math.max(7, Math.round((count / maxCount) * 70));
}

function barGeometry(index, total) {
  const slotWidth = (WIDTH - 60) / total;
  const width = Math.max(4, Math.min(12, Math.round(slotWidth * 0.55)));
  return {
    width,
    x: Math.round(30 + index * slotWidth + (slotWidth - width) / 2),
  };
}

function buildBackground(counts, target) {
  const maxCount = Math.max(1, ...counts);
  const draw = [`line 15,144 ${WIDTH - 15},144`];

  for (let index = 0; index < counts.length; index += 1) {
    const height = barHeight(counts[index], maxCount);
    const { x, width } = barGeometry(index, counts.length);
    const y = BASELINE - height;
    const color = counts[index] === 0 ? "#173042" : "#4FC3C8";
    draw.push(`fill '${color}' roundrectangle ${x},${y} ${x + width},${y + height} 3,3`);
  }

  runConvert([
    "-size", `${WIDTH}x${HEIGHT}`,
    "xc:#101827",
    "-stroke", "rgba(79,195,200,0.30)",
    "-strokewidth", "1",
    "-draw", draw.join(" "),
    target,
  ]);
}

function renderGif(counts) {
  const workDir = mkdtempSync(join(tmpdir(), "parkour-"));
  const backgroundPath = join(workDir, "background.png");

  try {
    buildBackground(counts, backgroundPath);
    const maxCount = Math.max(1, ...counts);
    const framePaths = [];
    const jumpHeights = [0, 4, 10, 16, 10, 4, 0, 0];

    for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
      const contributionIndex = Math.round((frame / (FRAME_COUNT - 1)) * (counts.length - 1));
      const spriteIndex = frame % 8;
      const barHeightAtPosition = barHeight(counts[contributionIndex], maxCount);
      const { x: barX, width: barWidth } = barGeometry(contributionIndex, counts.length);
      const x = barX + Math.round(barWidth / 2) - 24;
      const y = BASELINE - barHeightAtPosition - 68 - jumpHeights[spriteIndex];
      const spritePath = join(workDir, `sprite-${frame}.png`);
      const framePath = join(workDir, `frame-${String(frame).padStart(2, "0")}.png`);

      runConvert([
        SPRITESHEET_PATH,
        "-crop", `192x210+${spriteIndex * 192}+190`,
        "+repage",
        "-resize", "x68",
        spritePath,
      ]);

      runConvert([backgroundPath, spritePath, "-geometry", `+${x}+${y}`, "-composite", framePath]);
      framePaths.push(framePath);
    }

    mkdirSync("dist", { recursive: true });
    runConvert(["-delay", "6", "-loop", "0", ...framePaths, "-layers", "Optimize", OUTPUT_PATH]);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

async function fetchContributionCounts() {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables: { login: USERNAME } }),
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  if (payload.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(payload.errors)}`);
  }

  return payload.data.user.contributionsCollection.contributionCalendar.weeks
    .flatMap((week) => week.contributionDays)
    .slice(-DAYS_TO_SHOW)
    .map((day) => day.contributionCount);
}

try {
  const counts = await fetchContributionCounts();
  renderGif(counts);
  console.log(`Wrote ${OUTPUT_PATH} from ${counts.length} real contribution days.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
