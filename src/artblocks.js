const CONTRACT_ADDRESS = "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270";
const COLLECTION_SLUGS = Object.freeze([
  "art-blocks",
  "art-blocks-curated",
  "art-blocks-factory",
]);

function tokenIdToProjectId(tokenId) {
  return Number(BigInt(tokenId) / 1_000_000n);
}

module.exports = { CONTRACT_ADDRESS, COLLECTION_SLUGS, tokenIdToProjectId };
