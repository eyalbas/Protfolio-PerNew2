
export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, body: "" };

  try {
    const body = JSON.parse(event.body || "{}");
    const items = Array.isArray(body.items) ? body.items : [];

    async function scrapeQuote(symbol, exchange) {
      let url;
      if (["TASE"].includes(exchange.toUpperCase())) {
        url = `https://www.investing.com/equities/${symbol.toLowerCase()}`;
      } else {
        url = `https://www.investing.com/equities/${symbol.toLowerCase()}`;
      }

      const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5"
      };

      try {
        const resp = await fetch(url, { headers });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const html = await resp.text();
        const priceMatch = html.match(/([0-9,]+\.?[0-9]*)/);
        if (!priceMatch) throw new Error("No price");

        const currentPrice = parseFloat(priceMatch[1].replace(",", ""));
        const currency = exchange.toUpperCase() === "TASE" ? "ILS" : "USD";

        await new Promise(r => setTimeout(r, 1500));

        return { ok: true, symbol, exchange, currentPrice, previousClose: currentPrice, currency };
      } catch (e) {
        return { ok: false, symbol, exchange, error: e.message };
      }
    }

    const results = await Promise.all(items.map(item => scrapeQuote(item.symbol, item.exchange)));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ results })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}
