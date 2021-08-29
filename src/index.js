const opensea = require("./opensea");

const ART_BLOCKS_CURATED = "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270";

async function main() {
  const now = new Date();
  const fiveSecondsAgo = new Date(now - 5000);
  const events = await opensea.fetchEvents({
    contract: ART_BLOCKS_CURATED,
    since: fiveSecondsAgo,
    until: now,
  });
  console.log(events);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
