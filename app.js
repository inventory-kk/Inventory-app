const app = {
    data: { items: [], inventory: {}, transactions: [], sales30: {} },

    init() {
        this.loadData();
        if (!this.data.items.length) this.loadDemoData();
        this.switchView('dashboard');
    },

    loadData() {
        const stored = localStorage.getItem('kk_inventory_data');
        if (stored) this.data = JSON.parse(stored);
    },

    saveData() {
        localStorage.setItem('kk_inventory_data', JSON.stringify(this.data));
        this.renderAll();
    },

    loadDemoData() {
        this.data.items = [
            { id: 'RM1', name: 'KK Beef Floss - Original', category: 'Raw Material', uom: 'Gram', pic: 'Bar', buffer: 10 },
            { id: 'RM2', name: 'KK Fresh Milk', category: 'Raw Material', uom: 'ml', pic: 'Bar', buffer: 5 },
            { id: 'RM3', name: 'KK Oat Milk', category: 'Raw Material', uom: 'ml', pic: 'Bar', buffer: 5 },
            { id: 'MC1', name: 'KK Merch Cup Hugger Bear', category: 'Merchandise', uom: 'pcs', pic: 'Cashier', price: 'Rp 35.000', buffer: 0 },
            { id: 'KS1', name: 'KK Tissu Toilet', category: 'Kitchen Supplier', uom: 'Roll', pic: 'Bar', buffer: 10 }
        ];
        this.data.inventory = {
            'RM1': { backroomQty: 1500, barQty: 500, batches: [{ id: 'b1', qty: 1500, exp: '2026-10-30' }] },
            'RM2': { backroomQty: 2000, barQty: 1500, batches: [{ id: 'b2', qty: 2000, exp: '2026-09-05' }] },
            'RM3': { backroomQty: 1000, barQty: 0, batches: [{ id: 'b3', qty: 1000, exp: '2026-09-10' }] },
            'MC1': { backroomQty: 5, barQty: 0, batches: [] },
            'KS1': { backroomQty: 30, barQty: 0, batches: [] }
        };
        this.data.sales30 = { 'RM1': 8000, 'RM2': 20000, 'RM3': 5000, 'MC1': 10, 'KS1': 50 };
        this.saveData();
    },

    switchView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.getElementById(`view-${viewId}`).style.display = 'block';
        const navTarget = document.querySelector(`.nav-item[href="#${viewId}"]`);
        if(navTarget) navTarget.classList.add('active');
        this.renderAll();
    },

    renderAll() {
        this.renderDashboard();
        this.populateDropdowns();
        this.renderHistory();
        this.renderEstimasi();
    },

    renderDashboard() {
        const rmContainer = document.getElementById('dash-raw-material');
        const mcContainer = document.getElementById('dash-merchandise');
        const ksContainer = document.getElementById('dash-kitchen');
        const warnContainer = document.getElementById('expiry-warning-container');
        
        rmContainer.innerHTML = ''; mcContainer.innerHTML = ''; ksContainer.innerHTML = ''; warnContainer.innerHTML = '';
        let warningsHtml = '';

        this.data.items.forEach(item => {
            const inv = this.data.inventory[item.id] || { backroomQty: 0, barQty: 0, batches: [] };
            const totalStock = inv.backroomQty + inv.barQty;
            
            let batchesHtml = '';
            if (item.category === 'Raw Material') {
                inv.batches.sort((a, b) => new Date(a.exp) - new Date(b.exp));
                inv.batches.forEach(b => {
                    const daysToExp = Math.ceil((new Date(b.exp) - new Date()) / (1000 * 60 * 60 * 24));
                    batchesHtml += `<div>Exp ${b.exp} · Backroom: ${b.qty} ${item.uom}</div>`;
                    if (daysToExp <= 7 && b.qty > 0) {
                        warningsHtml += `<div class="card warning-card"><div class="card-header">${item.name}</div><div class="card-body"><span class="warning-text">Exp ${b.exp} · ${daysToExp} hari lagi</span></div></div>`;
                    }
                });
            }

            const status = totalStock > 0 ? 'Available' : 'Habis';
            const cardHtml = `
                <div class="card">
                    <div class="card-header">
                        <span>${item.name}</span>
                        <span class="badge-total">${totalStock} ${item.uom}</span>
                    </div>
                    <div class="card-body">
                        <div class="stock-breakdown">Backroom: ${inv.backroomQty} | Bar: ${inv.barQty}</div>
                        <div>Status: <strong>${status}</strong></div>
                        ${item.category === 'Merchandise' ? `<div>Harga: ${item.price}</div>` : ''}
                        ${batchesHtml ? `<div class="batch-list mt-4">${batchesHtml}</div>` : ''}
                    </div>
                </div>
            `;

            if (item.category === 'Raw Material') rmContainer.innerHTML += cardHtml;
            else if (item.category === 'Merchandise') mcContainer.innerHTML += cardHtml;
            else ksContainer.innerHTML += cardHtml;
        });

        if (warningsHtml) warnContainer.innerHTML = `<h3 class="category-title warning-text">PERHATIAN EXPIRED</h3>` + warningsHtml;
    },

    submitIn() {
        const itemId = document.getElementById('in-item').value;
        const qty = parseFloat(document.getElementById('in-qty').value);
        const exp = document.getElementById('in-exp').value;
        const item = this.data.items.find(i => i.id === itemId);

        if (!itemId || isNaN(qty) || qty <= 0) return alert('Data tidak valid');
        if (item.category === 'Raw Material' && !exp) return alert('Expiry wajib diisi');

        if (!this.data.inventory[itemId]) this.data.inventory[itemId] = { backroomQty: 0, barQty: 0, batches: [] };
        
        this.data.inventory[itemId].backroomQty += qty;
        
        if (item.category === 'Raw Material') {
            this.data.inventory[itemId].batches.push({ id: 'b' + Date.now(), qty: qty, exp: exp });
        }

        this.addTransaction('IN', itemId, qty, `Gudang/Vendor -> Backroom`);
        this.closeAllModals();
        this.saveData();
    },

    submitOut() {
        const itemId = document.getElementById('out-item').value;
        let qty = parseFloat(document.getElementById('out-qty').value);
        const detail = document.getElementById('out-detail').value;
        const item = this.data.items.find(i => i.id === itemId);
        const inv = this.data.inventory[itemId];

        if (!itemId || isNaN(qty) || qty <= 0) return alert('Data tidak valid');
        if (!inv || inv.backroomQty < qty) return alert('Stok Backroom tidak mencukupi!');

        if (item.category === 'Raw Material') {
            inv.batches.sort((a, b) => new Date(a.exp) - new Date(b.exp));
            let remainingOut = qty;
            for (let i = 0; i < inv.batches.length; i++) {
                if (remainingOut <= 0) break;
                if (inv.batches[i].qty > 0) {
                    if (inv.batches[i].qty >= remainingOut) {
                        inv.batches[i].qty -= remainingOut;
                        remainingOut = 0;
                    } else {
                        remainingOut -= inv.batches[i].qty;
                        inv.batches[i].qty = 0;
                    }
                }
            }
            inv.batches = inv.batches.filter(b => b.qty > 0);
        }

        inv.backroomQty -= qty;
        this.addTransaction('OUT', itemId, qty, detail || 'Backroom Keluar');
        this.closeAllModals();
        this.saveData();
    },

    submitSo() {
        const itemId = document.getElementById('so-item').value;
        const actualQty = parseFloat(document.getElementById('so-qty').value);
        const inv = this.data.inventory[itemId];

        if (!itemId || isNaN(actualQty) || actualQty < 0) return alert('Data tidak valid');

        inv.barQty = actualQty;
        this.addTransaction('SO', itemId, actualQty, `SO Fisik Bar Aktual`);
        this.closeAllModals();
        this.saveData();
        alert('Daily SO Bar tersimpan.');
    },

    renderEstimasi() {
        const estContainer = document.getElementById('estimasi-list');
        estContainer.innerHTML = '';

        this.data.items.forEach(item => {
            const inv = this.data.inventory[item.id] || { backroomQty: 0, barQty: 0 };
            const totalStock = inv.backroomQty + inv.barQty;
            const sales = this.data.sales30[item.id] || 0;
            const buffer = item.buffer || 0;
            
            const nameUpper = item.name.toUpperCase();
            const isWeekly = nameUpper.includes('MILK') || nameUpper.includes('WHIPPING');
            const leadTime = isWeekly ? 7 : 14;

            const dailySales = sales / 30;
            const targetKebutuhan = (dailySales * leadTime) * (1 + (buffer / 100));
            
            let orderQty = Math.ceil(targetKebutuhan - totalStock);
            if (orderQty < 0) orderQty = 0;

            estContainer.innerHTML += `
                <div class="card">
                    <div class="card-header">
                        <span>${item.name}</span>
                        <span class="badge-total">Order: ${orderQty} ${item.uom}</span>
                    </div>
                    <div class="card-body">
                        <div>PIC: <strong>${item.pic}</strong> | Siklus: <strong>${leadTime} Hari</strong></div>
                        <div class="stock-breakdown">Total Stok: ${totalStock} ${item.uom} (BR: ${inv.backroomQty} + Bar: ${inv.barQty})</div>
                        <div>Sales 30H: ${sales} ${item.uom}</div>
                    </div>
                </div>
            `;
        });
    },

    addTransaction(type, itemId, qty, detail) {
        this.data.transactions.unshift({
            date: new Date().toLocaleString('id-ID'),
            type, itemId, qty, detail,
            user: 'Manager'
        });
    },

    renderHistory() {
        const renderList = (type, targetId) => {
            const list = this.data.transactions.filter(t => t.type === type).slice(0, 10);
            const container = document.getElementById(targetId);
            container.innerHTML = list.map(t => {
                const item = this.data.items.find(i => i.id === t.itemId);
                return `
                <div class="card" style="padding: 10px;">
                    <div style="font-size: 11px; color: #888;">${t.date}</div>
                    <div style="font-weight: 600; margin: 4px 0;">${item ? item.name : t.itemId}</div>
                    <div>${type==='OUT'?'-':(type==='IN'?'+':'=')} ${t.qty} ${item ? item.uom : ''} <span style="font-size:11px; color:#666;">(${t.detail})</span></div>
                </div>`
            }).join('') || '<p style="font-size:12px;">Belum ada history.</p>';
        };
        renderList('IN', 'history-in-list'); renderList('OUT', 'history-out-list'); renderList('SO', 'history-so-list');
    },

    populateDropdowns() {
        const items = this.data.items;
        const buildOptions = (arr) => arr.map(i => `<option value="${i.id}">${i.name} (${i.uom})</option>`).join('');
        
        document.getElementById('in-item').innerHTML = '<option value="">Pilih Item...</option>' + buildOptions(items);
        document.getElementById('out-item').innerHTML = '<option value="">Pilih Item...</option>' + buildOptions(items);
        document.getElementById('so-item').innerHTML = '<option value="">Pilih Item...</option>' + buildOptions(items.filter(i => i.category === 'Raw Material'));
    },

    checkCategory(modalType) {
        if(modalType === 'in') {
            const itemId = document.getElementById('in-item').value;
            const item = this.data.items.find(i => i.id === itemId);
            document.getElementById('in-batch-group').style.display = (item && item.category === 'Raw Material') ? 'block' : 'none';
        }
    },

    openModal(id) {
        document.getElementById('modal-overlay').style.display = 'block';
        document.getElementById(id).style.display = 'block';
    },

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        document.getElementById('modal-overlay').style.display = 'none';
        document.querySelectorAll('input').forEach(i => { if(i.type !== 'date') i.value = ''; });
    },

    exportData() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.data));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", "kk_inventory_export.json");
        dlAnchorElem.click();
    },

    resetSystem() {
        if(confirm("Yakin ingin mereset seluruh data?")) {
            localStorage.removeItem('kk_inventory_data');
            this.loadDemoData();
            alert("Sistem berhasil di-reset");
            location.reload();
        }
    }
};

window.onload = () => app.init();
    renderDashboard() {
        const rmContainer = document.getElementById('dash-raw-material');
        const mcContainer = document.getElementById('dash-merchandise');
        const ksContainer = document.getElementById('dash-kitchen');
        const warnContainer = document.getElementById('expiry-warning-container');
        
        rmContainer.innerHTML = ''; mcContainer.innerHTML = ''; ksContainer.innerHTML = ''; warnContainer.innerHTML = '';
        let warningsHtml = '';

        this.data.items.forEach(item => {
            const inv = this.data.inventory[item.id] || { backroomQty: 0, barQty: 0, batches: [] };
            const totalStock = inv.backroomQty + inv.barQty;
            
            let batchesHtml = '';
            if (item.category === 'Raw Material') {
                inv.batches.sort((a, b) => new Date(a.exp) - new Date(b.exp));
                inv.batches.forEach(b => {
                    const daysToExp = Math.ceil((new Date(b.exp) - new Date()) / (1000 * 60 * 60 * 24));
                    batchesHtml += `<div class="expiry-line">Exp ${b.exp} · ${b.qty} ${item.uom}</div>`;
                    if (daysToExp <= 7 && b.qty > 0) {
                        warningsHtml += `
                            <div class="card warning-card">
                                <div class="card-top-row">
                                    <div>
                                        <div class="item-title">${item.name}</div>
                                        <div class="warning-text">Exp ${b.exp} · ${daysToExp} hari lagi</div>
                                    </div>
                                </div>
                            </div>`;
                    }
                });
            }

            const statusText = totalStock > 0 ? 'Available' : 'Habis';
            const statusClass = totalStock > 0 ? 'bg-status-available' : 'bg-status-habis';

            const cardHtml = `
                <div class="card">
                    <div class="card-top-row">
                        <div>
                            <div class="item-title">${item.name}</div>
                            ${item.category === 'Merchandise' ? `<div class="item-subtitle">${item.price || ''}</div>` : ''}
                        </div>
                        <div class="card-badges-right">
                            <span class="badge-box bg-stock">${totalStock} ${item.uom}</span>
                            <span class="badge-box ${statusClass}">${statusText}</span>
                        </div>
                    </div>
                    <div class="stock-breakdown">
                        Backroom: ${inv.backroomQty} | Bar: ${inv.barQty}
                    </div>
                    ${batchesHtml ? `<div style="margin-top: 4px;">${batchesHtml}</div>` : ''}
                </div>
            `;

            if (item.category === 'Raw Material') rmContainer.innerHTML += cardHtml;
            else if (item.category === 'Merchandise') mcContainer.innerHTML += cardHtml;
            else ksContainer.innerHTML += cardHtml;
        });

        if (warningsHtml) {
            warnContainer.innerHTML = `<h3 class="category-title" style="color: #d97706;">PERHATIAN EXPIRED</h3>` + warningsHtml;
        }
    },

