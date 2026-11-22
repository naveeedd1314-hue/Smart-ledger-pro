import { useMemo, useState } from "react";

type Row = Record<string, any>;
const read = (key:string):Row[] => {
  try {
    const v=JSON.parse(localStorage.getItem(key)||"[]");
    return Array.isArray(v)?v:[];
  } catch { return []; }
};
const n=(...values:any[]):number=>{
  for(const v of values){const x=Number(v);if(Number.isFinite(x)&&v!==null&&v!=="")return x;}
  return 0;
};
const money=(v:number)=>"₹"+v.toLocaleString("en-IN",{maximumFractionDigits:2});
const sum=(a:number[])=>a.reduce((x,y)=>x+y,0);
const field=(o:Row,...keys:string[])=>{for(const k of keys)if(o?.[k]!==undefined&&o[k]!==null)return o[k];return undefined;};

function analyse(){
 const products=read("smartledger-products");
 const bills=read("smartledger-pro-sales");
 const purchases=read("smartledger-pro-purchases");
 const payments=read("smartledger-pro-payments");
 const expenses=read("smartledger-pro-expenses");
 const returns=read("smartledger-pro-returns");
 const customers=read("smartledger-pro-customers");
 const suppliers=read("smartledger-pro-suppliers");
 const stockValue= sum(products.map(p=>Math.max(0,n(field(p,"stock","quantity","qty")))*n(field(p,"averageCost","purchase","purchasePrice","cost"))));
 const productRows=products.map(p=>{
  const cost=n(field(p,"averageCost","purchase","purchasePrice","cost"));
  const retail=n(field(p,"selling","price","sellingPrice","salePrice","retail"));
  const wholesale=n(field(p,"wholesale","wholesalePrice"));
  const stock=n(field(p,"stock","quantity","qty"));
  return {name:String(field(p,"name","productName","title")||"Unnamed product"),cost,lastPurchase:n(field(p,"purchase","lastPurchaseRate")),retail,wholesale,stock,profit:retail-cost,margin:retail>0?(retail-cost)/retail*100:0};
 });
 const known=productRows.filter(p=>p.cost>0&&p.retail>0);
 const low=productRows.filter(p=>p.stock<=5&&p.stock>=0);
 const negative=productRows.filter(p=>p.stock<0);
 const sales=sum(bills.map(b=>n(field(b,"taxableValue","total","grandTotal","netTotal","amount","totalAmount"))));
 const expenseTotal=sum(expenses.map(e=>n(field(e,"amount","total","value"))));
 const purchaseTotal=sum(purchases.map(p=>n(field(p,"total","grandTotal","amount","totalAmount"))));
 const collected=sum(payments.filter(p=>field(p,"type")==="Customer Receipt").map(p=>n(field(p,"amount"))));
 const supplierPaid=sum(payments.filter(p=>field(p,"type")==="Supplier Payment").map(p=>n(field(p,"amount"))));
 const salesReturnCredit=sum(returns.filter(x=>x.type==="Sales Return").map(x=>n(field(x,"totalAmount","amount"))));
 const purchaseReturnCredit=sum(returns.filter(x=>x.type==="Purchase Return").map(x=>n(field(x,"totalAmount","amount"))));
 const receivable=Math.max(0,sum(customers.map(c=>n(field(c,"opening","balance","outstanding","closingBalance","due"))))+sum(bills.map(b=>field(b,"total","grandTotal")!==undefined?Math.max(0,n(field(b,"total","grandTotal"))-n(field(b,"paid"))):n(field(b,"balance"))))-collected-salesReturnCredit);
 const payable=Math.max(0,sum(suppliers.map(s=>n(field(s,"opening","balance","outstanding","closingBalance","due"))))+sum(purchases.map(p=>field(p,"total","grandTotal","amount")!==undefined?Math.max(0,n(field(p,"total","grandTotal","amount"))-n(field(p,"paid"))):n(field(p,"balance"))))-supplierPaid-purchaseReturnCredit);
 const missingCost=productRows.filter(p=>p.retail>0&&p.cost<=0);
 const marginAvg=known.length?sum(known.map(p=>p.margin))/known.length:0;
 let targetMargin=3.5;try{const settings=JSON.parse(localStorage.getItem("smartledger-pro-settings")||"{}");const value=Number(settings.targetMarginPercent);if(Number.isFinite(value)&&value>=0&&value<=100)targetMargin=value;}catch{}
 const belowTargetMargin=known.filter(p=>p.margin<targetMargin);
 const invoiceProfit=bills.map(b=>{const qty=n(field(b,"qty","quantity"));const rate=n(field(b,"rate","sellingPrice"));const revenue=field(b,"taxableValue")!==undefined?n(field(b,"taxableValue")):qty*rate;const rawCost=field(b,"purchasePrice");const hasCost=rawCost!==undefined&&rawCost!==null&&rawCost!==""&&Number.isFinite(Number(rawCost))&&Number(rawCost)>0;return {profit:revenue-(hasCost?qty*Number(rawCost):0),hasCost};});
 const returnProfit=returns.filter(x=>x.type==="Sales Return").map(x=>{const rawCost=field(x,"purchasePrice");const hasCost=rawCost!==undefined&&rawCost!==null&&rawCost!==""&&Number.isFinite(Number(rawCost))&&Number(rawCost)>0;return {profit:(n(field(x,"rate"))-Number(rawCost||0))*n(field(x,"qty","quantity")),hasCost};});
 const knownGrossProfit=sum(invoiceProfit.filter(x=>x.hasCost).map(x=>x.profit))-sum(returnProfit.filter(x=>x.hasCost).map(x=>x.profit));
 const customerProfitMap=new Map<string,{revenue:number;profit:number;invoices:number;missingCost:number}>();
 bills.forEach(b=>{const name=String(field(b,"customer","party")||"Walk-in Customer");const qty=n(field(b,"qty","quantity"));const rate=n(field(b,"rate","sellingPrice"));const revenue=field(b,"taxableValue")!==undefined?n(field(b,"taxableValue")):qty*rate;const rawCost=field(b,"purchasePrice");const hasCost=rawCost!==undefined&&rawCost!==null&&rawCost!==""&&Number.isFinite(Number(rawCost))&&Number(rawCost)>0;const row=customerProfitMap.get(name)||{revenue:0,profit:0,invoices:0,missingCost:0};row.revenue+=revenue;row.invoices++;if(hasCost)row.profit+=revenue-qty*Number(rawCost);else row.missingCost++;customerProfitMap.set(name,row);});
 returns.filter(x=>x.type==="Sales Return").forEach(item=>{const name=String(field(item,"party")||"Walk-in Customer");const row=customerProfitMap.get(name)||{revenue:0,profit:0,invoices:0,missingCost:0};const rawCost=field(item,"purchasePrice");const hasCost=rawCost!==undefined&&rawCost!==null&&rawCost!==""&&Number.isFinite(Number(rawCost))&&Number(rawCost)>0;row.revenue-=n(field(item,"amount"));if(hasCost)row.profit-=(n(field(item,"rate"))-Number(rawCost))*n(field(item,"qty","quantity"));else row.missingCost++;customerProfitMap.set(name,row);});
 const customerProfitRows=Array.from(customerProfitMap.entries()).map(([name,row])=>({name,...row})).sort((a,b)=>b.profit-a.profit);
 const customerBalanceMap=new Map<string,{name:string;amount:number}>();
 const supplierBalanceMap=new Map<string,{name:string;amount:number}>();
 const addBalance=(map:Map<string,{name:string;amount:number}>,rawName:unknown,amount:number)=>{const name=String(rawName||"").trim();if(!name)return;const key=name.toLowerCase();const row=map.get(key)||{name,amount:0};row.amount+=amount;map.set(key,row);};
 customers.forEach(x=>addBalance(customerBalanceMap,field(x,"name"),n(field(x,"opening","balance","outstanding","due"))));
 bills.forEach(x=>{const total=field(x,"total","grandTotal");addBalance(customerBalanceMap,field(x,"customer","party"),total!==undefined?Math.max(0,n(total)-n(field(x,"paid"))):n(field(x,"balance")));});
 payments.filter(x=>x.type==="Customer Receipt").forEach(x=>addBalance(customerBalanceMap,x.party,-n(field(x,"amount"))));
 returns.filter(x=>x.type==="Sales Return").forEach(x=>addBalance(customerBalanceMap,x.party,-n(field(x,"totalAmount","amount"))));
 suppliers.forEach(x=>addBalance(supplierBalanceMap,field(x,"name"),n(field(x,"opening","balance","outstanding","due"))));
 purchases.forEach(x=>{const total=field(x,"total","grandTotal","amount");addBalance(supplierBalanceMap,field(x,"supplier"),total!==undefined?Math.max(0,n(total)-n(field(x,"paid"))):n(field(x,"balance")));});
 payments.filter(x=>x.type==="Supplier Payment").forEach(x=>addBalance(supplierBalanceMap,x.party,-n(field(x,"amount"))));
 returns.filter(x=>x.type==="Purchase Return").forEach(x=>addBalance(supplierBalanceMap,x.party,-n(field(x,"totalAmount","amount"))));
 const customerDueRows=Array.from(customerBalanceMap.values()).map(x=>({...x,due:Math.max(0,x.amount)})).filter(x=>x.due>0).sort((a,b)=>b.due-a.due);
 const supplierDueRows=Array.from(supplierBalanceMap.values()).map(x=>({...x,due:Math.max(0,x.amount)})).filter(x=>x.due>0).sort((a,b)=>b.due-a.due);
 const missingCostInvoices=invoiceProfit.filter(x=>!x.hasCost).length;
 const returnsMissingCost=returnProfit.filter(x=>!x.hasCost).length;
 const estimatedAfterExpenses=knownGrossProfit-expenseTotal;
 const marketQuotes=read("smartledger-market-quotes");
 const manualPriceHistory=read("smartledger-pro-price-history");
 const rateRecords=[
  ...purchases.filter(p=>n(field(p,"rate","purchaseRate"))>0&&field(p,"date")).map(p=>({key:String(field(p,"productId","product")||field(p,"productName","product")||"unknown"),name:String(field(p,"product","productName")||"Unknown product"),rate:n(field(p,"rate","purchaseRate")),date:String(p.date).slice(0,10),source:String(field(p,"supplier")||"Supplier"),sortAt:String(field(p,"id")||p.date),kind:"Supplier purchase"})),
  ...bills.filter(p=>n(field(p,"rate","sellingPrice"))>0&&field(p,"date")).map(p=>({key:String(field(p,"productId","product")||field(p,"productName","product")||"unknown"),name:String(field(p,"product","productName")||"Unknown product"),rate:n(field(p,"rate","sellingPrice")),date:String(p.date).slice(0,10),source:`Sales invoice ${String(field(p,"invoice")||"")}`,sortAt:String(field(p,"invoice")||p.date),kind:"Recorded selling rate"})),
  ...marketQuotes.filter(p=>n(field(p,"marketRate"))>0&&field(p,"checkedAt")).map(p=>({key:String(field(p,"productId","productName")||"unknown"),name:String(field(p,"productName")||"Unknown product"),rate:n(field(p,"marketRate")),date:String(p.checkedAt).slice(0,10),source:String(field(p,"source")||"Market source"),sortAt:String(field(p,"savedAt")||p.checkedAt),kind:"Market quotation"})),
  ...manualPriceHistory.filter(p=>n(field(p,"newPrice"))>0&&field(p,"date")).map(p=>({key:String(field(p,"productId","productName")||"unknown"),name:String(field(p,"productName")||"Unknown product"),rate:n(field(p,"newPrice")),date:String(p.date).slice(0,10),source:String(field(p,"source")||"Manual price update"),sortAt:String(field(p,"savedAt")||p.date),kind:field(p,"field")==="purchase"?"Latest purchase rate update":"Retail price update"}))
 ];
 const rateGroups=new Map<string,typeof rateRecords>();
 rateRecords.forEach(p=>{const key=p.kind+"|"+p.key;if(!rateGroups.has(key))rateGroups.set(key,[]);rateGroups.get(key)!.push(p);});
 const rateMovements=Array.from(rateGroups.values()).map(rows=>{const sorted=[...rows].sort((a,b)=>a.date.localeCompare(b.date)||String(a.sortAt||'').localeCompare(String(b.sortAt||'')));const previous=sorted.length>1?sorted[sorted.length-2]:null;const latest=sorted[sorted.length-1];return {...latest,previous:previous?.rate??null,change:previous?latest.rate-previous.rate:0,percent:previous&&previous.rate>0?(latest.rate-previous.rate)/previous.rate*100:null,observations:sorted.length};}).sort((a,b)=>b.date.localeCompare(a.date));
 return {products,bills,purchases,payments,expenses,customers,suppliers,productRows,known,low,negative,sales,expenseTotal,purchaseTotal,receivable,payable,stockValue,missingCost,marginAvg,targetMargin,belowTargetMargin,rateMovements,knownGrossProfit,estimatedAfterExpenses,missingCostInvoices,returnsMissingCost,customerProfitRows,customerDueRows,supplierDueRows};
}
function answer(q:string,d:ReturnType<typeof analyse>){
 const s=q.toLowerCase();
 const matchedProduct=[...d.productRows].sort((a,b)=>b.name.length-a.name.length).find(p=>p.name.length>2&&s.includes(p.name.toLowerCase()));
 if(matchedProduct){
  const changes=d.rateMovements.filter((x:any)=>x.name.toLowerCase()===matchedProduct.name.toLowerCase()).slice(0,4);
  const history=changes.map((x:any)=>x.previous===null?`${x.kind}: latest ₹${x.rate.toFixed(2)} on ${x.date}`:`${x.kind}: ₹${x.previous.toFixed(2)} → ₹${x.rate.toFixed(2)} (${x.change>0?"up":x.change<0?"down":"unchanged"} ${Math.abs(x.percent||0).toFixed(2)}%)`).join("; ");
  const priceStatus=matchedProduct.profit<0?"Selling below recorded purchase cost":matchedProduct.profit===0?"No gross profit at current price":"Positive gross profit before overheads";
  return `${matchedProduct.name} business review — Weighted average cost: ${money(matchedProduct.cost)}; Latest purchase rate: ${money(matchedProduct.lastPurchase)}; Wholesale: ${matchedProduct.wholesale>0?money(matchedProduct.wholesale):"not recorded"}; Retail: ${money(matchedProduct.retail)}; Gross profit per unit: ${money(matchedProduct.profit)}; Margin: ${matchedProduct.margin.toFixed(2)}%; Stock: ${matchedProduct.stock}. Assessment: ${priceStatus}. ${matchedProduct.margin < d.targetMargin ? `Below your ${d.targetMargin.toFixed(2)}% minimum margin target.` : "At or above your minimum margin target."} Rate history: ${history||"No dated purchase, selling or market rate comparisons available yet."} These are recorded rates, not live market quotes.`;
 }
 if(/\b(rate|rates|increase|decrease|price change|pricing|badha|ghata|mehnga|sasta)\b/.test(s)){
  const movements=d.rateMovements.filter((x:any)=>x.previous!==null).slice(0,10);
  const details=movements.map((x:any)=>`${x.name} [${x.kind}]: ₹${x.previous.toFixed(2)} → ₹${x.rate.toFixed(2)} (${x.change>0?"up":x.change<0?"down":"unchanged"} ${Math.abs(x.percent||0).toFixed(2)}%), ${x.date}, ${x.source}`).join("\\n");
  return `Dated rate review — ${movements.length} product rate movements found.\\n${details||"No product has two dated rate records yet. Record purchase invoices or verified market quotations on separate dates to calculate a trend."}\\nThese are recorded supplier invoice rates and saved market quotations; no live market feed is connected. Average listed product margin: ${d.marginAvg.toFixed(2)}%.`;
 }
 if(/stock|inventory|shortage|reorder|fast|slow/.test(s))
  return `Stock review: ${d.products.length} products recorded. ${d.low.length} products have stock of 5 units or less. ${d.negative.length} products show negative stock. Estimated stock value at recorded purchase cost: ${money(d.stockValue)}. Low-stock items: ${d.low.slice(0,8).map(p=>`${p.name} (${p.stock})`).join(", ")||"None detected"}.`;
 if(/who owes|who do i owe|top outstanding|outstanding summary/.test(s)){
  const customers=d.customerDueRows.slice(0,5).map((x:any,i:number)=>`${i+1}. ${x.name}: ${money(x.due)}`).join("\\n");
  const suppliers=d.supplierDueRows.slice(0,5).map((x:any,i:number)=>`${i+1}. ${x.name}: ${money(x.due)}`).join("\\n");
  return `Top customer balances to collect:\\n${customers||"None"}\\n\\nTop supplier balances to pay:\\n${suppliers||"None"}`;
 }
 if(/customer|party/.test(s)&&/(due|outstanding|owe|collect|balance)/.test(s)){
  const matched=d.customerDueRows.find((x:any)=>s.includes(x.name.toLowerCase()));
  if(matched)return `${matched.name} outstanding balance: ${money(matched.due)} after recorded receipts and sales returns.`;
  return `Customers with highest outstanding balances:\\n${d.customerDueRows.slice(0,10).map((x:any,i:number)=>`${i+1}. ${x.name}: ${money(x.due)}`).join("\\n")||"No customer outstanding balances found."}`;
 }
 if(/supplier|vendor/.test(s)&&/(due|outstanding|owe|pay|balance)/.test(s)){
  const matched=d.supplierDueRows.find((x:any)=>s.includes(x.name.toLowerCase()));
  if(matched)return `${matched.name} payable balance: ${money(matched.due)} after recorded supplier payments and purchase returns.`;
  return `Suppliers with highest outstanding balances:\\n${d.supplierDueRows.slice(0,10).map((x:any,i:number)=>`${i+1}. ${x.name}: ${money(x.due)}`).join("\\n")||"No supplier outstanding balances found."}`;
 }
 if(/customer|party/.test(s)&&/profit|margin|loss|munafa|nuksan/.test(s)){
  const matched=d.customerProfitRows.find((x:any)=>s.includes(x.name.toLowerCase()));
  if(matched)return `${matched.name} profit review — Sales revenue after sales returns (taxable basis): ${money(matched.revenue)}; known gross profit after costed returns: ${money(matched.profit)}; invoices: ${matched.invoices}; missing cost records: ${matched.missingCost}. Expenses are not allocated to individual customers.`;
  const leaders=d.customerProfitRows.slice(0,8);
  return `Customer gross-profit ranking from recorded item costs (before business expenses):\\n${leaders.map((x:any,i:number)=>`${i+1}. ${x.name}: ${money(x.profit)} known gross profit; ${x.missingCost} missing cost records`).join("\\n")||"No customer sales records available."}\\nCustomer-specific expenses are not allocated.`;
 }
 if(/target margin|minimum margin/.test(s)) return `Your configured minimum gross margin alert threshold is ${d.targetMargin.toFixed(2)}%. Products below this level are flagged in Business Strategy. SmartLedger does not change selling prices automatically.`;
 if(/profit|margin|loss|munafa|nuksan/.test(s))
  return `Recorded taxable sales: ${money(d.sales)}. Known gross profit from invoices with saved item costs, less costed sales returns: ${money(d.knownGrossProfit)}. Recorded expenses: ${money(d.expenseTotal)}. Estimated profit after expenses on costed invoices only: ${money(d.estimatedAfterExpenses)}. Missing cost snapshots: ${d.missingCostInvoices} sales invoices and ${d.returnsMissingCost} sales returns. Average listed product margin: ${d.marginAvg.toFixed(2)}%. This is an incomplete estimate, not a finalized P&L; missing costs, opening stock, overhead timing and tax treatment must be reconciled.`;
 if(/customer|collect|receivable|udhaar/.test(s))
  return `Recorded customer receivables: ${money(d.receivable)} across ${d.customers.length} customer records.`;
 if(/supplier|payable|pay|due/.test(s))
  return `Recorded supplier payables: ${money(d.payable)} across ${d.suppliers.length} supplier records.`;
 if(/purchase|buy|buying/.test(s))
  return `Recorded purchases total: ${money(d.purchaseTotal)} across ${d.purchases.length} purchase entries. Compare supplier invoices and dated rates before choosing a supplier.`;
 return `Business overview: ${d.products.length} products, ${d.bills.length} sales invoices, ${d.purchases.length} purchase entries. Recorded sales: ${money(d.sales)}. Purchases: ${money(d.purchaseTotal)}. Expenses: ${money(d.expenseTotal)}. Receivables: ${money(d.receivable)}. Payables: ${money(d.payable)}. Stock value estimate: ${money(d.stockValue)}. I can analyse profit, pricing, stock, purchases, customers and suppliers.`;
}

export default function BusinessAI(){
 const [open,setOpen]=useState(false);
 const [query,setQuery]=useState("");
 const [history,setHistory]=useState<{q:string,a:string}[]>([]);
 const data=useMemo(()=>analyse(),[open,history.length]);
 const priceChanges=data.rateMovements.filter((x:any)=>x.previous!==null&&x.change!==0);
 const insights=[
  priceChanges.length?`${priceChanges.length} dated product rate changes detected from saved invoices and quotations.`:"No dated product rate movements detected yet.",
  data.low.length?`${data.low.length} products have stock at or below 5 units.`:"No low-stock products detected.",
  data.belowTargetMargin.length?`${data.belowTargetMargin.length} products are below your ${data.targetMargin.toFixed(2)}% minimum margin target.`:"No products are below your minimum margin target.",
  data.missingCost.length?`${data.missingCost.length} products need purchase-cost records for reliable margin analysis.`:"Product purchase costs are available for listed products.",
  data.receivable>0?`${money(data.receivable)} customer receivables need monitoring.`:"No customer receivables detected.",
  data.payable>0?`${money(data.payable)} supplier payables need monitoring.`:"No supplier payables detected."
 ];
 const ask=(text:string)=>{
  const q=text.trim();if(!q)return;
  setHistory(h=>[...h,{q,a:answer(q,analyse())}]);setQuery("");
 };
 return <>
  <button onClick={()=>setOpen(v=>!v)} aria-label="Open SmartLedger AI" style={{position:"fixed",right:18,bottom:18,zIndex:9998,border:0,borderRadius:28,padding:"13px 18px",background:"#1F6F6B",color:"white",fontWeight:700,boxShadow:"0 5px 22px #1e2a2f30"}}>✦ SmartLedger AI</button>
  {open&&<section style={{position:"fixed",zIndex:9999,right:12,bottom:76,width:"min(420px,calc(100vw - 24px))",maxHeight:"78vh",display:"flex",flexDirection:"column",background:"var(--surface)",color:"var(--text)",border:"1px solid var(--border)",borderRadius:20,boxShadow:"0 15px 50px #0003",overflow:"hidden"}}>
   <header style={{padding:16,background:"#1F6F6B",color:"white",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><strong>✦ SmartLedger AI</strong><div style={{fontSize:11,opacity:.85}}>Business intelligence • Connected to your records</div></div><button onClick={()=>setOpen(false)} style={{background:"transparent",color:"white",border:0,fontSize:22}}>×</button></header>
   <div style={{padding:14,overflowY:"auto",fontSize:13}}>
    <strong>Automatic business review</strong>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,margin:"10px 0"}}>
     {[["Sales",money(data.sales)],["Purchases",money(data.purchaseTotal)],["Gross profit (known)",money(data.knownGrossProfit)],["After expenses (estimate)",money(data.estimatedAfterExpenses)],["Expenses",money(data.expenseTotal)],["Stock value",money(data.stockValue)],["To collect",money(data.receivable)],["To pay",money(data.payable)]].map(([k,v])=><div key={k} style={{background:"var(--surface-2)",padding:10,borderRadius:12}}><div style={{color:"var(--text-2, #475569)",fontSize:11}}>{k}</div><strong>{v}</strong></div>)}
    </div>
    <strong>Detected points</strong>
    {insights.map((x,i)=><p key={i} style={{margin:"7px 0",padding:"8px 10px",background:"var(--surface-2)",borderRadius:10}}>{x}</p>)}
    {history.map((h,i)=><div key={i} style={{marginTop:12}}><strong>You: {h.q}</strong><p style={{whiteSpace:"pre-wrap",lineHeight:1.5}}>{h.a}</p></div>)}
   </div>
   <form onSubmit={e=>{e.preventDefault();ask(query)}} style={{display:"flex",gap:8,padding:12,borderTop:"1px solid var(--border)"}}>
    <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ask about profit, stock, rates..." style={{flex:1,minWidth:0,padding:11,borderRadius:12,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text, #0F172A)"}}/>
    <button type="submit" style={{border:0,borderRadius:12,padding:"0 15px",background:"#1F6F6B",color:"white"}}>Ask</button>
   </form>
   <div style={{padding:"0 12px 10px",fontSize:10,color:"var(--text-2, #475569)"}}>Calculations use locally recorded data. External market rates and autonomous AI reasoning are not connected yet.</div>
  </section>}
 </>;
}
