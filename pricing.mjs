export function normalise(price, unit, amount=1, packUnit='g') {
  price=Number(price); amount=Number(amount);
  if(!Number.isFinite(price)||price<=0) return null;
  if(unit==='kg') return {value:price,basis:'kg'};
  if(unit==='lb') return {value:price/0.45359237,basis:'kg'};
  if(unit==='100g') return {value:price*10,basis:'kg'};
  if(unit==='each') return {value:price,basis:'each'};
  if(unit!=='pack'||!Number.isFinite(amount)||amount<=0) return null;
  if(packUnit==='items') return {value:price/amount,basis:'each'};
  if(!['g','kg'].includes(packUnit)) return null;
  return {value:price/(amount*(packUnit==='g'?0.001:1)),basis:'kg'};
}
export function extractProducts(html, base) {
  const found=[];
  function visit(x) {
    if(!x||typeof x!=='object')return;
    if((x['@type']==='Product'||x['@type']?.includes?.('Product'))&&x.name) {
      const offers=Array.isArray(x.offers)?x.offers:[x.offers];
      for(const o of offers) if(o&&o.priceCurrency==='GBP'&&Number(o.price)>0) {
        let url;try{url=new URL(o.url||x.url||base,base).href}catch{continue}
        const sizeText=html.match(/<span\b[^>]*class=["'][^"']*ProductSize_size[^"']*["'][^>]*>([^<]+)<\/span>/i)?.[1]||'';
        const label=String(x.name)+' '+sizeText;
        const size=label.match(/(\d+(?:\.\d+)?)\s*(kg|g)\b/i);
        const count=label.match(/\b(\d+)\s*(?:pack|each|pcs|s)\b/i);
        found.push({name:label.trim(),price:Number(o.price),url,unit:'pack',amount:size?Number(size[1]):count?Number(count[1]):null,packUnit:size?size[2].toLowerCase():count?'items':null,availability:o.availability||null});
      }
    }
    for(const value of Object.values(x)) if(value&&typeof value==='object') {if(Array.isArray(value))value.forEach(visit);else visit(value)}
  }
  for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))try{visit(JSON.parse(m[1]))}catch{}
  return found.filter((p,i,a)=>a.findIndex(q=>q.name===p.name&&q.price===p.price)===i);
}
