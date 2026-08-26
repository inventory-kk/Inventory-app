/**
 * Inventory Management Database Layer
 * IndexedDB wrapper for items, batches, transactions, SO, openings, draft orders
 */

class InventoryDB {
    constructor() {
        this.dbName = 'InventoryApp';
        this.dbVersion = 3;
        this.db = null;
    }

    /**
     * Initialize IndexedDB with all required object stores
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Items store
                if (!db.objectStoreNames.contains('items')) {
                    const store = db.createObjectStore('items', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('category', 'category', { unique: false });
                    store.createIndex('sku', 'sku', { unique: false });
                }

                // Batches store
                if (!db.objectStoreNames.contains('batches')) {
                    const store = db.createObjectStore('batches', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('itemId', 'itemId', { unique: false });
                    store.createIndex('expireDate', 'expireDate', { unique: false });
                }

                // Transactions store (IN/OUT)
                if (!db.objectStoreNames.contains('transactions')) {
                    const store = db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('itemId', 'itemId', { unique: false });
                    store.createIndex('type', 'type', { unique: false });
                    store.createIndex('date', 'date', { unique: false });
                }

                // Daily SO store
                if (!db.objectStoreNames.contains('daily_so')) {
                    const store = db.createObjectStore('daily_so', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('itemId', 'itemId', { unique: false });
                    store.createIndex('date', 'date', { unique: false });
                }

                // Opening stock store
                if (!db.objectStoreNames.contains('openings')) {
                    db.createObjectStore('openings', { keyPath: 'itemId' });
                }

                // Draft orders store
                if (!db.objectStoreNames.contains('draft_orders')) {
                    db.createObjectStore('draft_orders', { keyPath: 'id', autoIncrement: true });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('✅ Database initialized successfully');
                resolve();
            };

            request.onerror = (event) => {
                console.error('❌ Database error:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    // ===== ITEMS =====
    async getItems() {
        return this._getAll('items');
    }

    async getItem(id) {
        return this._get('items', id);
    }

    async saveItem(item) {
        if (!item.name || !item.name.trim()) throw new Error('Item name required');
        if (!item.uomBesar || !item.uomKecil) throw new Error('UOM required');
        if (!item.konversi || item.konversi < 1) throw new Error('Conversion factor must be >= 1');
        return this._put('items', item);
    }

    async deleteItem(id) {
        return this._delete('items', id);
    }

    async getItemsByCategory(category) {
        return this._getAllByIndex('items', 'category', category);
    }

    // ===== BATCHES =====
    async getBatches(itemId = null) {
        return itemId ? this._getAllByIndex('batches', 'itemId', itemId) : this._getAll('batches');
    }

    async saveBatch(batch) {
        if (!batch.itemId || !batch.expireDate || batch.qty === undefined) {
            throw new Error('Invalid batch data');
        }
        if (batch.qty < 0) throw new Error('Batch quantity cannot be negative');
        return this._put('batches', batch);
    }

    async deleteBatch(id) {
        return this._delete('batches', id);
    }

    // ===== TRANSACTIONS =====
    async getTransactions(type = null) {
        return type ? this._getAllByIndex('transactions', 'type', type) : this._getAll('transactions');
    }

    async saveTransaction(tx) {
        if (!tx.itemId || tx.qty === undefined || !tx.type) {
            throw new Error('Invalid transaction data');
        }
        if (tx.qty < 0) throw new Error('Transaction quantity cannot be negative');
        if (!['IN', 'OUT'].includes(tx.type)) throw new Error('Invalid transaction type');
        return this._put('transactions', tx);
    }

    async deleteTransaction(id) {
        return this._delete('transactions', id);
    }

    // ===== DAILY SO =====
    async getSO(date = null) {
        return date ? this._getAllByIndex('daily_so', 'date', date) : this._getAll('daily_so');
    }

    async saveSO(so) {
        if (!so.itemId || so.physicalStock === undefined || !so.date) {
            throw new Error('Invalid SO data');
        }
        if (so.physicalStock < 0) throw new Error('Physical stock cannot be negative');
        return this._put('daily_so', so);
    }

    async deleteSO(id) {
        return this._delete('daily_so', id);
    }

    // ===== OPENINGS =====
    async getOpenings() {
        return this._getAll('openings');
    }

    async getOpening(itemId) {
        return this._get('openings', itemId);
    }

    async saveOpening(opening) {
        if (opening.qty === undefined) throw new Error('Opening qty required');
        if (opening.qty < 0) throw new Error('Opening qty cannot be negative');
        return this._put('openings', opening);
    }

    async deleteOpening(itemId) {
        return this._delete('openings', itemId);
    }

    // ===== DRAFT ORDERS =====
    async getDraftOrders() {
        return this._getAll('draft_orders');
    }

    async saveDraftOrder(order) {
        if (!order.itemId || order.qty === undefined) throw new Error('Invalid draft order');
        if (order.qty <= 0) throw new Error('Draft order quantity must be > 0');
        return this._put('draft_orders', order);
    }

    async deleteDraftOrder(id) {
        return this._delete('draft_orders', id);
    }

    // ===== HELPER METHODS =====
    _getAll(storeName) {
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(storeName, 'readonly');
                const request = tx.objectStore(storeName).getAll();

                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    _get(storeName, key) {
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(storeName, 'readonly');
                const request = tx.objectStore(storeName).get(key);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    _put(storeName, data) {
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(storeName, 'readwrite');
                const request = tx.objectStore(storeName).put(data);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    _delete(storeName, key) {
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(storeName, 'readwrite');
                const request = tx.objectStore(storeName).delete(key);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    _getAllByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(storeName, 'readonly');
                const request = tx.objectStore(storeName).index(indexName).getAll(value);

                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }
}

// Global database instance
const db = new InventoryDB();

/**
 * Initialize database on app startup
 */
async function initDB() {
    try {
        await db.init();
        console.log('✅ Database ready');
        return true;
    } catch (error) {
        console.error('❌ Database initialization error:', error);
        return false;
    }
}
