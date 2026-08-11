// ================= PENGATURAN DATABASE EXCEL =================
const SPREADSHEET_ID_AREA = '1u5iAIbYnBx82_O5E5-qkvaaLfFkPA28ZDFsnNqkpNiI'; 
const SPREADSHEET_ID_RMFT = '1QcmScgfkySEFbXESFDdItlloz5vWLtjVT8VptV6O8z8'; 
const GID_RMFT = '689362966'; 

let globalDataArea = [];
let globalDataRMFT = [];

const areaMapping = {
    "AREA_1": { nama: "Area 1 Jember", cabang: ["banyuwangi", "genteng", "bondowoso", "jember"] },
    "AREA_2": { nama: "Area 2 Probolinggo", cabang: ["situbondo", "lumajang", "probolinggo", "pasuruan"] },
    "AREA_3": { nama: "Area 3 Malang", cabang: ["malang kawi", "malang martadinata", "malang sutoyo", "malang soekarno hatta", "kepanjen", "batu"] },
    "AREA_4": { nama: "Area 4 Pacitan", cabang: ["pacitan", "trenggalek", "blitar"] },
    "AREA_5": { nama: "Area 5 Kediri", cabang: ["kediri", "pare", "nganjuk"] },
    "AREA_6": { nama: "Area 6 Madiun", cabang: ["madiun", "magetan", "ponorogo"] }
};

let currentMode = 'ALL'; 
let currentTarget = 'ALL';
let currentDashboardType = 'Kinerja Area'; 

const safeStr = (val) => (val !== undefined && val !== null) ? String(val).trim() : '';
const cleanNum = (val, mult=1) => {
    if(!val) return 0;
    let parsed = parseFloat(String(val).replace(/,/g,''));
    return (isNaN(parsed) ? 0 : parsed) * mult;
};

// ================= MESIN EKSTRAK DATA CERDAS =================
function extractActualData(json, kw1, kw2) {
    if (!json || !json.table) return [];
    let headers = json.table.cols.map(c => c ? safeStr(c.label) : '');
    let headerRowIndex = -1;
    let headersStr = headers.join(' ').toLowerCase();
    
    if (!headersStr.includes(kw1) && !headersStr.includes(kw2)) {
        for(let i = 0; i < Math.min(10, json.table.rows.length); i++) {
            let rowVals = json.table.rows[i].c.map(cell => cell ? safeStr(cell.v).toLowerCase() : '');
            if(rowVals.join(' ').includes(kw1) || rowVals.join(' ').includes(kw2)) {
                headerRowIndex = i;
                headers = json.table.rows[i].c.map(cell => cell ? safeStr(cell.v) : '');
                break;
            }
        }
    }
    
    let parsedData = [];
    for(let i = headerRowIndex + 1; i < json.table.rows.length; i++) {
        let row = json.table.rows[i];
        let rowData = {};
        let hasData = false;
        headers.forEach((header, index) => {
            if(header) {
                let cell = row.c ? row.c[index] : null;
                let val = cell ? ((cell.f !== undefined && cell.f !== null) ? cell.f : (cell.v !== null ? cell.v : '')) : '';
                rowData[header] = val;
                if(val !== '') hasData = true;
            }
        });
        if(hasData) parsedData.push(rowData);
    }
    return parsedData;
}

// ================= INISIALISASI DROPDOWN AREA/CABANG =================
function buildAreaDropdown(selectId) {
    let sel = document.getElementById(selectId);
    sel.innerHTML = '<option value="ALL">🌟 Seluruh Area</option>';
    for(let key in areaMapping) {
        sel.innerHTML += `<option value="${key}">${areaMapping[key].nama}</option>`;
    }
}

function buildCabangDropdown(selectId, areaKey) {
    let sel = document.getElementById(selectId);
    sel.innerHTML = '<option value="ALL">-- Semua Cabang --</option>';
    
    if(areaKey === 'ALL') {
        for(let key in areaMapping) {
            let group = document.createElement('optgroup');
            group.label = areaMapping[key].nama;
            areaMapping[key].cabang.forEach(c => {
                let label = c.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                group.innerHTML += `<option value="${c}">${label}</option>`;
            });
            sel.appendChild(group);
        }
    } else if (areaMapping[areaKey]) {
        areaMapping[areaKey].cabang.forEach(c => {
            let label = c.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            sel.innerHTML += `<option value="${c}">${label}</option>`;
        });
    }
}

function initDropdowns() {
    buildAreaDropdown('areaSelectArea');
    buildAreaDropdown('areaSelectRMFT');
    buildCabangDropdown('cabangSelectArea', 'ALL');
    buildCabangDropdown('cabangSelectRMFT', 'ALL');
}

// ================= FUNGSI NAVIGASI =================
function setMode(e, el, mode, dashboardType) {
    if(e) e.preventDefault();
    currentMode = mode;
    currentDashboardType = dashboardType;
    currentTarget = el ? (el.getAttribute('data-val') || 'ALL') : currentTarget; 

    document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
    if(el) el.classList.add('active');

    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active-page'));
    
    let parentArea = 'ALL';
    if (currentMode === 'AREA') parentArea = currentTarget;
    else if (currentMode === 'CABANG') {
        for(let key in areaMapping) {
            if(areaMapping[key].cabang.includes(currentTarget)) { parentArea = key; break; }
        }
    }

    const areaSelId = dashboardType === 'Kinerja RMFT' ? 'areaSelectRMFT' : 'areaSelectArea';
    const cabangSelId = dashboardType === 'Kinerja RMFT' ? 'cabangSelectRMFT' : 'cabangSelectArea';

    document.getElementById(areaSelId).value = parentArea;
    buildCabangDropdown(cabangSelId, parentArea);
    
    if (currentMode === 'CABANG') {
        document.getElementById(cabangSelId).value = currentTarget;
    }

    if(dashboardType === 'Kinerja RMFT') {
        document.getElementById('page-rmft').classList.add('active-page');
        populateRMDataList(); 
    } else {
        document.getElementById('page-area').classList.add('active-page');
        renderAreaDashboard();
    }
}

function onTopFilterAreaChange(dashboardType) {
    const areaSelId = dashboardType === 'Kinerja RMFT' ? 'areaSelectRMFT' : 'areaSelectArea';
    const cabangSelId = dashboardType === 'Kinerja RMFT' ? 'cabangSelectRMFT' : 'cabangSelectArea';
    
    const selectedArea = document.getElementById(areaSelId).value;
    
    currentMode = selectedArea === 'ALL' ? 'ALL' : 'AREA';
    currentTarget = selectedArea;
    currentDashboardType = dashboardType;

    buildCabangDropdown(cabangSelId, selectedArea);
    syncSidebarMenu();

    if(dashboardType === 'Kinerja RMFT') populateRMDataList(); 
    else renderAreaDashboard();
}

function onTopFilterCabangChange(dashboardType) {
    const areaSelId = dashboardType === 'Kinerja RMFT' ? 'areaSelectRMFT' : 'areaSelectArea';
    const cabangSelId = dashboardType === 'Kinerja RMFT' ? 'cabangSelectRMFT' : 'cabangSelectArea';
    
    const selectedCabang = document.getElementById(cabangSelId).value;
    
    if (selectedCabang === 'ALL') {
        const selectedArea = document.getElementById(areaSelId).value;
        currentMode = selectedArea === 'ALL' ? 'ALL' : 'AREA';
        currentTarget = selectedArea;
    } else {
        currentMode = 'CABANG';
        currentTarget = selectedCabang;
    }
    
    currentDashboardType = dashboardType;
    syncSidebarMenu();

    if(dashboardType === 'Kinerja RMFT') populateRMDataList(); 
    else renderAreaDashboard();
}

function syncSidebarMenu() {
    document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
    
    if (currentDashboardType === 'Kinerja RMFT') {
        const rmftMenu = document.querySelector(`.sidebar-menu a[data-type="Kinerja RMFT"]`);
        if(rmftMenu) rmftMenu.classList.add('active');
    } else {
        const targetSidebarItem = document.querySelector(`.sidebar-menu a[data-val="${currentTarget}"][data-type="${currentDashboardType}"]`);
        if (targetSidebarItem) {
            targetSidebarItem.classList.add('active');
            const parentNested = targetSidebarItem.closest('.nested-menu');
            if (parentNested) {
                parentNested.style.display = 'block';
                parentNested.previousElementSibling.classList.add('open');
            }
        }
    }
}

// ================= UI LOGIN & BASIC =================
function checkAuth() {
    if (localStorage.getItem('bri_dashboard_auth') === 'true') {
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('dashboard-page').style.display = 'block';
        initDropdowns(); 
        if (!chartTrend) initCharts();
        fetchDataFromGoogleSheets(); 
    } else {
        document.getElementById('login-page').style.display = 'flex';
        document.getElementById('dashboard-page').style.display = 'none';
    }
}
function handleLogin(e) {
    e.preventDefault();
    if (document.getElementById('pnInput').value === '00123456' && document.getElementById('passInput').value === 'admin') {
        document.getElementById('login-error').style.display = 'none'; localStorage.setItem('bri_dashboard_auth', 'true'); checkAuth();
    } else { document.getElementById('login-error').style.display = 'block'; }
}
function handleLogout() {
    localStorage.removeItem('bri_dashboard_auth'); checkAuth();
}
function toggleProfile() { document.getElementById("profileDropdown").classList.toggle("show"); }
function toggleMenu(el) {
    const isOpen = el.classList.contains("open");
    const subMenu = el.nextElementSibling;
    if (isOpen) { el.classList.remove("open"); subMenu.style.display = "none"; } else { el.classList.add("open"); subMenu.style.display = "block"; }
}
function toggleNested(e, el) {
    e.preventDefault();
    const isOpen = el.classList.contains("open");
    const nestedMenu = el.nextElementSibling;
    document.querySelectorAll('.nested-toggler').forEach(toggler => { toggler.classList.remove("open"); toggler.nextElementSibling.style.display = "none"; });
    if (!isOpen) { el.classList.add("open"); nestedMenu.style.display = "block"; }
}
function switchPage(e, el, targetPageId) {
    e.preventDefault();
    document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
    el.classList.add('active');
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active-page'));
    document.getElementById(targetPageId).classList.add('active-page');
}

// ================= GRAFIK AREA =================
Chart.register(ChartDataLabels); 
let chartTrend; 

function initCharts() {
    const ctxTrend = document.getElementById('chartTrend').getContext('2d');
    chartTrend = new Chart(ctxTrend, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Trend Saldo', data: [], borderColor: '#0857C3', backgroundColor: 'rgba(8, 87, 195, 0.1)', borderWidth: 3, pointRadius: 6, pointHoverRadius: 8, pointBackgroundColor: '#0857C3', fill: true, tension: 0.4 }]},
        options: { 
            responsive: true, maintainAspectRatio: false, 
            layout: { padding: { top: 35, right: 30, left: 20, bottom: 10 } },
            plugins: { 
                legend: { display: false }, 
                datalabels: { align: 'top', anchor: 'end', offset: 5, color: '#0857C3', font: { weight: 'bold', size: 10 },
                    formatter: function(value) {
                        if(!value) return '';
                        if(value >= 1000000000000) return (value / 1000000000000).toFixed(2) + ' T';
                        if(value >= 1000000000) return (value / 1000000000).toFixed(2) + ' M';
                        if(value >= 1000000) return (value / 1000000).toFixed(2) + ' Jt';
                        return value.toLocaleString('id-ID');
                    }
                }
            }, 
            scales: { 
                x: { grid: { display: true, color: '#e0e0e0', drawBorder: false }, ticks: { font: { size: 10, weight: 'bold' } } },
                y: { display: false, beginAtZero: false } 
            }, 
            animation: { duration: 800 } 
        }
    });
}

// ================= TARIK DATA API =================
function fetchDataFromGoogleSheets() {
    const statusArea = document.getElementById('data-status-area');
    const statusRMFT = document.getElementById('data-status-rmft');
    
    statusArea.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sync Area...'; statusArea.className = 'loading';
    statusRMFT.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sync RMFT...'; statusRMFT.className = 'loading';

    const scriptArea = document.createElement('script');
    scriptArea.src = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID_AREA}/gviz/tq?tqx=responseHandler:prosesDataArea`;
    scriptArea.onerror = () => { statusArea.innerHTML = 'Error Area'; statusArea.className = 'error'; };
    document.body.appendChild(scriptArea);

    const scriptRMFT = document.createElement('script');
    scriptRMFT.src = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID_RMFT}/gviz/tq?gid=${GID_RMFT}&tqx=responseHandler:prosesDataRMFT`;
    scriptRMFT.onerror = () => { statusRMFT.innerHTML = 'Error RMFT'; statusRMFT.className = 'error'; };
    document.body.appendChild(scriptRMFT);
}

window.prosesDataArea = function(json) {
    const statusArea = document.getElementById('data-status-area');
    if (!json || json.status === 'error') { statusArea.innerHTML = 'Error Area'; statusArea.className = 'error'; return; }
    
    globalDataArea = extractActualData(json, 'cabang', 'produk');
    statusArea.innerHTML = '<i class="fa-solid fa-circle-check"></i> Online'; statusArea.className = 'ready';
    if(currentDashboardType === 'Kinerja Area') renderAreaDashboard();
}

window.prosesDataRMFT = function(json) {
    const statusRMFT = document.getElementById('data-status-rmft');
    if (!json || json.status === 'error') { statusRMFT.innerHTML = 'Error RMFT'; statusRMFT.className = 'error'; return; }
    
    globalDataRMFT = extractActualData(json, 'nama rm', 'pn');
    statusRMFT.innerHTML = '<i class="fa-solid fa-circle-check"></i> Online'; statusRMFT.className = 'ready';
    if(currentDashboardType === 'Kinerja RMFT') populateRMDataList();
}

// ================= RENDER DASHBOARD AREA =================
function renderTop5List(data, elementId, colorClass) {
    const ul = document.getElementById(elementId);
    ul.innerHTML = '';
    if(data.length === 0) { ul.innerHTML = '<li style="justify-content:center; color:#999; font-style:italic;">Data cabang spesifik belum tersedia di tabel</li>'; return; }
    data.forEach((item, index) => {
        let displayVal = "";
        if(item.saldo >= 1000000000000) displayVal = (item.saldo / 1000000000000).toFixed(2) + ' Triliun';
        else if(item.saldo >= 1000000000) displayVal = (item.saldo / 1000000000).toFixed(2) + ' Milyar';
        else if(item.saldo >= 1000000) displayVal = (item.saldo / 1000000).toFixed(2) + ' Juta';
        else displayVal = item.saldo.toLocaleString('id-ID');

        const li = document.createElement('li');
        li.innerHTML = `<span class="cabang-name"><i class="fa-solid fa-medal" style="${index===0?'color:#FF8F00;':index===1?'color:#c0c0c0;':index===2?'color:#cd7f32;':''}"></i> ${item.cabang}</span><span class="cabang-val" style="color:${colorClass};">Rp ${displayVal}</span>`;
        ul.appendChild(li);
    });
}

function renderAreaDashboard() {
    if (globalDataArea.length === 0) return;

    const filterSegmen = document.getElementById('segmentSelect').value; 
    const selectedProduk = document.getElementById('produkSelect').value;
    const rawDate = document.getElementById('periodeSelectArea').value; 
    
    let dateTarget1 = "", dateTarget2 = "";
    if (rawDate) {
        const dateObj = new Date(rawDate);
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        dateTarget1 = `${String(dateObj.getDate()).padStart(2, '0')}-${months[dateObj.getMonth()]}`; 
        dateTarget2 = `${String(dateObj.getDate()).padStart(2, '0')} ${months[dateObj.getMonth()]}`; 
    }

    let judul = "Dashboard Kinerja Area";
    if (currentMode === 'AREA') {
        const aSel = document.getElementById('areaSelectArea');
        judul += ` - ${aSel.options[aSel.selectedIndex].text}`;
    } else if (currentMode === 'CABANG') {
        const cSel = document.getElementById('cabangSelectArea');
        judul += ` - Cabang ${cSel.options[cSel.selectedIndex].text}`;
    } else {
        judul += " (Seluruh Area)";
    }
    document.getElementById('dynamic-title-area').innerText = judul;

    const keys = Object.keys(globalDataArea[0]);
    const keyArea = keys.find(k => k.toLowerCase().match(/area|cabang/));
    const keyRowLabel = keys.find(k => k.toLowerCase().match(/row label|produk/));
    const keyParent = keys.find(k => k.toLowerCase().match(/parent product/));
    const keySegment = keys.find(k => k.toLowerCase().match(/segment/));
    const keySection = keys.find(k => k.toLowerCase().match(/section/));
    const keyUnit = keys.find(k => k.toLowerCase().match(/unit/));

    let dpkKeys = keys.filter(k => k.toLowerCase().match(/posisi dpk|saldo/));
    let keySaldo = dateTarget1 ? dpkKeys.find(k => k.includes(dateTarget1) || k.includes(dateTarget2)) : null;
    if (!keySaldo && dpkKeys.length > 0) keySaldo = dpkKeys[dpkKeys.length - 1]; 
    
    let deltaKeys = keys.filter(k => k.toLowerCase().match(/delta vs/));
    let keyRkaDelta = deltaKeys.find(k => k.toLowerCase().match(/rka/));
    let timeDeltas = deltaKeys.filter(k => !k.toLowerCase().match(/rka/));
    let keyYTD = timeDeltas.find(k => k.toLowerCase().match(/dec/)) || timeDeltas[0];
    let keyMTD = timeDeltas.find(k => k.toLowerCase().match(/jul|jun|sep|okt|nov|apr|may|mar|feb|jan/)) || timeDeltas[1] || timeDeltas[0];
    let keyDTD = timeDeltas.find(k => k.includes(dateTarget1) || k.includes(dateTarget2));
    if(!keyDTD) keyDTD = timeDeltas.find(k => k.toLowerCase().match(/aug|hari|kemarin|04|05|06/)) || timeDeltas[timeDeltas.length - 1];

    let pctKeys = keys.filter(k => k.toLowerCase().match(/%|pencapaian/));
    let keyRkaPct = pctKeys.find(k => k.toLowerCase().match(/rka/)) || pctKeys[0];

    let hasKanwilRow = globalDataArea.some(r => safeStr(r[keyArea]).toUpperCase().includes('TOTAL KANWIL'));

    let totals = { dpk: { saldo:0, dtd:0, mtd:0, ytd:0, rkaDelta:0, rkaTarget:0 }, tabungan: { saldo:0, dtd:0, mtd:0, ytd:0, rkaDelta:0, rkaTarget:0 }, giro: { saldo:0, dtd:0, mtd:0, ytd:0, rkaDelta:0, rkaTarget:0 }, deposito: { saldo:0, dtd:0, mtd:0, ytd:0, rkaDelta:0, rkaTarget:0 } };
    let cabangTabungan = {}, cabangGiro = {}, cabangDeposito = {};

    globalDataArea.forEach(row => {
        let valArea = safeStr(row[keyArea]).toUpperCase();
        let valSegment = keySegment ? safeStr(row[keySegment]).toUpperCase() : 'NON-WHOLESALE';
        let valSection = keySection ? safeStr(row[keySection]).toUpperCase() : 'VOLUME';
        let valRowLabel = keyRowLabel ? safeStr(row[keyRowLabel]).toLowerCase() : '';
        let valParentStr = keyParent ? safeStr(row[keyParent]).toLowerCase() : '';

        if (filterSegmen !== 'ALL') { if (!valSegment.includes(filterSegmen.toUpperCase())) return; } 
        else { if (valSegment !== 'NON-WHOLESALE' && valSegment !== '') return; }

        let multiplier = 1; if (keyUnit && safeStr(row[keyUnit]).toLowerCase().includes('juta')) multiplier = 1000000;

        let saldo = cleanNum(row[keySaldo], multiplier);
        let dtd = cleanNum(row[keyDTD], multiplier);
        let mtd = cleanNum(row[keyMTD], multiplier);
        let ytd = cleanNum(row[keyYTD], multiplier);
        let rkaDelta = cleanNum(row[keyRkaDelta], multiplier);
        
        let rkaTarget = 0;
        if(row[keyRkaPct]) { let pctAsli = cleanNum(row[keyRkaPct], 1); if(pctAsli > 0) rkaTarget = saldo / (pctAsli / 100); } 
        else { rkaTarget = saldo - rkaDelta; }
        
        let cleanCabang = valArea.replace(/KC /gi, '').replace(/\(.*\)/g, '').trim();

        if (valSection.includes('VOLUME') || valSection === '') {
            let matchAreaForTotals = false;
            if (currentMode === 'ALL') matchAreaForTotals = hasKanwilRow ? valArea.includes('TOTAL KANWIL') : true;
            else if (currentMode === 'AREA') matchAreaForTotals = (areaMapping[currentTarget]?.cabang || []).some(allowed => valArea.toLowerCase().includes(allowed));
            else matchAreaForTotals = valArea.toLowerCase().includes(currentTarget.toLowerCase());

            if (matchAreaForTotals && !valParentStr) {
                if (valRowLabel.includes('tabungan')) { totals.tabungan.saldo+=saldo; totals.tabungan.dtd+=dtd; totals.tabungan.mtd+=mtd; totals.tabungan.ytd+=ytd; totals.tabungan.rkaDelta+=rkaDelta; totals.tabungan.rkaTarget+=rkaTarget; }
                else if (valRowLabel.includes('giro')) { totals.giro.saldo+=saldo; totals.giro.dtd+=dtd; totals.giro.mtd+=mtd; totals.giro.ytd+=ytd; totals.giro.rkaDelta+=rkaDelta; totals.giro.rkaTarget+=rkaTarget;}
                else if (valRowLabel.includes('deposito')) { totals.deposito.saldo+=saldo; totals.deposito.dtd+=dtd; totals.deposito.mtd+=mtd; totals.deposito.ytd+=ytd; totals.deposito.rkaDelta+=rkaDelta; totals.deposito.rkaTarget+=rkaTarget;}
                
                totals.dpk.saldo+=saldo; totals.dpk.dtd+=dtd; totals.dpk.mtd+=mtd; totals.dpk.ytd+=ytd; totals.dpk.rkaDelta+=rkaDelta; totals.dpk.rkaTarget+=rkaTarget;
            }
        }

        if ((valSection.includes('VOLUME') || valSection === '') && !valArea.includes('TOTAL KANWIL')) {
            let matchAreaForTop5 = false;
            if (currentMode === 'ALL') matchAreaForTop5 = true;
            else if (currentMode === 'AREA') matchAreaForTop5 = (areaMapping[currentTarget]?.cabang || []).some(allowed => valArea.toLowerCase().includes(allowed));
            else matchAreaForTop5 = valArea.toLowerCase().includes(currentTarget.toLowerCase());

            if (matchAreaForTop5 && !valParentStr) {
                if (valRowLabel.includes('tabungan')) cabangTabungan[cleanCabang] = (cabangTabungan[cleanCabang] || 0) + saldo;
                if (valRowLabel.includes('giro')) cabangGiro[cleanCabang] = (cabangGiro[cleanCabang] || 0) + saldo;
                if (valRowLabel.includes('deposito')) cabangDeposito[cleanCabang] = (cabangDeposito[cleanCabang] || 0) + saldo;
            }
        }
    });

    const formatUangShort = (num) => {
        if(num >= 1000000000000) return (num / 1000000000000).toFixed(2) + ' T';
        if(num >= 1000000000) return (num / 1000000000).toFixed(2) + ' M';
        if(num >= 1000000) return (num / 1000000).toFixed(2) + ' Jt';
        return num.toLocaleString('id-ID');
    };
    const formatDelta = (val) => {
        if(Math.abs(val) < 0.01) return `<div class="neutral">-</div>`;
        let isPos = val >= 0;
        return `<div class="${isPos?'up':'down'}"><i class="fa-solid ${isPos?'fa-caret-up':'fa-caret-down'}"></i> ${isPos?'+':'-'}${formatUangShort(Math.abs(val))}</div>`;
    };

    ['dpk', 'tabungan', 'giro', 'deposito'].forEach(cat => {
        document.getElementById(`val-${cat}`).innerText = "Rp " + formatUangShort(totals[cat].saldo);
        document.getElementById(`pct-${cat}`).innerText = (totals[cat].rkaTarget !== 0 ? (totals[cat].saldo / totals[cat].rkaTarget) * 100 : 0).toFixed(1) + "%";
        document.getElementById(`dtd-${cat}`).innerHTML = formatDelta(totals[cat].dtd);
        document.getElementById(`mtd-${cat}`).innerHTML = formatDelta(totals[cat].mtd);
        document.getElementById(`ytd-${cat}`).innerHTML = formatDelta(totals[cat].ytd);
        document.getElementById(`rka-${cat}`).innerHTML = formatDelta(totals[cat].rkaDelta);
    });

    if(chartTrend) {
        const colorMap = { 'DPK': '#0857C3', 'TABUNGAN': '#FF8F00', 'GIRO': '#307FE2', 'DEPOSITO': '#05CD99' };
        const bgMap = { 'DPK': 'rgba(8, 87, 195, 0.1)', 'TABUNGAN': 'rgba(255, 143, 0, 0.1)', 'GIRO': 'rgba(48, 127, 226, 0.1)', 'DEPOSITO': 'rgba(5, 205, 153, 0.1)' };

        const selProdukEl = document.getElementById('produkSelect');
        document.getElementById('chart-title').innerText = `Grafik Trend Saldo - ${selProdukEl.options[selProdukEl.selectedIndex].text}`;
        document.getElementById('chart-title').style.color = colorMap[selectedProduk];

        chartTrend.data.datasets[0].borderColor = colorMap[selectedProduk];
        chartTrend.data.datasets[0].backgroundColor = bgMap[selectedProduk];
        chartTrend.data.datasets[0].pointBackgroundColor = colorMap[selectedProduk];
        chartTrend.options.plugins.datalabels.color = colorMap[selectedProduk];

        let trendLabels = [];
        let trendValues = [];

        dpkKeys.forEach(k => {
            let label = k.replace(/Posisi DPK|Saldo/ig, '').trim(); 
            if(!label) label = k;
            trendLabels.push(label);

            let sumAtDate = 0;
            globalDataArea.forEach(row => {
                let valArea = safeStr(row[keyArea]).toUpperCase();
                let valSection = keySection ? safeStr(row[keySection]).toUpperCase() : 'VOLUME';
                let valRowLabel = keyRowLabel ? safeStr(row[keyRowLabel]).toLowerCase() : '';
                let valParentStr = keyParent ? safeStr(row[keyParent]).toLowerCase() : '';
                let valSegment = keySegment ? safeStr(row[keySegment]).toUpperCase() : 'NON-WHOLESALE';

                if (filterSegmen !== 'ALL') { if (!valSegment.includes(filterSegmen.toUpperCase())) return; } 
                else { if (valSegment !== 'NON-WHOLESALE' && valSegment !== '') return; }

                let multiplier = 1; if (keyUnit && safeStr(row[keyUnit]).toLowerCase().includes('juta')) multiplier = 1000000;
                let saldoAtDate = cleanNum(row[k], multiplier);

                if (valSection.includes('VOLUME') || valSection === '') {
                    let matchAreaForTotals = false;
                    if (currentMode === 'ALL') matchAreaForTotals = hasKanwilRow ? valArea.includes('TOTAL KANWIL') : true;
                    else if (currentMode === 'AREA') matchAreaForTotals = (areaMapping[currentTarget]?.cabang || []).some(allowed => valArea.toLowerCase().includes(allowed));
                    else matchAreaForTotals = valArea.toLowerCase().includes(currentTarget.toLowerCase());

                    if (matchAreaForTotals && !valParentStr) {
                        if (selectedProduk === 'DPK' && (valRowLabel.includes('tabungan') || valRowLabel.includes('giro') || valRowLabel.includes('deposito'))) sumAtDate += saldoAtDate;
                        else if (selectedProduk === 'TABUNGAN' && valRowLabel.includes('tabungan')) sumAtDate += saldoAtDate;
                        else if (selectedProduk === 'GIRO' && valRowLabel.includes('giro')) sumAtDate += saldoAtDate;
                        else if (selectedProduk === 'DEPOSITO' && valRowLabel.includes('deposito')) sumAtDate += saldoAtDate;
                    }
                }
            });
            trendValues.push(sumAtDate);
        });

        chartTrend.data.labels = trendLabels;
        chartTrend.data.datasets[0].data = trendValues;
        chartTrend.update();
    }

    const sortTop5 = (objObj) => Object.keys(objObj).map(cab => ({ cabang: cab, saldo: objObj[cab] })).sort((a, b) => b.saldo - a.saldo).slice(0, 5); 
    renderTop5List(sortTop5(cabangTabungan), 'list-top-tabungan', '#FF8F00');
    renderTop5List(sortTop5(cabangGiro), 'list-top-giro', '#307FE2');
    renderTop5List(sortTop5(cabangDeposito), 'list-top-deposito', '#05CD99');
}

// ================= RENDER RMFT DASHBOARD =================
function populateRMDataList() {
    if (globalDataRMFT.length === 0) return;
    const rmSelect = document.getElementById('rmSelect');
    rmSelect.innerHTML = '<option value="">-- Pilih Nama RM --</option>'; 

    const keys = Object.keys(globalDataRMFT[0]);
    const keyNamaRM = keys.find(k => k.toLowerCase().match(/nama rm/));
    const keyPn = keys.find(k => k.toLowerCase().match(/^pn$/));
    const keyCabang = keys.find(k => k.toLowerCase().match(/kantor cabang/));

    if(!keyNamaRM || !keyPn || !keyCabang) return;

    let rmSet = new Set();
    globalDataRMFT.forEach(row => {
        let nama = safeStr(row[keyNamaRM]);
        let pn = safeStr(row[keyPn]);
        let cabang = safeStr(row[keyCabang]).toUpperCase();

        if(!nama || !pn) return;

        let isMatch = false;
        if(currentMode === 'ALL') isMatch = true;
        else if(currentMode === 'AREA') {
            const allowedCabangs = areaMapping[currentTarget]?.cabang || [];
            isMatch = allowedCabangs.some(allowed => cabang.toLowerCase().includes(allowed));
        } else if(currentMode === 'CABANG') {
            isMatch = cabang.toLowerCase().includes(currentTarget.toLowerCase());
        }

        if(isMatch) {
            rmSet.add(`${pn} - ${nama}`);
        }
    });

    const sortedRMs = [...rmSet].sort();
    
    if (sortedRMs.length === 0) {
        rmSelect.innerHTML = '<option value="">-- Tidak Ada RM di Area Ini --</option>';
        clearRMFTUI();
        return;
    }

    sortedRMs.forEach(item => {
        let option = document.createElement('option');
        option.value = item;
        option.innerText = item;
        rmSelect.appendChild(option);
    });

    if(sortedRMs.length > 0) {
        rmSelect.selectedIndex = 1; 
        renderRMFTDashboard();
    }
}

function clearRMFTUI() {
    document.getElementById('rm-nama').innerText = "-";
    document.getElementById('rm-pn').innerText = "-";
    document.getElementById('rm-cabang').innerText = "-";
    document.getElementById('rm-uker').innerText = "-";
    document.getElementById('rm-status').innerText = "-";
    document.getElementById('rm-tmt').innerText = "-";
    document.getElementById('rm-jabatan').innerText = "-";
    document.getElementById('rm-masakerja').innerText = "-";
    document.getElementById('rm-jgpg').innerText = "-";
    document.getElementById('rm-score').innerText = "0.00";
    document.getElementById('rm-tier').innerText = "Tier -";
    document.querySelectorAll('.kpi-val-realisasi, .kpi-row .val:not(.kpi-val-realisasi), [id^="rm-p-"], [id^="rm-s-"]').forEach(el => el.innerText = "0");
    
    ['b-dpk','b-giro','b-tab','b-payroll','b-saltab','b-casa-edc','b-edc-prod','b-qris-prod','b-holding','b-sv-edc','b-sv-qris','b-qlola','b-brimo'].forEach(id => {
        let el = document.getElementById(id);
        if(el) { el.innerHTML = '<i class="fa-solid fa-minus"></i>'; el.classList.add("empty"); el.classList.remove("active-pct"); }
    });
}

function renderRMFTDashboard() {
    const searchVal = document.getElementById('rmSelect').value;
    if(!searchVal || globalDataRMFT.length === 0) {
        clearRMFTUI();
        return;
    }

    let judul = "Dashboard Kinerja RMFT";
    if (currentMode === 'AREA') {
        const aSel = document.getElementById('areaSelectRMFT');
        judul += ` - ${aSel.options[aSel.selectedIndex].text}`;
    } else if (currentMode === 'CABANG') {
        const cSel = document.getElementById('cabangSelectRMFT');
        judul += ` - Cabang ${cSel.options[cSel.selectedIndex].text}`;
    } else {
        judul += " - Seluruh Area";
    }
    document.getElementById('dynamic-title-rmft').innerText = judul;

    const keys = Object.keys(globalDataRMFT[0]);
    const findCol = (regex) => keys.find(k => k.toLowerCase().match(regex));
    
    const kNama = findCol(/nama rm/); const kPn = findCol(/^pn$/); const kCabang = findCol(/kantor cabang/);
    const kUker = findCol(/unit kerja/); const kJabatan = findCol(/jabatan/); const kStatus = findCol(/status/);
    const kTMT = findCol(/tmt/); const kMasaKerja = findCol(/masa kerja efek/); const kJG = findCol(/^jg$/); const kPG = findCol(/^pg$/);
    const kScore = findCol(/^score$/); const kTier = findCol(/^tier$/);

    const rmData = globalDataRMFT.find(row => {
        let n = safeStr(row[kNama]);
        let p = safeStr(row[kPn]);
        let combo = `${p} - ${n}`;
        return combo === searchVal;
    });

    if(!rmData) {
        clearRMFTUI();
        return;
    }

    const mapKPI = (regexStr) => {
        return {
            realisasi: findCol(new RegExp(`^(?!.*(target|%|score)).*${regexStr}`)),
            target: findCol(new RegExp(`target.*${regexStr}`)),
            pct: findCol(new RegExp(`% realisasi.*${regexStr}`)),
            score: findCol(new RegExp(`score.*${regexStr}`))
        };
    };

    const kpiCols = {
        dpk: mapKPI('daily average dpk retail'),
        saltab: mapKPI('posisi saldo tabungan'),
        avgcasa: mapKPI('casa merchant|casa merch'), 
        brimo: mapKPI('user aktif brimo'),
        avggiro: mapKPI('daily average giro retail'),
        svedc: mapKPI('sales volume merchant edc'),
        edcprod: mapKPI('jumlah merchant edc produktif'),
        qlola: mapKPI('user aktif qlola'),
        avgtab: mapKPI('daily average tabungan'),
        svqris: mapKPI('sales volume merchant qris'),
        qrisprod: mapKPI('jumlah merchant qris produktif'),
        holding: mapKPI('product holding'),
        payroll: mapKPI('new account payroll')
    };

    // Bersihkan nama RM dari PN sebelum ditampilkan di profil untuk kecantikan UI
    let displayNamaRM = safeStr(rmData[kNama]);

    document.getElementById('rm-nama').innerText = displayNamaRM;
    document.getElementById('rm-pn').innerText = safeStr(rmData[kPn]);
    document.getElementById('rm-cabang').innerText = safeStr(rmData[kCabang]);
    document.getElementById('rm-uker').innerText = safeStr(rmData[kUker]);
    document.getElementById('rm-status').innerText = safeStr(rmData[kStatus]);
    
    let tmtVal = safeStr(rmData[kTMT]);
    if (tmtVal.startsWith('Date')) {
        let m = tmtVal.match(/Date\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (m) tmtVal = `${String(m[3]).padStart(2,'0')}/${String(parseInt(m[2])+1).padStart(2,'0')}/${m[1]}`;
    }
    document.getElementById('rm-tmt').innerText = tmtVal;
    
    let jabatanStr = safeStr(rmData[kJabatan]).toUpperCase();
    document.getElementById('rm-jabatan').innerText = safeStr(rmData[kJabatan]);
    document.getElementById('rm-masakerja').innerText = safeStr(rmData[kMasaKerja]) + " Bulan";
    document.getElementById('rm-jgpg').innerText = `${safeStr(rmData[kJG])} / ${safeStr(rmData[kPG])}`;
    
    let totalScore = parseFloat(safeStr(rmData[kScore]).replace(/,/g,'.')) || 0;
    document.getElementById('rm-score').innerText = totalScore.toFixed(2);
    document.getElementById('rm-tier').innerText = safeStr(rmData[kTier]);

    let tierBox = document.getElementById('rm-tier');
    let tierStr = safeStr(rmData[kTier]).toLowerCase();
    if(tierStr.includes('1')) { tierBox.style.background = '#05CD99'; tierBox.style.color = '#fff'; }
    else if(tierStr.includes('2')) { tierBox.style.background = '#307FE2'; tierBox.style.color = '#fff'; }
    else if(tierStr.includes('3')) { tierBox.style.background = '#FF8F00'; tierBox.style.color = '#fff'; }
    else if(tierStr.includes('4')) { tierBox.style.background = '#EE5D50'; tierBox.style.color = '#fff'; }
    else { tierBox.style.background = '#9e9e9e'; tierBox.style.color = '#fff'; }

    const formatNum = (val, isMoney = false) => {
        let n = cleanNum(val);
        if(n === 0) return "0";
        if(!isMoney) return n.toLocaleString('id-ID', {maximumFractionDigits:2});
        if(n >= 1000000000) return (n / 1000000000).toFixed(2) + ' M';
        if(n >= 1000000) return (n / 1000000).toFixed(2) + ' Jt';
        return n.toLocaleString('id-ID');
    };

    const formatPct = (val) => {
        let str = safeStr(val);
        if(!str) return "0%";
        if(str.includes('%')) return str; 
        return (cleanNum(val) * 100).toFixed(2) + '%'; 
    };

    const setKPIBox = (kpiId, cols, isMoney = false) => {
        if(!cols.realisasi) return; 
        document.getElementById(`rm-r-${kpiId}`).innerText = formatNum(rmData[cols.realisasi], isMoney);
        document.getElementById(`rm-t-${kpiId}`).innerText = formatNum(rmData[cols.target], isMoney);
        document.getElementById(`rm-p-${kpiId}`).innerText = formatPct(rmData[cols.pct]);
        document.getElementById(`rm-s-${kpiId}`).innerText = cleanNum(rmData[cols.score]).toFixed(2);
    };

    setKPIBox('dpk', kpiCols.dpk, true);
    setKPIBox('saltab', kpiCols.saltab, true);
    setKPIBox('avgcasa', kpiCols.avgcasa, true); 
    setKPIBox('brimo', kpiCols.brimo, false);
    
    setKPIBox('avg-giro', kpiCols.avggiro, true);
    setKPIBox('sv-edc', kpiCols.svedc, true);
    setKPIBox('edc-prod', kpiCols.edcprod, false);
    setKPIBox('qlola', kpiCols.qlola, false);
    
    setKPIBox('avg-tab', kpiCols.avgtab, true);
    setKPIBox('sv-qris', kpiCols.svqris, true);
    setKPIBox('qris-prod', kpiCols.qrisprod, false);
    setKPIBox('holding', kpiCols.holding, false); 
    setKPIBox('payroll', kpiCols.payroll, false); 

    // ================== LOGIKA BOBOT ==================
    const bobotData = {
        "BUSINESS": { dpk: "10%", giro: "10%", tab: "20%", payroll: "10%", saltab: "10%", casa_edc: "10%", edc_prod: "10%", qris_prod: "", holding: "5%", sv_edc: "5%", sv_qris: "", qlola: "5%", brimo: "5%" },
        "BRANCH": { dpk: "15%", giro: "", tab: "25%", payroll: "", saltab: "15%", casa_edc: "", edc_prod: "7.50%", qris_prod: "7.50%", holding: "5%", sv_edc: "5%", sv_qris: "5%", qlola: "", brimo: "15%" },
        "UNIT": { dpk: "10%", giro: "", tab: "25%", payroll: "", saltab: "20%", casa_edc: "", edc_prod: "", qris_prod: "15%", holding: "5%", sv_edc: "", sv_qris: "10%", qlola: "", brimo: "15%" }
    };

    let activeBobot = { dpk: "", giro: "", tab: "", payroll: "", saltab: "", casa_edc: "", edc_prod: "", qris_prod: "", holding: "", sv_edc: "", sv_qris: "", qlola: "", brimo: "" };
    
    if (jabatanStr.includes("BUSINESS")) activeBobot = bobotData["BUSINESS"];
    else if (jabatanStr.includes("BRANCH")) activeBobot = bobotData["BRANCH"];
    else if (jabatanStr.includes("UNIT")) activeBobot = bobotData["UNIT"];

    const applyBobot = (id, val) => {
        let el = document.getElementById(id);
        if(el) {
            if(val === "") {
                el.innerHTML = '<i class="fa-solid fa-minus"></i>';
                el.classList.remove("active-pct");
                el.classList.add("empty");
            } else {
                el.innerText = val;
                el.classList.remove("empty");
                el.classList.add("active-pct");
            }
        }
    };

    applyBobot('b-dpk', activeBobot.dpk);
    applyBobot('b-giro', activeBobot.giro);
    applyBobot('b-tab', activeBobot.tab);
    applyBobot('b-payroll', activeBobot.payroll);
    applyBobot('b-saltab', activeBobot.saltab);
    applyBobot('b-casa-edc', activeBobot.casa_edc);
    applyBobot('b-edc-prod', activeBobot.edc_prod);
    applyBobot('b-qris-prod', activeBobot.qris_prod);
    applyBobot('b-holding', activeBobot.holding);
    applyBobot('b-sv-edc', activeBobot.sv_edc);
    applyBobot('b-sv-qris', activeBobot.sv_qris);
    applyBobot('b-qlola', activeBobot.qlola);
    applyBobot('b-brimo', activeBobot.brimo);
}

// Pastikan sistem jalan saat file dibuka
window.onload = function() {
    checkAuth();
};