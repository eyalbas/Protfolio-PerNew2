export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return json({}, 200);
  try {
    const body = JSON.parse(event.body || '{}');
    const apiKey = String(body.apiKey || '').trim();
    const items = Array.isArray(body.items) ? body.items : [];
    if (!apiKey) return json({ error: 'Missing Twelve Data API key' }, 400);

    async function fetchJson(url) {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (data && data.status === 'error') throw new Error(data.message || 'API error');
      return data;
    }

    function securityType(exchange) {
      return String(exchange || '').toUpperCase() === 'TASE' ? 'TASE' : 'NASDAQ';
    }

    function symbolFor(exchange, symbol) {
      return `${String(symbol || '').trim().toUpperCase()}:${securityType(exchange)}`;
    }

    async function quote(exchange, symbol) {
      const full = symbolFor(exchange, symbol);
      const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(full)}&apikey=${encodeURIComponent(apiKey)}`;
      const data = await fetchJson(url);
      const currentPrice = Number(data.close ?? data.price ?? 0);
      const previousClose = Number(data.previous_close ?? 0);
      const currency = String(data.currency || (String(exchange).toUpperCase() === 'TASE' ? 'ILS' : 'USD')).toUpperCase();
      if (!currentPrice) throw new Error('No current price returned');
      return { ok: true, symbol, exchange, quoteSymbol: full, currentPrice, previousClose: previousClose || currentPrice, currency, timestamp: data.timestamp || null };
    }

    async function usdIls() {
      const direct = 'USD/ILS';
      try {
        const data = await fetchJson(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(direct)}&apikey=${encodeURIComponent(apiKey)}`);
        const rate = Number(data.close ?? data.price ?? 0);
        if (!rate) throw new Error('No USD/ILS rate returned');
        return { symbol: direct, rate, timestamp: data.timestamp || null };
      } catch (err) {
        const inverse = 'ILS/USD';
        const data = await fetchJson(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(inverse)}&apikey=${encodeURIComponent(apiKey)}`);
        const inverseRate = Number(data.close ?? data.price ?? 0);
        if (!inverseRate) throw new Error('No USD/ILS rate returned');
        return { symbol: inverse, rate: 1 / inverseRate, timestamp: data.timestamp || null, inverted: true };
      }
    }

    const results = await Promise.all(items.map(async item => {
      try {
        return await quote(item.exchange, item.symbol);
      } catch (error) {
        return { ok: false, symbol: item.symbol, exchange: item.exchange, quoteSymbol: symbolFor(item.exchange, item.symbol), error: error.message };
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
