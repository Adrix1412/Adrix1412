// fetch-and-render.mjs â€” pulls the real contribution calendar via GitHub's GraphQL API
// and writes the animated parkour SVG to dist/parkour.svg

import { writeFileSync, mkdirSync } from "fs";
import { buildParkourSVG } from "./render.mjs";

const USERNAME = process.env.GH_USERNAME;
const TOKEN = process.env.GH_TOKEN; // needs a PAT with "read:user" scope â€” see workflow comments
const DAYS_TO_SHOW = 84; // last ~12 weeks; a full year makes the bars unreadably thin

if (!USERNAME || !TOKEN) {
  console.error("Missing GH_USERNAME or GH_TOKEN environment variables.");
  process.exit(1);
}

const query = `
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

async function main() {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables: { login: USERNAME } }),
  });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(json.errors)}`);
  }

  const weeks = json.data.user.contributionsCollection.contributionCalendar.weeks;
  const allDays = weeks.flatMap((w) => w.contributionDays);
  const lastNDays = allDays.slice(-DAYS_TO_SHOW);
  const counts = lastNDays.map((d) => d.contributionCount);

  const svg = buildParkourSVG(counts);

  mkdirSync("dist", { recursive: true });
  writeFileSync("dist/parkour.svg", svg);
  console.log(`Wrote dist/parkour.svg using ${counts.length} days of data.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
