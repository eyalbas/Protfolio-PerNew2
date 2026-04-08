
// ⚠️ INVESTING.COM SCRAPER - RISKY & FRAGILE ⚠️
// - Violates terms of service [https://www.investing.com]
// - Breaks when site changes HTML
// - Gets blocked by anti-bot measures
// USE AT YOUR OWN RISK - PAID APIs RECOMMENDED

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json({}, 200);

  try {
    const body = JSON.parse(event.body || "{}");
    const items = Array.isArray(body.items) ? body.items : [];

    async function scrapeSymbol(symbol, exchange) {
      let url;
      if (exchange.toUpperCase() === "TASE") {
        url = `https://www.investing.com/equities/${symbol.toLowerCase()}`;
      } else {
        url = `https://www.investing.com/equities/${symbol.toLowerCase()}`;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1"
      };

      try {
        const resp = await fetch(url, { 
          headers, 
          signal: controller.signal 
        });
        clearTimeout(timeout);

        if (!resp.ok) {
          return { ok: false, symbol, exchange, error: `HTTP ${resp.status}` };
        }

        const html = await resp.text();
        // Try multiple selectors - fragile!
        const priceMatch = html.match(/["']lastPrice["'][:\s]*([0-9,.-]+)/) ||
                          html.match(/class=['"]text-2xl['"].*?([0-9,.-]+)/) ||
                          html.match(/data-test=['"]instrument-header-price['"].*?([0-9,.-]+)/);

        if (!priceMatch) {
          return { ok: false, symbol, exchange, error: "No price found" };
        }

        const priceText = priceMatch[1].replace(/,/g, "");
        const currentPrice = parseFloat(priceText);
        const currency = exchange.toUpperCase() === "TASE" ? "ILS" : "USD";

        await new Promise(r => setTimeout(r, 2000)); // Rate limit

        return {
          ok: true,
          symbol, exchange,
          currentPrice, 
          previousClose: currentPrice, // Fallback
          currency
        };
      } catch (e) {
        clearTimeout(timeout);
        return { ok: false, symbol, exchange, error: e.message };
      }
    }

    const results = await Promise.all(
      items.map(item => scrapeSymbol(item.symbol, item.exchange))
    );

    // USDILS
    let fx;
    try {
      fx = await scrapeSymbol("USDILS", "FOREX");
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
