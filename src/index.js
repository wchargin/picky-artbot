const artblocks = require("./artblocks");
const opensea = require("./opensea");

const ART_BLOCKS = "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270";

const WATCHED_PROJECT_ID = 28; // Apparitions; tends to see a fair amount of offer_created traffic

function reportEvent(e) {
  const projectId = artblocks.tokenIdToProjectId(e.asset.token_id);
  if (projectId !== WATCHED_PROJECT_ID) return;
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
  opensea.streamEvents({
    contract: ART_BLOCKS,
    pollMs: 5000,
    lookbackMs: 60000,
    handleEvent: reportEvent,
  });
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
