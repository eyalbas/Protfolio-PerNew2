export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return json({}, 200);
  try {
    const body = JSON.parse(event.body || '{}');
    const items = Array.isArray(body.items) ? body.items : [];

    async function scrapeQuote(symbol, exchange) {
      const path = String(symbol || '').trim().toLowerCase();
      const url = exchange === 'FOREX'
        ? 'https://www.investing.com/currencies/usd-ils'
        : `https://www.investing.com/equities/${path}`;
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'text/html,application/xhtml+xml'
          }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const match = html.match(/(?:lastPrice|instrument-header-price|text-2xl[^>]*>).*?([0-9,]+(?:\.[0-9]+)?)/i);
        if (!match) throw new Error('No price found');
        const currentPrice = Number(String(match[1]).replace(/,/g, ''));
        if (!currentPrice) throw new Error('Invalid price');
        const currency = exchange === 'TASE' ? 'ILS' : 'USD';
        return { ok: true, symbol, exchange, currentPrice, previousClose: currentPrice, currency };
      } catch (error) {
        return { ok: false, symbol, exchange, error: error.message };
      }
    }

    const results = [];
    for (const item of items) {
      results.push(await scrapeQuote(item.symbol, item.exchange));
      await new Promise(r => setTimeout(r, 1200));
    }

    let fx;
    try { fx = await scrapeQuote('USDILS', 'FOREX'); } catch (error) { fx = { error: error.message }; }
    return json({ results, fx }, 200);
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
