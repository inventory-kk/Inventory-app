class InventoryDB {
  constructor(){this.dbName='InventoryApp';this.dbVersion=3;this.db=null;}
  async init(){if(this.db)return true;return new Promise((resolve,reject)=>{
    const r=indexedDB.open(this.dbName,this.dbVersion);
    r.onupgradeneeded=e=>{const db=e.target.result;
      const add=(n,k,idx=[])=>{if(!db.objectStoreNames.contains(n)){const s=db.createObjectStore(n,{keyPath:k});idx.forEach(([a,b])=>s.createIndex(a,b,{unique:false}));}};
      add('items','id',[['category','category'],['sku','sku']]);
      add('batches','id',[['itemId','itemId'],['expireDate','expireDate']]);
      add('transactions','id',[['itemId','itemId'],['type','type'],['date','date']]);
      add('daily_so','id',[['itemId','itemId'],['date','date']]);
      add('openings','itemId'); add('draft_orders','id');
    };
    r.onsuccess=e=>{this.db=e.target.result;this.db.onversionchange=()=>this.db.close();resolve(true);};
    r.onerror=()=>reject(r.error);
  });}
  _all(n){return new Promise((res,rej)=>{const r=this.db.transaction(n,'readonly').objectStore(n).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error);});}
  _get(n,k){return new Promise((res,rej)=>{const r=this.db.transaction(n,'readonly').objectStore(n).get(k);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
  _put(n,d){return new Promise((res,rej)=>{const t=this.db.transaction(n,'readwrite'),r=t.objectStore(n).put(d);t.oncomplete=()=>res(r.result);t.onerror=()=>rej(t.error||r.error);});}
  _del(n,k){return new Promise((res,rej)=>{const t=this.db.transaction(n,'readwrite'),r=t.objectStore(n).delete(k);t.oncomplete=()=>res();t.onerror=()=>rej(t.error||r.error);});}
  _idx(n,i,v){return new Promise((res,rej)=>{const r=this.db.transaction(n,'readonly').objectStore(n).index(i).getAll(v);r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error);});}
  getItems(){return this._all('items')} getItem(id){return this._get('items',id)} saveItem(x){return this._put('items',x)} deleteItem(id){return this._del('items',id)}
  getItemsByCategory(x){return this._idx('items','category',x)}
  getBatches(id=null){return id==null?this._all('batches'):this._idx('batches','itemId',id)} saveBatch(x){return this._put('batches',x)} deleteBatch(id){return this._del('batches',id)}
  getTransactions(type=null){return type==null?this._all('transactions'):this._idx('transactions','type',type)} saveTransaction(x){return this._put('transactions',x)} deleteTransaction(id){return this._del('transactions',id)}
  getSO(date=null){return date==null?this._all('daily_so'):this._idx('daily_so','date',date)} saveSO(x){return this._put('daily_so',x)} deleteSO(id){return this._del('daily_so',id)}
  getOpenings(){return this._all('openings')} getOpening(id){return this._get('openings',id)} saveOpening(x){return this._put('openings',x)} deleteOpening(id){return this._del('openings',id)}
  getDraftOrders(){return this._all('draft_orders')} saveDraftOrder(x){return this._put('draft_orders',x)} deleteDraftOrder(id){return this._del('draft_orders',id)}
  async clearAll(){for(const n of ['items','batches','transactions','daily_so','openings','draft_orders'])for(const x of await this._all(n))await this._del(n,n==='openings'?x.itemId:x.id);}
}
const db=new InventoryDB();let dbReady=false;
async function initDB(){try{await db.init();dbReady=true;return true}catch(e){console.error(e);return false;}}
