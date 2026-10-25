import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {extractProducts} from './pricing.mjs';
const retailers=[
 {name:'Waitrose',host:'www.waitrose.com',search:q=>`https://www.waitrose.com/ecom/shop/search?searchTerm=${encodeURIComponent(q)}`,path:/\/ecom\/products\//},
 {name:"Sainsbury’s",host:'www.sainsburys.co.uk',search:q=>`https://www.sainsburys.co.uk/gol-ui/SearchResults/${encodeURIComponent(q)}`,path:/\/gol-ui\/product\//},
 {name:'Tesco',host:'www.tesco.com',search:q=>`https://www.tesco.com/groceries/en-GB/search?query=${encodeURIComponent(q)}`,path:/\/groceries\/en-GB\/products\//}
];
const cache=new Map();
async function page(url,host){
 const u=new URL(url);if(u.protocol!=='https:'||u.hostname!==host)throw Error('Invalid source');
 const res=await fetch(u,{redirect:'manual',headers:{'User-Agent':'MarketCheck/1.0 (produce price comparison)','Accept':'text/html'},signal:AbortSignal.timeout(9000)});
 if(!res.ok)throw Error('Retailer did not provide accessible data');
 const reader=res.body.getReader();let bytes=0,chunks=[];
 while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>4e6){await reader.cancel();throw Error('Response too large')}chunks.push(Buffer.from(value))}
 return Buffer.concat(chunks).toString();
}
async function search(r,q){
 const searchUrl=r.search(q),key=r.name+q.toLowerCase();
 const cached=cache.get(key);if(cached&&Date.now()-cached.time<300000)return cached.result;
 const checkedAt=new Date().toISOString();let products=[],status='unavailable';
 try {
  const html=await page(searchUrl,r.host);products=extractProducts(html,searchUrl);
  const links=[];
  for(const m of html.matchAll(/href=["']([^"']+)["']/gi))try{const u=new URL(m[1].replaceAll('&amp;','&'),searchUrl);if(u.hostname===r.host&&r.path.test(u.pathname)&&!links.includes(u.href))links.push(u.href)}catch{}
  if(!products.length){const results=await Promise.allSettled(links.slice(0,3).map(async u=>extractProducts(await page(u,r.host),u)));products=results.flatMap(x=>x.status==='fulfilled'?x.value:[])}
  const words=q.toLowerCase().split(/\s+/).filter(Boolean);
  products=products.filter(p=>{try{return new URL(p.url).hostname===r.host&&words.every(w=>p.name.toLowerCase().includes(w))&&!/OutOfStock|Discontinued/.test(p.availability||'')}catch{return false}}).slice(0,8);
  if(products.length)status='found';
 }catch{}
 const result={retailer:r.name,searchUrl,checkedAt,status,products,message:products.length?'Confirm variety, quality and pack size before comparing.':'Automatic price unavailable. Open retailer search or enter a checked price.'};
 if(cache.size>200)cache.clear();cache.set(key,{time:Date.now(),result});return result;
}
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
 try{
  const url=new URL(req.url,'http://localhost');
  if(req.method!=='GET'){res.writeHead(405);return res.end()}
  if(url.pathname==='/health'){res.writeHead(200);return res.end('ok')}
  if(url.pathname==='/api/search'){
   const q=(url.searchParams.get('q')||'').trim();if(q.length<2||q.length>80){res.writeHead(400);return res.end('Product must be 2–80 characters')}
   res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');return res.end(JSON.stringify({results:await Promise.all(retailers.map(r=>search(r,q)))}));
  }
  const files={'/':'index.html','/index.html':'index.html','/app.mjs':'app.mjs','/pricing.mjs':'pricing.mjs'};
  if(!files[url.pathname]){res.writeHead(404);return res.end('Not found')}
  res.setHeader('Content-Type',url.pathname.endsWith('.mjs')?'text/javascript; charset=utf-8':'text/html; charset=utf-8');res.end(await readFile(new URL(files[url.pathname],import.meta.url)));
 }catch{res.writeHead(500);res.end('Please try again')}
});
server.listen(process.env.PORT||3000,'0.0.0.0');
