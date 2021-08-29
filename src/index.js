const opensea = require("./opensea");

const ART_BLOCKS_CURATED = "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270";

async function sleep(ms) {
  return new Promise((res) => {
    setTimeout(() => res(), ms);
  });
}

async function streamEvents({ latencyMs }) {
  if (typeof latencyMs !== "number") throw new Error(`latencyMs: ${latencyMs}`);
  let since = new Date();
  while (true) {
    await sleep(latencyMs);
    const until = new Date();
    await fetchArtblocksEvents({ since, until });
    since = until;
  }
}

async function fetchArtblocksEvents({ since, until }) {
  const events = await opensea.fetchEvents({
    contract: ART_BLOCKS_CURATED,
    since,
    until,
  });
  for (const event of events) {
    try {
      reportEvent(event);
    } catch (e) {
      console.error(
        `failed to report on ${
          typeof event === "object" ? event.id : "event"
        }: ${e}`
      );
    }
  }
}

function reportEvent(e) {
  const tokenId = String(e.asset.token_id).padStart(10);
  const ts = e.created_date;
  const permalink = e.asset.permalink;
  let descr = "[?]";
  switch (e.event_type) {
    case "offer_entered":
      descr = `bid ${formatWei(e.bid_amount)}`;
      break;
    case "created":
      descr = `listed for ${formatWei(e.ending_price)}`;
      break;
    case "successful":
      descr = `paid ${formatWei(e.bid_amount)}`;
      break;
  }
  console.log(
    `[${e.id}] ${ts} ${tokenId}: ${e.event_type.padEnd(20)} | ${descr}`
  );
}

function formatWei(wei) {
  const eth = Number(BigInt(wei) / 10n ** 15n) / 10 ** 3;
  return `${eth.toFixed(3)} ETH`;
}

async function main() {
  streamEvents({ latencyMs: 5000 });
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
