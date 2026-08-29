const STORAGE_KEY = 'kk_inventory_data_v2';

const app = {
  data: { version: 2, items: [], inventory: {}, transactions: [], sales30: {}, soHistory: [], baselineHistory: [] },

  init() {
    this.loadData();
    if (!this.data.items.length) this.loadDemoData();
    this.switchView('dashboard');
  },

  loadData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('kk_inventory_data');
      if (stored) this.data = this.normalizeData(JSON.parse(stored));
    } catch (e) { console.error(e); alert('Data tersimpan tidak dapat dibaca. Sistem memakai data kosong.'); }
  },

  normalizeData(d) {
    d.version = 2; d.items ||= []; d.inventory ||= {}; d.transactions ||= []; d.sales30 ||= {}; d.soHistory ||= []; d.baselineHistory ||= [];
    d.items.forEach(i => { i.buffer = Number(i.buffer) || 0; });
    d.items.forEach(i => { if (!d.inventory[i.id]) d.inventory[i.id] = { backroomQty: 0, barQty: 0, batches: [] }; d.inventory[i.id].batches ||= []; });
    return d;
  },

  saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); this.renderAll(); },

  loadDemoData() {
    this.data = {
      version: 2,
      items: [
        {id:'RM1',name:'KK Beef Floss - Original',category:'Raw Material',uom:'Gram',pic:'Bar',buffer:10,leadTime:14},
        {id:'RM2',name:'KK Fresh Milk',category:'Raw Material',uom:'ml',pic:'Bar',buffer:5,leadTime:7},
        {id:'RM3',name:'KK Oat Milk',category:'Raw Material',uom:'ml',pic:'Bar',buffer:5,leadTime:7},
        {id:'MC1',name:'KK Merch Cup Hugger Bear',category:'Merchandise',uom:'pcs',pic:'Cashier',price:'Rp 35.000,-',buffer:0,leadTime:14},
        {id:'KS1',name:'KK Napkin',category:'Kitchen Supplier',uom:'Pac',pic:'Bar',buffer:10,leadTime:14}
      ],
      inventory:{
        RM1:{backroomQty:1500,barQty:500,batches:[{id:'b1',qty:1500,exp:'2026-10-30'}]},
        RM2:{backroomQty:2000,barQty:1500,batches:[{id:'b2',qty:2000,exp:'2026-09-05'}]},
        RM3:{backroomQty:1000,barQty:0,batches:[{id:'b3',qty:1000,exp:'2026-09-10'}]},
        MC1:{backroomQty:0,barQty:0,batches:[]}, KS1:{backroomQty:21,barQty:0,batches:[]}
      },
      sales30:{RM1:8000,RM2:20000,RM3:5000,MC1:0,KS1:30}, transactions:[], soHistory:[], baselineHistory:[]
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
  },

  switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display='none');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const target=document.getElementById(`view-${viewId}`); if(target) target.style.display='block';
    const nav=document.querySelector(`.nav-item[href="#${viewId}"]`); if(nav) nav.classList.add('active');
    this.renderAll(); window.scrollTo(0,0);
  },

  renderAll() { this.renderDashboard(); this.populateDropdowns(); this.renderHistory(); this.renderEstimasi(); this.renderSalesForm(); this.renderMaster(); },

  renderDashboard() {
    document.getElementById('dashboard-date').textContent = new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'});
    let total=0, critical=0, expiring=0, order=0;
    this.data.items.forEach(i=>{const inv=this.inv(i.id); total+=inv.backroomQty+inv.barQty; if((inv.backroomQty+inv.barQty)<=0) critical++; inv.batches.forEach(b=>{if(b.qty>0){const d=this.daysTo(b.exp);if(d<0||d<=7) expiring++;}}); order+=this.calculateOrder(i);});
    document.getElementById('summary-cards').innerHTML=`<div class="summary-card"><b>${this.data.items.length}</b><span>Item</span></div><div class="summary-card"><b>${this.fmt(total)}</b><span>Total Unit</span></div><div class="summary-card ${critical?'danger':''}"><b>${critical}</b><span>Habis</span></div><div class="summary-card ${expiring?'warning':''}"><b>${expiring}</b><span>Expiry ≤7H</span></div>`;
    const containers={"Raw Material":document.getElementById('dash-raw-material'),"Kitchen Supplier":document.getElementById('dash-kitchen'),"Merchandise":document.getElementById('dash-merchandise')};
    Object.values(containers).forEach(c=>c.innerHTML=''); let warnings='';
    this.data.items.forEach(item=>{
      const inv=this.inv(item.id), totalStock=inv.backroomQty+inv.barQty;
      const status=totalStock<=0?'Habis':this.calculateOrder(item)>0?'Perlu Order':'Available';
      const cls=totalStock<=0?'bg-status-habis':this.calculateOrder(item)>0?'bg-status-warning':'bg-status-available';
      let batches='';
      if(item.category==='Raw Material'){
        inv.batches.sort((a,b)=>new Date(a.exp)-new Date(b.exp));
        batches=inv.batches.filter(b=>b.qty>0).map(b=>{const d=this.daysTo(b.exp);if(d<=7){warnings+=`<div class="card warning-card"><b>${this.escape(item.name)}</b><div class="warning-text">${d<0?'EXPIRED':`Exp ${b.exp} · ${d} hari lagi`} · ${this.fmt(b.qty)} ${this.escape(item.uom)}</div></div>`;} return `<div class="expiry-line">Exp ${b.exp} · ${this.fmt(b.qty)} ${this.escape(item.uom)}</div>`;}).join('');
      }
      const card=`<div class="card"><div class="card-top-row"><div><div class="item-title">${this.escape(item.name)}</div>${item.price?`<div class="item-subtitle">${this.escape(item.price)}</div>`:''}</div><div class="card-badges-right"><span class="badge-box bg-stock">${this.fmt(totalStock)} ${this.escape(item.uom)}</span><span class="badge-box ${cls}">${status}</span></div></div><div class="stock-breakdown">Backroom: ${this.fmt(inv.backroomQty)} · Bar: ${this.fmt(inv.barQty)}</div>${batches?`<div class="batch-list">${batches}</div>`:''}</div>`;
      (containers[item.category]||containers['Kitchen Supplier']).innerHTML += card;
    });
    document.getElementById('expiry-warning-container').innerHTML=warnings?`<h3 class="category-title warning-heading">PERHATIAN EXPIRY</h3>${warnings}`:'';
  },

  inv(id){return this.data.inventory[id] ||= {backroomQty:0,barQty:0,batches:[]};},
  fmt(n){return Number(n||0).toLocaleString('id-ID',{maximumFractionDigits:2});},
  daysTo(date){const a=new Date();const b=new Date(`${date}T23:59:59`);return Math.ceil((b.setHours(0,0,0,0)-new Date(a.getFullYear(),a.getMonth(),a.getDate()).getTime())/86400000);},
  escape(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));},

  submitIn(){
    const id=document.getElementById('in-item').value, qty=Number(document.getElementById('in-qty').value), exp=document.getElementById('in-exp').value, item=this.data.items.find(i=>i.id===id);
    if(!item||!Number.isFinite(qty)||qty<=0)return alert('Item dan Qty wajib valid.');
    if(item.category==='Raw Material'&&!exp)return alert('Expiry wajib diisi untuk Raw Material.');
    const inv=this.inv(id);inv.backroomQty+=qty;
    if(item.category==='Raw Material')inv.batches.push({id:'b'+Date.now(),qty,exp});
    this.addTransaction('IN',id,qty,'Gudang/Vendor → Backroom');this.closeAllModals();this.saveData();
  },

  submitNewItem(){
    const name=document.getElementById('new-name').value.trim(),category=document.getElementById('new-category').value,uom=document.getElementById('new-uom').value.trim(),pic=document.getElementById('new-pic').value.trim(),buffer=Number(document.getElementById('new-buffer').value)||0,qty=Number(document.getElementById('new-qty').value)||0,exp=document.getElementById('new-exp').value;
    if(!name||!uom)return alert('Nama item dan UOM wajib diisi.');if(qty<0)return alert('Qty tidak valid.');if(category==='Raw Material'&&qty>0&&!exp)return alert('Expiry wajib untuk Raw Material.');
    const id='IT'+Date.now();this.data.items.push({id,name,category,uom,pic:pic||'-',buffer,leadTime:category==='Raw Material'&&/milk|cream|whipping/i.test(name)?7:14});this.data.inventory[id]={backroomQty:qty,barQty:0,batches:[]};this.data.sales30[id]=0;
    if(category==='Raw Material'&&qty>0)this.data.inventory[id].batches.push({id:'b'+Date.now(),qty,exp});
    this.addTransaction('IN',id,qty,'Item baru → Backroom');this.closeAllModals();this.saveData();alert('Item baru berhasil dibuat.');
  },

  submitOut(){
    const id=document.getElementById('out-item').value,type=document.getElementById('out-type').value,qty=Number(document.getElementById('out-qty').value),detail=document.getElementById('out-detail').value.trim(),item=this.data.items.find(i=>i.id===id),inv=this.inv(id);
    if(!item||!Number.isFinite(qty)||qty<=0)return alert('Item dan Qty wajib valid.');if(inv.backroomQty<qty)return alert(`Stok Backroom tidak mencukupi. Tersedia ${this.fmt(inv.backroomQty)} ${item.uom}.`);
    if(item.category==='Raw Material'&&!this.consumeFIFO(inv,qty))return alert('Batch expiry tidak mencukupi.');
    inv.backroomQty-=qty;
    if(type==='TRANSFER_BAR')inv.barQty+=qty;
    this.addTransaction('OUT',id,qty,`${type==='TRANSFER_BAR'?'Transfer Backroom → Bar':type==='WASTE'?'Waste/Rusak':'Pengeluaran Lain'}${detail?' · '+detail:''}`);this.closeAllModals();this.saveData();
  },

  consumeFIFO(inv,qty){inv.batches.sort((a,b)=>new Date(a.exp)-new Date(b.exp));let rem=qty;for(const b of inv.batches){if(rem<=0)break;if(b.qty>0){const take=Math.min(b.qty,rem);b.qty-=take;rem-=take;}}if(rem>0)return false;inv.batches=inv.batches.filter(b=>b.qty>0);return true;},

  submitSo(){
    const id=document.getElementById('so-item').value,actual=Number(document.getElementById('so-qty').value),item=this.data.items.find(i=>i.id===id),inv=this.inv(id);
    if(!item||!Number.isFinite(actual)||actual<0)return alert('Item dan Qty aktual wajib valid.');
    const previous=this.latestSO(id),consumption=previous===null?null:previous-actual;
    if(consumption!==null&&consumption<0){if(!confirm(`SO naik ${this.fmt(Math.abs(consumption))} ${item.uom} dari SO sebelumnya. Tetap simpan sebagai koreksi?`))return;}
    inv.barQty=actual;this.data.soHistory.unshift({id:'so'+Date.now(),date:new Date().toISOString(),itemId:id,qty:actual,previousQty:previous,consumption});this.addTransaction('SO',id,actual,consumption===null?'SO Fisik Bar Aktual':`SO Fisik · Consumption ${this.fmt(consumption)} ${item.uom}`);this.closeAllModals();this.saveData();alert('Daily SO tersimpan.');
  },
  latestSO(id){const x=this.data.soHistory.find(s=>s.itemId===id);return x?Number(x.qty):null;},

  calculateOrder(item){
    const inv=this.inv(item.id),stock=inv.backroomQty+inv.barQty,sales=Number(this.data.sales30[item.id]||0),history=this.data.soHistory.filter(s=>s.itemId===item.id).slice(0,7).map(s=>Number(s.consumption)).filter(x=>Number.isFinite(x)&&x>=0);
    const dailySO=history.length?history.reduce((a,b)=>a+b,0)/history.length:sales/30;const lead=Number(item.leadTime)||14;const target=dailySO*lead*(1+(Number(item.buffer)||0)/100);return Math.max(0,Math.ceil(target-stock));
  },

  renderEstimasi(){
    const c=document.getElementById('estimasi-list');if(!c)return;c.innerHTML='';this.data.items.forEach(item=>{const inv=this.inv(item.id),stock=inv.backroomQty+inv.barQty,sales=Number(this.data.sales30[item.id]||0),history=this.data.soHistory.filter(s=>s.itemId===item.id).slice(0,7).map(s=>Number(s.consumption)).filter(x=>x>=0),daily=history.length?history.reduce((a,b)=>a+b,0)/history.length:sales/30,order=this.calculateOrder(item);c.innerHTML+=`<div class="card ${order?'order-card':''}"><div class="card-top-row"><div><div class="item-title">${this.escape(item.name)}</div><div class="muted">PIC: ${this.escape(item.pic)} · Lead time: ${item.leadTime||14} hari · Buffer: ${item.buffer||0}%</div></div><span class="badge-box ${order?'bg-status-warning':'bg-status-available'}">Order: ${this.fmt(order)} ${this.escape(item.uom)}</span></div><div class="stock-breakdown">Stok: ${this.fmt(stock)} · Daily consumption: ${this.fmt(daily)} · ${history.length?'berdasarkan SO':'berdasarkan Sales 30H'}</div></div>`;});
  },

  addTransaction(type,itemId,qty,detail){this.data.transactions.unshift({id:'tx'+Date.now(),date:new Date().toISOString(),type,itemId,qty,detail,user:'Manager'});},
  renderHistory(){const render=(type,target)=>{const c=document.getElementById(target);if(!c)return;const list=this.data.transactions.filter(t=>t.type===type).slice(0,20);c.innerHTML=list.map(t=>{const item=this.data.items.find(i=>i.id===t.itemId);return `<div class="card history-card"><div class="muted">${new Date(t.date).toLocaleString('id-ID')}</div><b>${this.escape(item?.name||t.itemId)}</b><div>${type==='OUT'?'-':type==='IN'?'+':'='} ${this.fmt(t.qty)} ${this.escape(item?.uom||'')} <span class="muted">· ${this.escape(t.detail)}</span></div></div>`}).join('')||'<p class="muted">Belum ada history.</p>';};render('IN','history-in-list');render('OUT','history-out-list');render('SO','history-so-list');},

  populateDropdowns(){const opt=arr=>'<option value="">Pilih Item...</option>'+arr.map(i=>`<option value="${this.escape(i.id)}">${this.escape(i.name)} (${this.escape(i.uom)})</option>`).join('');document.getElementById('in-item').innerHTML=opt(this.data.items);document.getElementById('out-item').innerHTML=opt(this.data.items);document.getElementById('so-item').innerHTML=opt(this.data.items.filter(i=>i.category==='Raw Material'));document.getElementById('baseline-item').innerHTML=opt(this.data.items);this.renderSoPreview();},
  checkCategory(type){if(type==='in'){const i=this.data.items.find(x=>x.id===document.getElementById('in-item').value);document.getElementById('in-batch-group').style.display=i?.category==='Raw Material'?'block':'none';}},

  submitBaseline(){const id=document.getElementById('baseline-item').value,br=Number(document.getElementById('baseline-backroom').value),bar=Number(document.getElementById('baseline-bar').value),item=this.data.items.find(i=>i.id===id),inv=this.inv(id);if(!item||br<0||bar<0)return alert('Data baseline tidak valid.');const old={backroomQty:inv.backroomQty,barQty:inv.barQty};inv.backroomQty=br;inv.barQty=bar;if(item.category==='Raw Material'){inv.batches=[];if(br>0){const exp=prompt('Expiry batch stock awal (YYYY-MM-DD). Kosongkan jika tidak ingin mencatat batch.');if(exp)inv.batches.push({id:'base'+Date.now(),qty:br,exp});}}this.data.baselineHistory.unshift({date:new Date().toISOString(),itemId:id,old,new:{backroomQty:br,barQty:bar}});this.addTransaction('BASELINE',id,br+bar,`Stock Opname: BR ${br} + Bar ${bar}`);this.closeAllModals();this.saveData();},

  renderSalesForm(){const c=document.getElementById('sales-form');if(!c)return;c.innerHTML=this.data.items.map(i=>`<div class="sales-row"><label>${this.escape(i.name)} <span>(${this.escape(i.uom)})</span></label><input class="sales-input" data-item="${this.escape(i.id)}" type="number" min="0" step="any" value="${Number(this.data.sales30[i.id]||0)}"></div>`).join('');},
  submitSales(){document.querySelectorAll('.sales-input').forEach(x=>{this.data.sales30[x.dataset.item]=Math.max(0,Number(x.value)||0);});this.closeAllModals();this.saveData();alert('Sales 30 hari diperbarui.');},

  renderMaster(){const c=document.getElementById('master-list');if(!c)return;c.innerHTML=this.data.items.map(i=>`<div class="master-row"><div><b>${this.escape(i.name)}</b><div class="muted">${this.escape(i.category)} · ${this.escape(i.uom)} · PIC ${this.escape(i.pic)}</div></div><button class="btn-danger-small" onclick="app.deleteItem('${this.escape(i.id)}')">Hapus</button></div>`).join('');},
  deleteItem(id){if(!confirm('Hapus item dari master? History lama tetap disimpan.'))return;this.data.items=this.data.items.filter(i=>i.id!==id);delete this.data.inventory[id];delete this.data.sales30[id];this.saveData();},

  renderSoPreview(){const el=document.getElementById('so-preview');if(!el)return;const id=document.getElementById('so-item')?.value,actual=Number(document.getElementById('so-qty')?.value),prev=id?this.latestSO(id):null;if(!id||!Number.isFinite(actual)){el.textContent='Pilih item dan masukkan SO untuk melihat consumption.';return;}el.textContent=prev===null?'Belum ada SO sebelumnya.':`SO sebelumnya ${this.fmt(prev)} → SO sekarang ${this.fmt(actual)} · Consumption ${this.fmt(prev-actual)}`;},

  openModal(id){this.closeAllModals(false);document.getElementById('modal-overlay').style.display='block';document.getElementById(id).style.display='block';if(id==='modal-sales')this.renderSalesForm();if(id==='modal-master')this.renderMaster();},
  closeAllModals(clear=true){document.querySelectorAll('.modal').forEach(m=>m.style.display='none');document.getElementById('modal-overlay').style.display='none';if(clear)document.querySelectorAll('.modal input').forEach(i=>{if(!i.classList.contains('sales-input'))i.value='';});},

  exportData(){const blob=new Blob([JSON.stringify(this.data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`kk_inventory_backup_${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);},
  importData(e){const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const d=this.normalizeData(JSON.parse(reader.result));if(!confirm('Import akan mengganti data saat ini. Lanjutkan?'))return;this.data=d;this.saveData();alert('Backup berhasil di-import.');}catch(err){alert('File backup tidak valid.');}};reader.readAsText(file);e.target.value='';},
  resetSystem(){if(confirm('Reset akan menghapus data operasional dan kembali ke demo. Lanjutkan?')){localStorage.removeItem(STORAGE_KEY);localStorage.removeItem('kk_inventory_data');this.loadDemoData();location.reload();}}
};

document.getElementById('view-so')?.addEventListener('input',e=>{if(e.target.id==='so-qty')app.renderSoPreview();});
document.getElementById('view-so')?.addEventListener('change',e=>{if(e.target.id==='so-item')app.renderSoPreview();});
window.onload=()=>app.init();
