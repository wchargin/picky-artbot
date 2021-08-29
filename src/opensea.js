const fetch = require("node-fetch");

const EVENTS_URL = "https://api.opensea.io/api/v1/events";

async function fetchEvents({ contract, since, until, pageSize = 300 }) {
  const baseParams = {
    asset_contract_address: contract,
    only_opensea: false,
    limit: pageSize,
    occurred_after: Math.floor(since / 1000),
    occurred_before: Math.floor(until / 1000),
  };

  const results = [];
  let offset = 0;
  while (true) {
    const params = { ...baseParams, offset };
    const url = `${EVENTS_URL}?${String(new URLSearchParams(params))}`;
    const res = await fetch(url).then((res) => res.json());
    if (typeof res !== "object") {
      throw new Error(`Unexpected response: ${JSON.stringify(res)}`);
    }
    if (res.success == false) {
      throw new Error(`Failure: ${JSON.stringify(res)}`);
    }
    if (!Array.isArray(res.asset_events)) {
      throw new Error(`Missing asset_events: ${JSON.stringify(res)}`);
    }
    const events = res.asset_events;
    results.push(...events);
    if (events.length < pageSize) {
      break;
    }
  }

  return results;
}

module.exports = { fetchEvents };
