export async function handler(event) {
  try {
    const body = JSON.parse(event.body || '{}');
    const apiKey = String(body.apiKey || '').trim();
    const items = Array.isArray(body.items) ? body.items : [];
    if (!apiKey) return json({ error: 'Missing EODHD API key' }, 400);

    async function fetchJson(url) {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    }

    function symbolFor(exchange, symbol) {
      return `${String(symbol || '').trim().toUpperCase()}.${String(exchange || '').toUpperCase() === 'TASE' ? 'TA' : 'US'}`;
    }

    async function quote(exchange, symbol) {
      const full = symbolFor(exchange, symbol);
      const url = `https://eodhd.com/api/real-time/${encodeURIComponent(full)}?api_token=${encodeURIComponent(apiKey)}&fmt=json`;
      const data = await fetchJson(url);
      const currentPrice = Number(data.close ?? data.last ?? data.price ?? 0);
      const previousClose = Number(data.previousClose ?? data.prev_close ?? data.previous_close ?? data.close ?? 0);
      const currency = String(data.currency || (String(exchange).toUpperCase() === 'TASE' ? 'ILS' : 'USD')).toUpperCase();
      if (!currentPrice) throw new Error('No current price returned');
      return { ok: true, symbol, exchange, eodhdSymbol: full, currentPrice, previousClose: previousClose || currentPrice, currency, timestamp: data.timestamp || null };
    }

    async function usdIls() {
      const full = 'USDILS.FOREX';
      const url = `https://eodhd.com/api/real-time/${encodeURIComponent(full)}?api_token=${encodeURIComponent(apiKey)}&fmt=json`;
      const data = await fetchJson(url);
      const rate = Number(data.close ?? data.last ?? data.price ?? 0);
      if (!rate) throw new Error('No USD/ILS rate returned');
      return { symbol: full, rate, timestamp: data.timestamp || null };
    }

    const results = await Promise.all(items.map(async item => {
      try {
        return await quote(item.exchange, item.symbol);
      } catch (error) {
        return { ok: false, symbol: item.symbol, exchange: item.exchange, eodhdSymbol: symbolFor(item.exchange, item.symbol), error: error.message };
      }
    }));

    let fx;
    try { fx = await usdIls(); } catch (error) { fx = { error: error.message }; }
    return json({ results, fx });
  } catch (error) {
    return json({ error: error.message || 'Unexpected error' }, 500);
  }
}

function json(body, status = 200) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    },
    body: JSON.stringify(body)
  };
}
