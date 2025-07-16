export default async function handler(req, res) {
  const CACHE_DURATION = 120000; // 2 mins in ms
  const CACHE_KEY = 'valorant_mmr_cache';
  const PUUID = 'bb5b2ab7-9511-5715-a52f-533016f4f890';
  const API_KEY = process.env.API_KEY;
  const API_URL = `https://api.henrikdev.xyz/valorant/v3/by-puuid/mmr/na/pc/${PUUID}?api_key=${API_KEY}`;

  // Simple in-memory cache (works on serverless if warmed up)
  if (!global._cache) global._cache = {};

  const now = Date.now();
  const cached = global._cache[CACHE_KEY];
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return res.status(200).send(cached.data);
  }

  try {
    const r = await fetch(API_URL);
    const json = await r.json();

    const data = json?.data?.current;

    if (!data) return res.status(500).send('Error getting data');

    const tier = data.tier?.name || 'Unknown';
    const rr = data.rr ?? '?';
    const change = data.last_change ?? 0;
    const gained = change > 0 ? 'gained' : 'lost';
    const changeAbs = Math.abs(change);
    const lb = data.tier?.id > 23 && data.leaderboard_placement?.rank != null
      ? ` and is #${data.leaderboard_placement.rank} on leaderboard`
      : '';

    const output = `${tier} with ${rr}RR, has ${gained} ${changeAbs}RR last match${lb}`;

    global._cache[CACHE_KEY] = {
      timestamp: now,
      data: output
    };

    res.setHeader('Cache-Control', 's-maxage=120'); // CDN cache
    return res.status(200).send(output);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Failed to fetch data');
  }
}
