class InventoryDB {
    constructor() {
        this.dbName = 'InventoryApp';
        this.dbVersion = 2;
        this.db = null;
    }
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('items')) {
                    const store = db.createObjectStore('items', { keyPath: 'id' });
                    store.createIndex('category', 'category', { unique: false });
                    store.createIndex('sku', 'sku', { unique: false });
                }
                if (!db.objectStoreNames.contains('batches')) {
                    const store = db.createObjectStore('batches', { keyPath: 'id' });
                    store.createIndex('itemId', 'itemId', { unique: false });
                    store.createIndex('expireDate', 'expireDate', { unique: false });
                }
                if (!db.objectStoreNames.contains('transactions')) {
                    const store = db.createObjectStore('transactions', { keyPath: 'id' });
                    store.createIndex('itemId', 'itemId', { unique: false });
                    store.createIndex('type', 'type', { unique: false });
                    store.createIndex('date', 'date', { unique: false });
                }
                if (!db.objectStoreNames.contains('daily_so')) {
                    const store = db.createObjectStore('daily_so', { keyPath: 'id' });
                    store.createIndex('itemId', 'itemId', { unique: false });
                    store.createIndex('date', 'date', { unique: false });
                }
                if (!db.objectStoreNames.contains('openings')) db.createObjectStore('openings', { keyPath: 'itemId' });
                if (!db.objectStoreNames.contains('draft_orders')) db.createObjectStore('draft_orders', { keyPath: 'id' });
            };
            request.onsuccess = (event) => { this.db = event.target.result; resolve(); };
            request.onerror = (event) => reject(event.target.error);
        });
    }
    async getItems() { return this._getAll('items'); }
    async getItem(id) { return this._get('items', id); }
    async saveItem(item) { return this._put('items', item); }
    async deleteItem(id) { return this._delete('items', id); }
    async getItemsByCategory(category) { return this._getAllByIndex('items', 'category', category); }
    async getBatches(itemId = null) { return itemId ? this._getAllByIndex('batches', 'itemId', itemId) : this._getAll('batches'); }
    async saveBatch(batch) { return this._put('batches', batch); }
    async deleteBatch(id) { return this._delete('batches', id); }
    async getTransactions(type = null) { return type ? this._getAllByIndex('transactions', 'type', type) : this._getAll('transactions'); }
    async saveTransaction(tx) { return this._put('transactions', tx); }
    async deleteTransaction(id) { return this._delete('transactions', id); }
    async getSO(date = null) { return date ? this._getAllByIndex('daily_so', 'date', date) : this._getAll('daily_so'); }
    async saveSO(so) { return this._put('daily_so', so); }
    async deleteSO(id) { return this._delete('daily_so', id); }
    async getOpenings() { return this._getAll('openings'); }
    async getOpening(itemId) { return this._get('openings', itemId); }
    async saveOpening(opening) { return this._put('openings', opening); }
    async deleteOpening(itemId) { return this._delete('openings', itemId); }
    async getDraftOrders() { return this._getAll('draft_orders'); }
    async saveDraftOrder(order) { return this._put('draft_orders', order); }
    async deleteDraftOrder(id) { return this._delete('draft_orders', id); }
    _getAll(storeName) { return new Promise((resolve,reject)=>{const tx=this.db.transaction(storeName,'readonly');const request=tx.objectStore(storeName).getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);}); }
    _get(storeName,key) { return new Promise((resolve,reject)=>{const tx=this.db.transaction(storeName,'readonly');const request=tx.objectStore(storeName).get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);}); }
    _put(storeName,data) { return new Promise((resolve,reject)=>{const tx=this.db.transaction(storeName,'readwrite');const request=tx.objectStore(storeName).put(data);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);}); }
    _delete(storeName,key) { return new Promise((resolve,reject)=>{const tx=this.db.transaction(storeName,'readwrite');const request=tx.objectStore(storeName).delete(key);request.onsuccess=()=>resolve();request.onerror=()=>reject(request.error);}); }
    _getAllByIndex(storeName,indexName,value) { return new Promise((resolve,reject)=>{const tx=this.db.transaction(storeName,'readonly');const request=tx.objectStore(storeName).index(indexName).getAll(value);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);}); }
}
const db = new InventoryDB();
let dbReady = false;
async function initDB() {
    try { await db.init(); dbReady = true; console.log('✅ Database ready'); return true; }
    catch (error) { console.error('❌ Database error:', error); return false; }
}
