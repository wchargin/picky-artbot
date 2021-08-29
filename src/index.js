const opensea = require("./opensea");

const ART_BLOCKS_CURATED = "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270";

async function sleep(ms) {
  return new Promise((res) => {
    setTimeout(() => res(), ms);
  });
}

async function streamEvents({ pollMs, lookbackMs }) {
  if (typeof pollMs !== "number") throw new Error(`pollMs: ${pollMs}`);
  if (typeof lookbackMs !== "number")
    throw new Error(`lookbackMs: ${lookbackMs}`);
  let lastEventIds = new Set();
  let since = new Date();
  while (true) {
    await sleep(pollMs);
    const until = new Date();
    lastEventIds = await fetchArtblocksEvents({
      since: new Date(+since - lookbackMs),
      until,
      lastEventIds,
    });
    since = until;
  }
}

async function fetchArtblocksEvents({ since, until, lastEventIds }) {
  const events = await opensea.fetchEvents({
    contract: ART_BLOCKS_CURATED,
    since,
    until,
  });
  for (const event of events) {
    if (lastEventIds.has(event.id)) {
      continue;
    }
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
  return new Set(events.map((e) => e.id));
}

function reportEvent(e) {
  const tokenId = String(e.asset.token_id).padStart(10);
  const type = e.event_type;
  const name = e.asset.name;
  const ts = e.created_date;
  const permalink = e.asset.permalink;
  let descr = "[?]";
  switch (e.event_type) {
    case "offer_entered":
    case "bid_entered":
      descr = `bid ${formatWei(e.bid_amount)}`;
      break;
    case "created":
      descr = `listed for ${formatWei(e.ending_price)}`;
      break;
    case "successful":
      descr = `paid ${formatWei(e.total_price)}`;
      break;
    case "transfer":
      descr = `tx ${e.transaction.transaction_hash}`;
      break;
  }
  console.log(
    `[${e.id}] ${ts} ${type.padEnd(16)} ${descr} on ${tokenId} "${name}"`
  );
}

function formatWei(wei) {
  let bigwei;
  try {
    bigwei = BigInt(wei);
  } catch (e) {
    return "[?] ETH";
  }
  const eth = Number(bigwei / 10n ** 15n) / 10 ** 3;
  return `${eth.toFixed(3)} ETH`;
}

async function main() {
  streamEvents({ pollMs: 5000, lookbackMs: 60000 });
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
