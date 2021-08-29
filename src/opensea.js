const fetch = require("node-fetch");

const EVENTS_URL = "https://api.opensea.io/api/v1/events";

async function fetchEvents({ source, since, until, pageSize = 300 }) {
  const baseParams = {
    only_opensea: false,
    limit: pageSize,
  };
  if (source.contract != null) {
    baseParams.asset_contract_address = source.contract;
  }
  if (source.slug != null) {
    baseParams.collection_slug = source.slug;
  }
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
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text().catch((e) => "<read failed>");
      throw new Error(`${url}: HTTP ${res.status} ${res.statusText}: ${body}`);
    }
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new Error(
        `${url}: invalid JSON: ${e.message}: ${JSON.stringify(text)}`
      );
    }
    if (typeof json !== "object") {
      throw new Error(`${url}: unexpected response: ${JSON.stringify(json)}`);
    }
    if (json.success == false) {
      throw new Error(`${url}: failure: ${JSON.stringify(json)}`);
    }
    if (!Array.isArray(json.asset_events)) {
      throw new Error(`${url}: missing asset_events: ${JSON.stringify(json)}`);
    }
    const events = json.asset_events;
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
  source,
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

    let events = [];
    try {
      events = await fetchEvents({
        source,
        since: new Date(+since - lookbackMs),
        until,
      });
    } catch (e) {
      console.error(`failed to fetch events: ${e}`);
      // Fall through with `events = []`.
    }

    const newEventIds = new Set();
    for (const event of events) {
      newEventIds.add(event.id);
      if (lastEventIds.has(event.id)) continue;
      try {
        handleEvent(event);
      } catch (e) {
        console.error(`failed to handle ${describeEvent(event)}: ${e}`);
      }
    }
    lastEventIds = newEventIds;
    since = until;
    await sleep(pollMs);
  }
}

function describeEvent(e) {
  if (typeof e !== "object") return `event ${e}`;
  const id = e.id || "?";
  const type = e.event_type || "<unknown event type>";
  const name = (e.asset || {}).name || "<unknown asset>";
  return `event ${id} ("${name}" ${type})`;
}

async function sleep(ms) {
  return new Promise((res) => {
    setTimeout(() => res(), ms);
  });
}

module.exports = { fetchEvents, streamEvents };
