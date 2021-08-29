function tokenIdToProjectId(tokenId) {
  return Number(BigInt(tokenId) / 1_000_000n);
}

module.exports = { tokenIdToProjectId };
