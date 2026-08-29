/* ============================================================
   KK INVENTORY — vanilla JS SPA, localStorage-backed
   Model: Gudang (toko) <- IN dari Warehouse, -> OUT ke Bar
          Bar stock = hasil SO fisik harian (snapshot, bukan hitungan)
          Batas Minimum per barang -> highlight kalau Bar di bawah itu
   ============================================================ */

const LS_ITEMS = 'kk_items';
const LS_GUDANG_LOG = 'kk_gudang_log';
const LS_SO_LOG = 'kk_so_log';

const CATEGORY_LABELS = { raw: 'Raw Material', condiment: 'Condiment / Kitchen', merch: 'Merchandise' };

/* ---------------- Seed data (first run only) ---------------- */
/* Semua angka stok sengaja 0 — bukan hasil tebakan dari sheet lama.
   Isi ulang lewat Master Barang / SO Harian / Stok Gudang. */
function seedData(){
  return [
    mkItem('Beef Floss - Original','raw','Gram',1000,1,['2026-11-13','2026-11-19'],0,0,500),
    mkItem('Bottle Plastic 1L','raw','Pcs',1,30,[],0,0,10),
    mkItem('CG Sauce Cheese','raw','Gram',1000,1,[],0,0,1000),
    mkItem('Coffee Kenangan Blend','raw','Gram',1000,25,['2027-04-16','2027-04-17','2027-05-05'],0,0,2000),
    mkItem('Condensed Milk (SKM)','raw','Gram',1000,16,['2027-01-01'],0,0,2000),
    mkItem('Evaporated Milk (Carnation)','raw','Mililiter',405,48,['2027-02-01'],0,0,2000),
    mkItem('Hibiscus Tea','raw','Gram',100,1,['2029-02-19'],0,0,200),
    mkItem('KK Cup Hot 16 Oz','raw','Pcs',25,20,[],0,0,50),
    mkItem('KK Cup Ice 14 Oz','raw','Pcs',50,40,[],0,0,100),
    mkItem('KK Boba Straw Plastic','condiment','Pac',1,1,[],0,0,5),
    mkItem('KK Trash Bag Besar','condiment','Pac',1,1,[],0,0,5),
    mkItem('KK Core Merch Press Cup','merch','Pcs',1,1,[],0,0,3),
  ];
}
function mkItem(name,category,uom,gramPerPac,pacPerCarton,expiryDates,stokGudang,stokBar,parLevel){
  return { id: uid(), name, category, uom, gramPerPac, pacPerCarton, expiryDates, stokGudang, stokBar, parLevel, lastSoDate:null };
}
function uid(){ return 'i'+Math.random().toString(36).slice(2,10); }

/* ---------------- State ---------------- */
let state = {
  items: load(LS_ITEMS, null) ?? seedData(),
  gudangLog: load(LS_GUDANG_LOG, null) ?? [],
  soLog: load(LS_SO_LOG, null) ?? [],
  tab: 'dashboard',
  search: '',
  catFilter: null
};
save(LS_ITEMS, state.items);
save(LS_GUDANG_LOG, state.gudangLog);
save(LS_SO_LOG, state.soLog);

function load(key, fallback){
  try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch(e){ return fallback; }
}
function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
function persistItems(){ save(LS_ITEMS, state.items); }
function persistGudangLog(){ save(LS_GUDANG_LOG, state.gudangLog); }
function persistSoLog(){ save(LS_SO_LOG, state.soLog); }

/* ---------------- Calculations ---------------- */
function daysToExpiry(dateStr){
  if(!dateStr) return Infinity;
  const d = new Date(dateStr);
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.round((d - now) / 86400000);
}
function nearestExpiry(item){
  if(!item.expiryDates || item.expiryDates.length===0) return null;
  const valid = item.expiryDates.filter(Boolean);
  if(valid.length===0) return null;
  return valid.map(d=>({d, days:daysToExpiry(d)})).sort((a,b)=>a.days-b.days)[0];
}
function itemStatus(item){
  if(item.stokGudang < 0) return 'baddata';
  const exp = nearestExpiry(item);
  if(exp && exp.days <= 14) return 'danger';
  if(item.stokBar < item.parLevel) return 'warn';
  return 'ok';
}
const STATUS_TAG = { baddata:'CEK DATA', danger:'EXPIRY', warn:'LOW', ok:'OK' };
const STATUS_PRIORITY = { baddata:0, danger:1, warn:2, ok:3 };
function fmt(n){
  if(n===null||n===undefined||isNaN(n)) return '0';
  return Math.round(n).toLocaleString('id-ID');
}
function esc(s){ return String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ---------------- Tabs / router ---------------- */
document.getElementById('tabs').addEventListener('click', e=>{
  const btn = e.target.closest('.tab');
  if(!btn) return;
  state.tab = btn.dataset.tab;
  render();
});
function setActiveTabUI(){
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active', t.dataset.tab===state.tab));
}
function tickClock(){
  const el = document.getElementById('clock');
  const now = new Date();
  el.textContent = now.toLocaleDateString('id-ID',{weekday:'short',day:'2-digit',month:'short',year:'numeric'});
}
setInterval(tickClock, 60000); tickClock();

/* ---------------- Alert strip ---------------- */
function renderAlerts(){
  const strip = document.getElementById('alertStrip');
  const msgs = [];
  const baddata = state.items.filter(it=>it.stokGudang<0);
  if(baddata.length>0){
    msgs.push(`<span>🛑 <b>${baddata.length} barang stok Gudang minus</b> — cek &amp; betulkan di Master Barang</span>`);
  }
  state.items.forEach(it=>{
    const exp = nearestExpiry(it);
    if(exp && exp.days <= 14){
      msgs.push(`<span>⚠ <b>${esc(it.name)}</b> exp ${exp.days<0?'LEWAT':'dlm '+exp.days+' hr'} (${exp.d})</span>`);
    }
  });
  const lowCount = state.items.filter(it=>itemStatus(it)==='warn').length;
  if(lowCount>0) msgs.unshift(`<span><b>${lowCount}</b> barang stok Bar di bawah batas minimum</span>`);
  if(msgs.length===0){ strip.classList.add('hidden'); strip.innerHTML=''; return; }
  strip.classList.remove('hidden');
  strip.innerHTML = msgs.join('<span style="opacity:.4">&nbsp;•&nbsp;</span>');
}

/* ---------------- Render root ---------------- */
function render(){
  setActiveTabUI();
  renderAlerts();
  const c = document.getElementById('content');
  if(state.tab==='dashboard') c.innerHTML = viewDashboard();
  else if(state.tab==='master') c.innerHTML = viewMaster();
  else if(state.tab==='gudang') c.innerHTML = viewGudang();
  else if(state.tab==='so') c.innerHTML = viewSO();
  else if(state.tab==='restock') c.innerHTML = viewRestock();
  else if(state.tab==='settings') c.innerHTML = viewSettings();
  bindTabEvents();
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function viewDashboard(){
  const total = state.items.length;
  const danger = state.items.filter(it=>itemStatus(it)==='danger').length;
  const warn = state.items.filter(it=>itemStatus(it)==='warn').length;
  const baddataCount = state.items.filter(it=>it.stokGudang<0).length;

  const rows = [...state.items]
    .map(it=>({it, status:itemStatus(it)}))
    .sort((a,b)=>STATUS_PRIORITY[a.status]-STATUS_PRIORITY[b.status])
    .slice(0,15);

  return `
    <div class="section-head">
      <div>
        <div class="section-title">Ringkasan Stok</div>
        <div class="section-sub">Gudang + Bar hari ini — ${state.items.length} SKU terdaftar</div>
      </div>
    </div>
    <div class="kpi-row">
      <div class="kpi"><div class="num mono">${total}</div><div class="lbl">Total SKU</div></div>
      <div class="kpi danger"><div class="num mono">${danger}</div><div class="lbl">Mendekati Kadaluarsa</div></div>
      <div class="kpi warn"><div class="num mono">${warn}</div><div class="lbl">Bar Di Bawah Batas</div></div>
      ${baddataCount>0 ? `<div class="kpi baddata"><div class="num mono">${baddataCount}</div><div class="lbl">Stok Gudang Minus</div></div>` : ''}
    </div>

    <div class="section-title" style="margin-bottom:10px;">Perhatian Utama</div>
    <div class="ledger">
      <div class="ledger-row head" style="grid-template-columns:2fr 0.9fr 0.9fr 1fr 0.9fr;">
        <div class="ledger-cell">Nama Barang</div>
        <div class="ledger-cell">Gudang</div>
        <div class="ledger-cell">Bar</div>
        <div class="ledger-cell">Batas Min</div>
        <div class="ledger-cell">Status</div>
      </div>
      ${rows.map(({it,status})=>`
        <div class="ledger-row status-${status}" style="grid-template-columns:2fr 0.9fr 0.9fr 1fr 0.9fr;">
          <div class="ledger-cell">${esc(it.name)}<span class="small-note">${esc(CATEGORY_LABELS[it.category])}</span></div>
          <div class="ledger-cell num-cell">${fmt(it.stokGudang)}</div>
          <div class="ledger-cell num-cell">${fmt(it.stokBar)}</div>
          <div class="ledger-cell num-cell">${fmt(it.parLevel)}</div>
          <div class="ledger-cell"><span class="tag ${status}">${STATUS_TAG[status]}</span></div>
        </div>
      `).join('') || '<div class="empty">Belum ada data barang.</div>'}
    </div>
  `;
}

/* ============================================================
   MASTER BARANG
   ============================================================ */
function viewMaster(){
  const items = filteredItems();
  return `
    <div class="section-head">
      <div>
        <div class="section-title">Master Barang</div>
        <div class="section-sub">Data induk barang + batas minimum Bar per SKU</div>
      </div>
      <div class="btn-row">
        <button class="btn" id="btnAddItem">+ Tambah Barang</button>
        <button class="btn secondary" id="btnImportCsv">Import CSV</button>
        <button class="btn secondary" id="btnExportCsv">Export CSV</button>
      </div>
    </div>

    <div class="pill-group">
      <span class="pill ${state.catFilter?'':'active'}" data-cat="">Semua</span>
      <span class="pill ${state.catFilter==='raw'?'active':''}" data-cat="raw">Raw Material</span>
      <span class="pill ${state.catFilter==='condiment'?'active':''}" data-cat="condiment">Condiment</span>
      <span class="pill ${state.catFilter==='merch'?'active':''}" data-cat="merch">Merchandise</span>
    </div>
    <div class="searchbar"><input type="text" id="searchInput" placeholder="Cari nama barang..." value="${esc(state.search)}"></div>

    <div class="ledger">
      <div class="ledger-row head" style="grid-template-columns:2fr 0.7fr 0.8fr 0.8fr 0.8fr 0.6fr;">
        <div class="ledger-cell">Nama</div>
        <div class="ledger-cell">UOM</div>
        <div class="ledger-cell">Gudang</div>
        <div class="ledger-cell">Bar</div>
        <div class="ledger-cell">Batas Min</div>
        <div class="ledger-cell">Aksi</div>
      </div>
      ${items.map(it=>{
        const status = itemStatus(it);
        return `<div class="ledger-row status-${status}" style="grid-template-columns:2fr 0.7fr 0.8fr 0.8fr 0.8fr 0.6fr;">
          <div class="ledger-cell">${esc(it.name)}<span class="small-note">${esc(CATEGORY_LABELS[it.category])}</span></div>
          <div class="ledger-cell num-cell">${esc(it.uom)}</div>
          <div class="ledger-cell num-cell">${fmt(it.stokGudang)}</div>
          <div class="ledger-cell num-cell">${fmt(it.stokBar)}</div>
          <div class="ledger-cell num-cell">${fmt(it.parLevel)}</div>
          <div class="ledger-cell"><button class="btn ghost" data-edit="${it.id}" style="padding:5px 8px;">Edit</button></div>
        </div>`;
      }).join('') || '<div class="empty">Tidak ada barang cocok. Tambah barang baru atau import CSV.</div>'}
    </div>
  `;
}
function filteredItems(){
  return state.items.filter(it=>{
    if(state.catFilter && it.category!==state.catFilter) return false;
    if(state.search && !it.name.toLowerCase().includes(state.search.toLowerCase())) return false;
    return true;
  });
}

function openItemModal(itemId){
  const editing = itemId ? state.items.find(i=>i.id===itemId) : null;
  const it = editing ?? { id:null, name:'', category:'raw', uom:'Gram', gramPerPac:1000, pacPerCarton:1, expiryDates:[], stokGudang:0, stokBar:0, parLevel:0 };
  const modal = `
    <div class="modal-bg" id="modalBg">
      <div class="modal">
        <div class="modal-title">${editing?'Edit Barang':'Tambah Barang'}</div>
        <div class="field"><label>Nama Barang</label><input type="text" id="f_name" value="${esc(it.name)}"></div>
        <div class="field-row">
          <div class="field"><label>Kategori</label>
            <select id="f_category">
              <option value="raw" ${it.category==='raw'?'selected':''}>Raw Material</option>
              <option value="condiment" ${it.category==='condiment'?'selected':''}>Condiment / Kitchen</option>
              <option value="merch" ${it.category==='merch'?'selected':''}>Merchandise</option>
            </select>
          </div>
          <div class="field"><label>UOM</label><input type="text" id="f_uom" value="${esc(it.uom)}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Isi per Pac</label><input type="number" id="f_gramPerPac" class="mono" value="${it.gramPerPac}"></div>
          <div class="field"><label>Pac per Carton</label><input type="number" id="f_pacPerCarton" class="mono" value="${it.pacPerCarton}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Stok Gudang</label><input type="number" id="f_gudang" class="mono" value="${it.stokGudang}"></div>
          <div class="field"><label>Stok Bar (SO terakhir)</label><input type="number" id="f_bar" class="mono" value="${it.stokBar}"></div>
        </div>
        <div class="field"><label>Batas Minimum Bar (highlight kalau di bawah ini)</label><input type="number" id="f_par" class="mono" value="${it.parLevel}"></div>
        <div class="field"><label>Tanggal Kadaluarsa (pisahkan koma, YYYY-MM-DD)</label><input type="text" id="f_expiry" value="${esc((it.expiryDates||[]).join(', '))}" placeholder="2027-01-15, 2027-03-09"></div>
        <div class="btn-row" style="margin-top:14px;justify-content:space-between;">
          <div>${editing? '<button class="btn danger" id="btnDeleteItem">Hapus</button>' : ''}</div>
          <div class="btn-row">
            <button class="btn ghost" id="btnCancelModal">Batal</button>
            <button class="btn" id="btnSaveItem">Simpan</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modalRoot').innerHTML = modal;
  document.getElementById('btnCancelModal').onclick = closeModal;
  document.getElementById('modalBg').addEventListener('click', e=>{ if(e.target.id==='modalBg') closeModal(); });
  if(editing){
    document.getElementById('btnDeleteItem').onclick = ()=>{
      if(confirm('Hapus barang ini?')){
        state.items = state.items.filter(i=>i.id!==editing.id);
        persistItems(); closeModal(); render();
      }
    };
  }
  document.getElementById('btnSaveItem').onclick = ()=>{
    const name = document.getElementById('f_name').value.trim();
    if(!name){ alert('Nama barang wajib diisi'); return; }
    const data = {
      name,
      category: document.getElementById('f_category').value,
      uom: document.getElementById('f_uom').value.trim(),
      gramPerPac: parseFloat(document.getElementById('f_gramPerPac').value)||1,
      pacPerCarton: parseFloat(document.getElementById('f_pacPerCarton').value)||1,
      stokGudang: parseFloat(document.getElementById('f_gudang').value)||0,
      stokBar: parseFloat(document.getElementById('f_bar').value)||0,
      parLevel: parseFloat(document.getElementById('f_par').value)||0,
      expiryDates: document.getElementById('f_expiry').value.split(',').map(s=>s.trim()).filter(Boolean)
    };
    if(editing){ Object.assign(editing, data); }
    else { state.items.push({ id: uid(), lastSoDate:null, ...data }); }
    persistItems();
    closeModal();
    render();
  };
}
function closeModal(){ document.getElementById('modalRoot').innerHTML=''; }

/* ---------------- CSV import/export ---------------- */
function itemsToCsv(){
  const header = ['name','category','uom','gramPerPac','pacPerCarton','stokGudang','stokBar','parLevel','expiryDates'];
  const rows = state.items.map(it=>[
    it.name, it.category, it.uom, it.gramPerPac, it.pacPerCarton, it.stokGudang, it.stokBar, it.parLevel,
    (it.expiryDates||[]).join('|')
  ]);
  return [header, ...rows].map(r=>r.map(csvEscape).join(',')).join('\n');
}
function csvEscape(v){
  const s = String(v??'');
  return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
}
function parseCsv(text){
  const lines = text.split(/\r?\n/).filter(l=>l.trim().length>0);
  return lines.map(line=>{
    const out=[]; let cur=''; let inQ=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i];
      if(inQ){ if(ch==='"'){ if(line[i+1]==='"'){cur+='"';i++;} else inQ=false; } else cur+=ch; }
      else { if(ch==='"') inQ=true; else if(ch===','){ out.push(cur); cur=''; } else cur+=ch; }
    }
    out.push(cur);
    return out;
  });
}
function downloadFile(filename, content, mime){
  const blob = new Blob([content], {type:mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download=filename; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

/* ============================================================
   STOK GUDANG (IN dari Warehouse, OUT ke Bar)
   ============================================================ */
function viewGudang(){
  const items = filteredItems();
  const recent = [...state.gudangLog].slice(-40).reverse();
  return `
    <div class="section-head">
      <div>
        <div class="section-title">Stok Gudang</div>
        <div class="section-sub">IN = barang masuk dari Warehouse &middot; OUT = barang diambil ke Bar (wajib diisi barista)</div>
      </div>
    </div>
    <div class="searchbar"><input type="text" id="searchInput" placeholder="Cari barang..." value="${esc(state.search)}"></div>
    <div class="ledger">
      <div class="ledger-row head" style="grid-template-columns:1.8fr 0.8fr 0.9fr 1fr 0.9fr;">
        <div class="ledger-cell">Nama</div>
        <div class="ledger-cell">Gudang</div>
        <div class="ledger-cell">IN</div>
        <div class="ledger-cell">OUT ke Bar</div>
        <div class="ledger-cell">Aksi</div>
      </div>
      ${items.map(it=>`
        <div class="ledger-row status-${itemStatus(it)}" style="grid-template-columns:1.8fr 0.8fr 0.9fr 1fr 0.9fr;">
          <div class="ledger-cell">${esc(it.name)}<span class="small-note">${esc(it.uom)}</span></div>
          <div class="ledger-cell num-cell">${fmt(it.stokGudang)}</div>
          <div class="ledger-cell"><input type="number" class="qty-input in-input" data-id="${it.id}" placeholder="0"></div>
          <div class="ledger-cell"><input type="number" class="qty-input out-input" data-id="${it.id}" placeholder="0"></div>
          <div class="ledger-cell"><button class="btn ghost apply-log" data-id="${it.id}" style="padding:5px 8px;">Simpan</button></div>
        </div>
      `).join('') || '<div class="empty">Tidak ada barang.</div>'}
    </div>

    <div class="section-title" style="margin-bottom:10px;">Riwayat Terakhir</div>
    <div class="ledger">
      <div class="ledger-row head" style="grid-template-columns:1.1fr 2fr 0.8fr 0.9fr;">
        <div class="ledger-cell">Tanggal</div><div class="ledger-cell">Barang</div><div class="ledger-cell">Tipe</div><div class="ledger-cell">Qty</div>
      </div>
      ${recent.map(l=>{
        const it = state.items.find(i=>i.id===l.itemId);
        return `<div class="ledger-row status-${l.type==='in'?'ok':'warn'}" style="grid-template-columns:1.1fr 2fr 0.8fr 0.9fr;">
          <div class="ledger-cell num-cell">${esc(l.date)}</div>
          <div class="ledger-cell">${esc(it? it.name : '(dihapus)')}</div>
          <div class="ledger-cell"><span class="tag ${l.type==='in'?'ok':'warn'}">${l.type==='in'?'IN':'OUT'}</span></div>
          <div class="ledger-cell num-cell">${fmt(l.qty)}</div>
        </div>`;
      }).join('') || '<div class="empty">Belum ada transaksi.</div>'}
    </div>
  `;
}

/* ============================================================
   SO HARIAN (Bar) — hitung fisik harian, overwrite stok Bar
   ============================================================ */
function viewSO(){
  const items = filteredItems();
  const recent = [...state.soLog].slice(-40).reverse();
  return `
    <div class="section-head">
      <div>
        <div class="section-title">SO Harian (Bar)</div>
        <div class="section-sub">Input hasil hitung fisik barista di Bar — angka ini langsung jadi Stok Bar (bukan tambah/kurang)</div>
      </div>
    </div>
    <div class="searchbar"><input type="text" id="searchInput" placeholder="Cari barang..." value="${esc(state.search)}"></div>
    <div class="ledger">
      <div class="ledger-row head" style="grid-template-columns:2fr 0.8fr 1fr 1fr 0.8fr;">
        <div class="ledger-cell">Nama</div>
        <div class="ledger-cell">Bar Saat Ini</div>
        <div class="ledger-cell">SO Terakhir</div>
        <div class="ledger-cell">Hasil SO Hari Ini</div>
        <div class="ledger-cell">Aksi</div>
      </div>
      ${items.map(it=>`
        <div class="ledger-row status-${itemStatus(it)}" style="grid-template-columns:2fr 0.8fr 1fr 1fr 0.8fr;">
          <div class="ledger-cell">${esc(it.name)}<span class="small-note">${esc(it.uom)} &middot; batas ${fmt(it.parLevel)}</span></div>
          <div class="ledger-cell num-cell">${fmt(it.stokBar)}</div>
          <div class="ledger-cell num-cell" style="font-size:11px;color:var(--text-dim);">${it.lastSoDate?esc(it.lastSoDate):'belum pernah'}</div>
          <div class="ledger-cell"><input type="number" class="qty-input so-input" data-id="${it.id}" placeholder="${it.stokBar}"></div>
          <div class="ledger-cell"><button class="btn ghost apply-so" data-id="${it.id}" style="padding:5px 8px;">Simpan</button></div>
        </div>
      `).join('') || '<div class="empty">Tidak ada barang.</div>'}
    </div>

    <div class="section-title" style="margin-bottom:10px;">Riwayat SO</div>
    <div class="ledger">
      <div class="ledger-row head" style="grid-template-columns:1.1fr 2fr 1fr;">
        <div class="ledger-cell">Tanggal</div><div class="ledger-cell">Barang</div><div class="ledger-cell">Hasil SO</div>
      </div>
      ${recent.map(l=>{
        const it = state.items.find(i=>i.id===l.itemId);
        return `<div class="ledger-row" style="grid-template-columns:1.1fr 2fr 1fr;">
          <div class="ledger-cell num-cell">${esc(l.date)}</div>
          <div class="ledger-cell">${esc(it? it.name : '(dihapus)')}</div>
          <div class="ledger-cell num-cell">${fmt(l.qty)}</div>
        </div>`;
      }).join('') || '<div class="empty">Belum ada riwayat SO.</div>'}
    </div>
  `;
}

/* ============================================================
   PERLU RESTOCK — item dengan Bar < Batas Minimum
   ============================================================ */
function viewRestock(){
  const needing = state.items
    .filter(it=>it.stokBar < it.parLevel)
    .map(it=>({it, gap: it.parLevel - it.stokBar}))
    .sort((a,b)=>b.gap-a.gap);

  return `
    <div class="section-head">
      <div>
        <div class="section-title">Perlu Restock</div>
        <div class="section-sub">Barang dengan Stok Bar di bawah Batas Minimum — cek Gudang buat mindahin, atau order dari Warehouse kalau Gudang juga menipis</div>
      </div>
    </div>
    <div class="ledger">
      <div class="ledger-row head" style="grid-template-columns:2fr 0.9fr 0.9fr 0.9fr 1.4fr;">
        <div class="ledger-cell">Nama</div>
        <div class="ledger-cell">Bar</div>
        <div class="ledger-cell">Batas Min</div>
        <div class="ledger-cell">Kurang</div>
        <div class="ledger-cell">Gudang</div>
      </div>
      ${needing.map(({it,gap})=>{
        const gudangCukup = it.stokGudang >= gap;
        return `<div class="ledger-row status-warn" style="grid-template-columns:2fr 0.9fr 0.9fr 0.9fr 1.4fr;">
          <div class="ledger-cell">${esc(it.name)}<span class="small-note">${esc(it.uom)}</span></div>
          <div class="ledger-cell num-cell">${fmt(it.stokBar)}</div>
          <div class="ledger-cell num-cell">${fmt(it.parLevel)}</div>
          <div class="ledger-cell num-cell" style="color:var(--warn);font-weight:600;">${fmt(gap)}</div>
          <div class="ledger-cell">
            <span class="num-cell">${fmt(it.stokGudang)}</span>
            <span class="small-note" style="color:${gudangCukup?'var(--ok)':'var(--danger)'}">${gudangCukup?'Gudang cukup, pindahin ke Bar':'Gudang juga menipis — order Warehouse'}</span>
          </div>
        </div>`;
      }).join('') || '<div class="empty">Semua barang di Bar masih di atas batas minimum. 🎉</div>'}
    </div>
  `;
}

/* ============================================================
   SETTINGS
   ============================================================ */
function viewSettings(){
  return `
    <div class="section-head">
      <div><div class="section-title">Pengaturan</div><div class="section-sub">Cadangan data &amp; reset</div></div>
    </div>
    <div class="card">
      <label style="margin-bottom:10px;">Cadangan Data</label>
      <div class="btn-row">
        <button class="btn secondary" id="btnBackup">Export Backup (JSON)</button>
        <button class="btn secondary" id="btnRestore">Import Backup (JSON)</button>
        <button class="btn danger" id="btnResetData">Reset ke Data Contoh</button>
      </div>
      <div class="small-note">Semua data tersimpan di perangkat ini (localStorage). Export backup secara berkala agar data tidak hilang.</div>
    </div>
    <div class="card">
      <label style="margin-bottom:10px;">Cara Kerja Singkat</label>
      <div class="small-note">
        <b>IN</b> (Stok Gudang) = barang masuk dari Warehouse ke Gudang toko.<br>
        <b>OUT</b> (Stok Gudang) = barang diambil dari Gudang ke Bar, wajib diisi barista tiap kali ambil.<br>
        <b>SO Harian</b> = hasil hitung fisik barista di Bar tiap hari, langsung jadi Stok Bar (overwrite, bukan tambah/kurang).<br>
        <b>Batas Minimum</b> diatur per barang di Master Barang — kalau Stok Bar di bawah itu, muncul highlight LOW &amp; masuk daftar Perlu Restock.
      </div>
    </div>
  `;
}

/* ============================================================
   EVENT BINDING
   ============================================================ */
function bindTabEvents(){
  const search = document.getElementById('searchInput');
  if(search){ search.oninput = (e)=>{ state.search = e.target.value; renderKeepFocus('searchInput'); }; }
  document.querySelectorAll('.pill[data-cat]').forEach(p=>{
    p.onclick = ()=>{ state.catFilter = p.dataset.cat || null; render(); };
  });

  const btnAdd = document.getElementById('btnAddItem');
  if(btnAdd) btnAdd.onclick = ()=>openItemModal(null);
  document.querySelectorAll('[data-edit]').forEach(b=>{ b.onclick = ()=>openItemModal(b.dataset.edit); });

  const btnImp = document.getElementById('btnImportCsv');
  if(btnImp) btnImp.onclick = importCsvFlow;
  const btnExp = document.getElementById('btnExportCsv');
  if(btnExp) btnExp.onclick = ()=>downloadFile('kk-master-barang.csv', itemsToCsv(), 'text/csv');

  // Stok Gudang: IN/OUT
  document.querySelectorAll('.apply-log').forEach(b=>{
    b.onclick = ()=>{
      const id = b.dataset.id;
      const inEl = document.querySelector(`.in-input[data-id="${id}"]`);
      const outEl = document.querySelector(`.out-input[data-id="${id}"]`);
      const inQty = parseFloat(inEl.value)||0;
      const outQty = parseFloat(outEl.value)||0;
      if(inQty===0 && outQty===0) return;
      const it = state.items.find(i=>i.id===id);
      const projected = it.stokGudang + inQty - outQty;
      if(projected < 0){
        const ok = confirm(`Stok Gudang ${it.name} akan jadi minus (${fmt(projected)} ${it.uom}).\nBiasanya ini tanda qty OUT salah ketik, atau stok awal Gudang belum diisi yang benar.\n\nTetap lanjutkan?`);
        if(!ok) return;
      }
      const today = new Date().toISOString().slice(0,10);
      if(inQty!==0){ it.stokGudang += inQty; state.gudangLog.push({id:uid(),itemId:id,date:today,type:'in',qty:inQty}); }
      if(outQty!==0){ it.stokGudang -= outQty; state.gudangLog.push({id:uid(),itemId:id,date:today,type:'out',qty:outQty}); }
      persistItems(); persistGudangLog(); render();
    };
  });

  // SO Harian
  document.querySelectorAll('.apply-so').forEach(b=>{
    b.onclick = ()=>{
      const id = b.dataset.id;
      const input = document.querySelector(`.so-input[data-id="${id}"]`);
      if(input.value===''){ return; }
      const val = parseFloat(input.value);
      if(isNaN(val) || val < 0){ alert('Hasil SO tidak boleh minus.'); return; }
      const it = state.items.find(i=>i.id===id);
      const today = new Date().toISOString().slice(0,10);
      it.stokBar = val;
      it.lastSoDate = today;
      state.soLog.push({id:uid(),itemId:id,date:today,qty:val});
      persistItems(); persistSoLog(); render();
    };
  });

  // settings
  const btnBackup = document.getElementById('btnBackup');
  if(btnBackup) btnBackup.onclick = ()=>{
    const data = JSON.stringify({items:state.items, gudangLog:state.gudangLog, soLog:state.soLog}, null, 2);
    downloadFile('kk-inventory-backup.json', data, 'application/json');
  };
  const btnRestore = document.getElementById('btnRestore');
  if(btnRestore) btnRestore.onclick = ()=>{
    const inp = document.createElement('input');
    inp.type='file'; inp.accept='.json,application/json';
    inp.onchange = ()=>{
      const file = inp.files[0]; if(!file) return;
      const reader = new FileReader();
      reader.onload = ()=>{
        try{
          const data = JSON.parse(reader.result);
          if(data.items){ state.items=data.items; persistItems(); }
          if(data.gudangLog){ state.gudangLog=data.gudangLog; persistGudangLog(); }
          if(data.soLog){ state.soLog=data.soLog; persistSoLog(); }
          render();
          alert('Backup berhasil dimuat.');
        }catch(e){ alert('File backup tidak valid.'); }
      };
      reader.readAsText(file);
    };
    inp.click();
  };
  const btnReset = document.getElementById('btnResetData');
  if(btnReset) btnReset.onclick = ()=>{
    if(confirm('Ini akan menghapus semua data dan mengganti dengan data contoh. Lanjutkan?')){
      state.items = seedData(); state.gudangLog = []; state.soLog = [];
      persistItems(); persistGudangLog(); persistSoLog(); render();
    }
  };
}

function renderKeepFocus(inputId){
  const el = document.getElementById(inputId);
  const pos = el.selectionStart;
  render();
  const el2 = document.getElementById(inputId);
  if(el2){ el2.focus(); el2.setSelectionRange(pos,pos); }
}

/* ---------------- CSV import flow ---------------- */
function importCsvFlow(){
  const inp = document.createElement('input');
  inp.type='file'; inp.accept='.csv,text/csv';
  inp.onchange = ()=>{
    const file = inp.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      const rows = parseCsv(reader.result);
      const header = rows[0].map(h=>h.trim().toLowerCase());
      const idx = (name)=>header.indexOf(name);
      let added=0, updated=0;
      for(let i=1;i<rows.length;i++){
        const r = rows[i];
        if(r.length<2 || !r[idx('name')]) continue;
        const name = r[idx('name')];
        const data = {
          name,
          category: r[idx('category')] || 'raw',
          uom: r[idx('uom')] || 'Gram',
          gramPerPac: parseFloat(r[idx('gramperpac')]) || 1,
          pacPerCarton: parseFloat(r[idx('pacpercarton')])||1,
          stokGudang: parseFloat(r[idx('stokgudang')])||0,
          stokBar: parseFloat(r[idx('stokbar')])||0,
          parLevel: parseFloat(r[idx('parlevel')])||0,
          expiryDates: (r[idx('expirydates')]||'').split('|').map(s=>s.trim()).filter(Boolean)
        };
        const existing = state.items.find(x=>x.name.toLowerCase()===name.toLowerCase());
        if(existing){ Object.assign(existing, data); updated++; }
        else { state.items.push({id:uid(), lastSoDate:null, ...data}); added++; }
      }
      persistItems();
      render();
      alert(`Import selesai: ${added} baru, ${updated} diperbarui.`);
    };
    reader.readAsText(file);
  };
  inp.click();
}

/* ---------------- init ---------------- */
render();
