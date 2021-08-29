const fetch = require("node-fetch");

const EVENTS_URL = "https://api.opensea.io/api/v1/events";

async function fetchEvents({ contract, since, until, pageSize = 300 }) {
  const baseParams = {
    asset_contract_address: contract,
    only_opensea: false,
    limit: pageSize,
  };
  if (since != null) {
    baseParams.occurred_after = Math.floor(since / 1000);
  }
  if (until != null) {
    baseParams.occurred_before = Math.floor(until / 1000);
  }

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
    } else {
      offset += events.length;
    }
  }

  results.sort((a, b) => {
    const ta = a.created_date;
    const tb = b.created_date;
    return ta > tb ? 1 : ta < tb ? -1 : 0;
  });

  return results;
}

async function streamEvents({
  contract,
  pollMs,
  lookbackMs,
  handleEvent,
  pageSize = 300,
}) {
  if (typeof pollMs !== "number") {
    throw new Error(`pollMs: ${pollMs}`);
  }
  if (typeof lookbackMs !== "number") {
    throw new Error(`lookbackMs: ${lookbackMs}`);
  }

  let lastEventIds = new Set();
  let since = new Date();
  while (true) {
    const until = new Date();

    const events = await fetchEvents({
      contract,
      since: new Date(+since - lookbackMs),
      until,
    });
    const newEventIds = new Set();
    for (const event of events) {
      newEventIds.add(event.id);
      if (lastEventIds.has(event.id)) continue;
      try {
        handleEvent(event);
      } catch (e) {
        console.error(
          `failed to handle ${
            typeof event === "object" ? event.id : "event"
          }: ${e}`
        );
      }
    }
    lastEventIds = newEventIds;
    since = until;
    await sleep(pollMs);
  }
}

async function sleep(ms) {
  return new Promise((res) => {
    setTimeout(() => res(), ms);
  });
}

module.exports = { fetchEvents, streamEvents };
