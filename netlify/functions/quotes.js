export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json({}, 200);
  try {
    const body = JSON.parse(event.body || "{}");
    const items = Array.isArray(body.items) ? body.items : [];

    async function yahooQuote(symbol, exchange) {
      let ysym = symbol;
      if (exchange.toUpperCase() === "TASE") ysym += ".TA";
      else if (exchange.toUpperCase() === "FOREX") ysym = "USDILS=X";

      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ysym}`;

      const resp = await fetch(url);
      const data = await resp.json();
      const meta = data.chart?.result?.[0]?.meta || {};
      const current = meta.regularMarketPrice || 0;
      const prev = meta.regularMarketPreviousClose || current;
      const currency = exchange === "TASE" ? "ILS" : "USD";

      if (!current) return { ok: false, symbol, exchange, error: "No price" };

      return { ok: true, symbol, exchange, currentPrice: current, previousClose: prev, currency };
    }

    const results = await Promise.all(items.map(item => yahooQuote(item.symbol, item.exchange)));

    let fx;
    try {
      fx = await yahooQuote("USDILS", "FOREX");
    } catch (e) {
      fx = { error: e.message };
    }

    return json({ results, fx });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

function json(body, status = 200) {
  return {
    statusCode: status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    },
    body: JSON.stringify(body)
  };
}
