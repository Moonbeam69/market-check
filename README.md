# Market Check

Mobile-first produce comparison app. Run `npm start`, then open http://localhost:3000. No dependencies or API keys required. Deploy as a free Render Node web service using render.yaml (or build `npm install --omit=dev`, start `npm start`).

Take a price-label photo, enter/confirm product, GBP price and selling unit, then compare. Price cards show a recommendation and savings against the market. Choose a matching retailer product before comparing; enter checked prices if retrieval is unavailable. Pack comparisons require a weight or count. Photos remain in the browser and are not uploaded. Saved comparisons use localStorage.

The backend queries all three retailer search pages and reads publicly available Product JSON-LD, including a bounded number of linked product pages. It does not bypass anti-bot challenges. Retailers can block requests or render results only in JavaScript; automatic prices may therefore be unavailable. This version does not guarantee live price coverage and requires manually entered label details (photo capture does not identify produce or transcribe the label). Product matching, quality and eligibility for offers must be confirmed by the shopper. No prices are invented or bundled as live data.

Checks: `node pricing.test.mjs` (unit conversions, invalid/missing quantities, structured price extraction). Only standard GBP offers are accepted. HTTP retrieval has host restrictions, timeouts, response-size limits and a five-minute cache. A free Render instance may take time to wake up.
