// ================= PENGATURAN DATABASE EXCEL =================
const SPREADSHEET_ID_AREA = '1u5iAIbYnBx82_O5E5-qkvaaLfFkPA28ZDFsnNqkpNiI'; 
const SPREADSHEET_ID_RMFT = '1QcmScgfkySEFbXESFDdItlloz5vWLtjVT8VptV6O8z8'; 
const GID_RMFT = '689362966'; 

// ================= ID SPREADSHEET LOGIN =================
const SPREADSHEET_ID_LOGIN = '1wK2Uj1yyqkm17R9cIQrdZhXrwblcM3gmaiGI6k5IVgs';
const GID_LOGIN = '1611212161';
let loginAttemptPN = '';

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
    
    if (window.innerWidth <= 1024) toggleSidebar();
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

// ================= UI LOGIN DINAMIS =================
function showLoginError(msg) {
    const err = document.getElementById('login-error');
    err.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${msg}`;
    err.style.display = 'block';
}

function resetLoginBtn() {
    const btn = document.getElementById('btnLoginBtn');
    btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Masuk Sistem';
    btn.disabled = false;
}

function handleLogin(e) {
    e.preventDefault();
    loginAttemptPN = document.getElementById('pnInput').value.trim();
    let loginAttemptPass = document.getElementById('passInput').value.trim();

    if (loginAttemptPass !== 'BRI') {
        showLoginError("Password salah! (Gunakan: BRI)");
        return;
    }

    const btn = document.getElementById('btnLoginBtn');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memeriksa Data...';
    btn.disabled = true;
    document.getElementById('login-error').style.display = 'none';

    const scriptLogin = document.createElement('script');
    scriptLogin.src = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID_LOGIN}/gviz/tq?gid=${GID_LOGIN}&tqx=responseHandler:prosesDataLogin`;
    scriptLogin.onerror = () => { 
        showLoginError("Gagal terhubung ke database. Cek setting 'Share' di Google Sheets!"); 
        resetLoginBtn(); 
    };
    document.body.appendChild(scriptLogin);
}

window.prosesDataLogin = function(json) {
    resetLoginBtn();
    
    if (!json || json.status === 'error') {
        showLoginError("Gagal membaca database user!");
        return;
    }

    let userData = extractActualData(json, 'pn', 'nama'); 
    
    if(userData.length === 0) {
        showLoginError("Tabel database kosong atau format salah!");
        return;
    }

    let keys = Object.keys(userData[0]);
    let keyPn = keys.find(k => k.toLowerCase() === 'pn' || k.toLowerCase().includes('pn'));
    let keyNama = keys.find(k => k.toLowerCase() === 'nama' || k.toLowerCase().includes('nama'));

    let foundUser = userData.find(row => safeStr(row[keyPn]) === loginAttemptPN);

    if (foundUser) {
        localStorage.setItem('bri_dashboard_auth', 'true');
        localStorage.setItem('bri_user_nama', safeStr(foundUser[keyNama]));
        localStorage.setItem('bri_user_pn', loginAttemptPN);
        document.getElementById('login-error').style.display = 'none';
        
        checkAuth(); 
    } else {
        showLoginError("PN Anda tidak terdaftar di sistem!");
    }
}

function checkAuth() {
    if (localStorage.getItem('bri_dashboard_auth') === 'true') {
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('dashboard-page').style.display = 'block';
        
        let namaUser = localStorage.getItem('bri_user_nama') || 'Admin View';
        let pnUser = localStorage.getItem('bri_user_pn') || '00123456';
        
        let namaPendek = namaUser.split(' ').slice(0, 2).join(' ');
        
        document.getElementById('display-nama-header').innerText = namaPendek; 
        document.getElementById('display-nama-dropdown').innerText = namaUser;
        document.getElementById('display-pn-dropdown').innerText = pnUser;

        initDropdowns(); 
        if (!chartTabungan) initCharts(); 
        fetchDataFromGoogleSheets(); 
    } else {
        document.getElementById('login-page').style.display = 'flex';
        document.getElementById('dashboard-page').style.display = 'none';
    }
}

function handleLogout() {
    localStorage.removeItem('bri_dashboard_auth');
    localStorage.removeItem('bri_user_nama');
    localStorage.removeItem('bri_user_pn');
    checkAuth();
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
    if (window.innerWidth <= 1024) toggleSidebar();
}

function toggleSidebar() {
    const sidebar = document.getElementById("mainSidebar");
    const overlay = document.getElementById("sidebar-overlay");
    if (sidebar.classList.contains("show")) {
        sidebar.classList.remove("show");
        overlay.style.display = "none";
    } else {
        sidebar.classList.add("show");
        overlay.style.display = "block";
    }
}

// ================= INISIASI 4 GRAFIK TIME SERIES =================
Chart.register(ChartDataLabels); 
let chartTabungan, chartGiro, chartDeposito, chartDPK; 

function createTimeSeriesChart(canvasId, titleColor) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const labels1to31 = Array.from({length: 31}, (_, i) => i + 1);
    
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels1to31,
            datasets: [
                { label: 'Dec-25', data: [], borderColor: '#05CD99', backgroundColor: 'transparent', borderWidth: 2.5, pointRadius: 3, tension: 0.3 },
                { label: 'Jun-26', data: [], borderColor: '#307FE2', backgroundColor: 'transparent', borderWidth: 2.5, pointRadius: 3, tension: 0.3 },
                { label: 'Jul-26', data: [], borderColor: '#EE5D50', backgroundColor: 'transparent', borderWidth: 2.5, pointRadius: 3, tension: 0.3 },
                { label: 'Aug-26', data: [], borderColor: '#4b5563', backgroundColor: 'transparent', borderWidth: 2.5, pointRadius: 3, tension: 0.3 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            layout: { padding: { top: 25, right: 20, left: 10, bottom: 5 } },
            plugins: {
                legend: { 
                    display: true, 
                    position: 'bottom', 
                    labels: { boxWidth: 15, font: { size: 11, weight: 'bold' } } 
                },
                datalabels: {
                    display: function(context) {
                        return context.dataIndex === 0 || context.dataIndex === context.dataset.data.length - 1;
                    },
                    align: 'top',
                    color: titleColor,
                    font: { weight: 'bold', size: 10 },
                    formatter: function(value) {
                        if(!value) return '';
                        if(value >= 1000000) return (value / 1000000).toFixed(1) + ' Jt';
                        return value.toLocaleString('id-ID');
                    }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' } } },
                y: { 
                    display: true, 
                    grid: { color: '#e0e5f2' },
                    ticks: { 
                        font: { size: 10 }, 
                        callback: function(value) { return value >= 1000000 ? (value / 1000000) + 'M' : value; } 
                    } 
                }
            },
            animation: { duration: 800 }
        }
    });
}

function initCharts() {
    chartTabungan = createTimeSeriesChart('chartTabungan', '#FF8F00');
    chartGiro = createTimeSeriesChart('chartGiro', '#307FE2');
    chartDeposito = createTimeSeriesChart('chartDeposito', '#05CD99');
    chartDPK = createTimeSeriesChart('chartDPK', '#0857C3');
}

// ================= TARIK DATA API AREA & RMFT =================
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

// ================= RENDER DASHBOARD AREA & LOGIKA TOP 5 =================
function renderTop5List(data, elementId, colorClass, isHigh = true) {
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
        
        let iconHtml = '';
        if (isHigh) {
            iconHtml = `<i class="fa-solid fa-medal" style="${index===0?'color:#FF8F00;':index===1?'color:#c0c0c0;':index===2?'color:#cd7f32;':''}"></i>`;
        } else {
            iconHtml = `<i class="fa-solid fa-circle-down" style="color:#ee5d50;"></i>`;
        }

        li.innerHTML = `<span class="cabang-name">${iconHtml} ${item.cabang}</span><span class="cabang-val" style="color:${colorClass};">Rp ${displayVal}</span>`;
        ul.appendChild(li);
    });
}

function renderAreaDashboard() {
    if (globalDataArea.length === 0) return;

    const filterSegmen = document.getElementById('segmentSelect').value; 
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
    let keyYOY = deltaKeys.find(k => k.toLowerCase().match(/yoy|year/));
    let timeDeltas = deltaKeys.filter(k => !k.toLowerCase().match(/rka|yoy/));
    let keyYTD = timeDeltas.find(k => k.toLowerCase().match(/dec/)) || timeDeltas[0];
    let keyMTD = timeDeltas.find(k => k.toLowerCase().match(/jul|jun|sep|okt|nov|apr|may|mar|feb|jan/)) || timeDeltas[1] || timeDeltas[0];
    let keyDTD = timeDeltas.find(k => k.includes(dateTarget1) || k.includes(dateTarget2));
    if(!keyDTD) keyDTD = timeDeltas.find(k => k.toLowerCase().match(/aug|hari|kemarin|04|05|06/)) || timeDeltas[timeDeltas.length - 1];

    let pctKeys = keys.filter(k => k.toLowerCase().match(/%|pencapaian/));
    let keyRkaPct = pctKeys.find(k => k.toLowerCase().match(/rka/)) || pctKeys[0];

    let hasKanwilRow = globalDataArea.some(r => safeStr(r[keyArea]).toUpperCase().includes('TOTAL KANWIL'));

    let totals = { dpk: { saldo:0, dtd:0, mtd:0, ytd:0, yoy:0, rkaTarget:0 }, tabungan: { saldo:0, dtd:0, mtd:0, ytd:0, yoy:0, rkaTarget:0 }, giro: { saldo:0, dtd:0, mtd:0, ytd:0, yoy:0, rkaTarget:0 }, deposito: { saldo:0, dtd:0, mtd:0, ytd:0, yoy:0, rkaTarget:0 } };
    
    // Siapkan object untuk menampung saldo per cabang
    let cabangData = {
        tabungan: {},
        giro: {},
        deposito: {},
        dpk: {}
    };

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
        let yoy = keyYOY ? cleanNum(row[keyYOY], multiplier) : 0;
        
        let rkaTarget = 0;
        if(row[keyRkaPct]) { let pctAsli = cleanNum(row[keyRkaPct], 1); if(pctAsli > 0) rkaTarget = saldo / (pctAsli / 100); } 
        
        let cleanCabang = valArea.replace(/KC /gi, '').replace(/\(.*\)/g, '').trim();

        if (valSection.includes('VOLUME') || valSection === '') {
            let matchAreaForTotals = false;
            if (currentMode === 'ALL') matchAreaForTotals = hasKanwilRow ? valArea.includes('TOTAL KANWIL') : true;
            else if (currentMode === 'AREA') matchAreaForTotals = (areaMapping[currentTarget]?.cabang || []).some(allowed => valArea.toLowerCase().includes(allowed));
            else matchAreaForTotals = valArea.toLowerCase().includes(currentTarget.toLowerCase());

            if (matchAreaForTotals && !valParentStr) {
                if (valRowLabel.includes('tabungan')) { totals.tabungan.saldo+=saldo; totals.tabungan.dtd+=dtd; totals.tabungan.mtd+=mtd; totals.tabungan.ytd+=ytd; totals.tabungan.yoy+=yoy; totals.tabungan.rkaTarget+=rkaTarget; }
                else if (valRowLabel.includes('giro')) { totals.giro.saldo+=saldo; totals.giro.dtd+=dtd; totals.giro.mtd+=mtd; totals.giro.ytd+=ytd; totals.giro.yoy+=yoy; totals.giro.rkaTarget+=rkaTarget;}
                else if (valRowLabel.includes('deposito')) { totals.deposito.saldo+=saldo; totals.deposito.dtd+=dtd; totals.deposito.mtd+=mtd; totals.deposito.ytd+=ytd; totals.deposito.yoy+=yoy; totals.deposito.rkaTarget+=rkaTarget;}
                
                totals.dpk.saldo+=saldo; totals.dpk.dtd+=dtd; totals.dpk.mtd+=mtd; totals.dpk.ytd+=ytd; totals.dpk.yoy+=yoy; totals.dpk.rkaTarget+=rkaTarget;
            }
        }

        if ((valSection.includes('VOLUME') || valSection === '') && !valArea.includes('TOTAL KANWIL')) {
            let matchAreaForTop5 = false;
            if (currentMode === 'ALL') matchAreaForTop5 = true;
            else if (currentMode === 'AREA') matchAreaForTop5 = (areaMapping[currentTarget]?.cabang || []).some(allowed => valArea.toLowerCase().includes(allowed));
            else matchAreaForTop5 = valArea.toLowerCase().includes(currentTarget.toLowerCase());

            if (matchAreaForTop5 && !valParentStr) {
                if (valRowLabel.includes('tabungan')) {
                    cabangData.tabungan[cleanCabang] = (cabangData.tabungan[cleanCabang] || 0) + saldo;
                    cabangData.dpk[cleanCabang] = (cabangData.dpk[cleanCabang] || 0) + saldo;
                }
                if (valRowLabel.includes('giro')) {
                    cabangData.giro[cleanCabang] = (cabangData.giro[cleanCabang] || 0) + saldo;
                    cabangData.dpk[cleanCabang] = (cabangData.dpk[cleanCabang] || 0) + saldo;
                }
                if (valRowLabel.includes('deposito')) {
                    cabangData.deposito[cleanCabang] = (cabangData.deposito[cleanCabang] || 0) + saldo;
                    cabangData.dpk[cleanCabang] = (cabangData.dpk[cleanCabang] || 0) + saldo;
                }
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
        if(Math.abs(val) < 0.01) return `<div class="val-delta neutral">-</div>`;
        let isPos = val >= 0;
        return `<div class="val-delta ${isPos?'up':'down'}"><i class="fa-solid ${isPos?'fa-caret-up':'fa-caret-down'}"></i> ${formatUangShort(Math.abs(val))}</div>`;
    };

    ['dpk', 'tabungan', 'giro', 'deposito'].forEach(cat => {
        document.getElementById(`val-${cat}`).innerText = "Rp " + formatUangShort(totals[cat].saldo);
        document.getElementById(`pct-${cat}`).innerText = (totals[cat].rkaTarget !== 0 ? (totals[cat].saldo / totals[cat].rkaTarget) * 100 : 0).toFixed(1) + "%";
        document.getElementById(`dtd-${cat}`).innerHTML = formatDelta(totals[cat].dtd);
        document.getElementById(`mtd-${cat}`).innerHTML = formatDelta(totals[cat].mtd);
        document.getElementById(`ytd-${cat}`).innerHTML = formatDelta(totals[cat].ytd);
        document.getElementById(`yoy-${cat}`).innerHTML = formatDelta(totals[cat].yoy);
    });

    // ================== GENERATE QUICK INSIGHT ==================
    let dpkPct = (totals.dpk.rkaTarget !== 0) ? ((totals.dpk.saldo / totals.dpk.rkaTarget) * 100).toFixed(1) : 0;
    let dpkSurplus = totals.dpk.saldo - totals.dpk.rkaTarget;
    let surplusText = dpkSurplus >= 0 ? `surplus <b>Rp ${formatUangShort(dpkSurplus)}</b>` : `defisit <b>Rp ${formatUangShort(Math.abs(dpkSurplus))}</b>`;

    let mtdVal = totals.dpk.mtd;
    let mtdPct = (totals.dpk.saldo - mtdVal) !== 0 ? (mtdVal / (totals.dpk.saldo - mtdVal) * 100).toFixed(1) : 0;
    let mtdStatus = mtdVal >= 0 ? "positif" : "negatif";

    let ytdPct = (totals.dpk.saldo - totals.dpk.ytd) !== 0 ? (totals.dpk.ytd / (totals.dpk.saldo - totals.dpk.ytd) * 100).toFixed(1) : 0;
    let yoyPct = (totals.dpk.saldo - totals.dpk.yoy) !== 0 ? (totals.dpk.yoy / (totals.dpk.saldo - totals.dpk.yoy) * 100).toFixed(1) : 0;

    let monthName = new Date(rawDate || new Date()).toLocaleString('id-ID', { month: 'long' });
    let segmentName = filterSegmen === 'ALL' ? 'Total Konsolidasi' : filterSegmen;

    let insightStr = `Kinerja DPK ${segmentName} telah mencapai <b>${dpkPct}%</b> dari target dengan ${surplusText}. Namun momentum bulan ${monthName} tercatat sedikit <b>${mtdStatus}</b>, yaitu MTD ${mtdVal < 0 ? '-' : '+'}Rp ${formatUangShort(Math.abs(mtdVal))} (${mtdVal > 0 ? '+' : ''}${mtdPct}%). Secara fundamental, kinerja secara keseluruhan masih <b>${totals.dpk.ytd >= 0 ? 'tumbuh' : 'menurun'}</b>, dengan YTD tercatat <b>${totals.dpk.ytd > 0 ? '+' : ''}${ytdPct}%</b> dan secara YoY tercatat <b>${totals.dpk.yoy > 0 ? '+' : ''}${yoyPct}%</b>.`;

    document.getElementById('quick-insight-text').innerHTML = insightStr;

    // ================== UPDATE 4 GRAFIK TIME SERIES ==================
    if(chartTabungan && chartGiro && chartDeposito && chartDPK) {
        chartTabungan.data.datasets[0].data = []; 
        chartTabungan.data.datasets[1].data = []; 
        chartTabungan.data.datasets[2].data = []; 
        chartTabungan.data.datasets[3].data = []; 
        chartTabungan.update();

        chartGiro.data.datasets[0].data = [];
        chartGiro.data.datasets[1].data = [];
        chartGiro.data.datasets[2].data = [];
        chartGiro.data.datasets[3].data = [];
        chartGiro.update();

        chartDeposito.data.datasets[0].data = [];
        chartDeposito.data.datasets[1].data = [];
        chartDeposito.data.datasets[2].data = [];
        chartDeposito.data.datasets[3].data = [];
        chartDeposito.update();

        chartDPK.data.datasets[0].data = [];
        chartDPK.data.datasets[1].data = [];
        chartDPK.data.datasets[2].data = [];
        chartDPK.data.datasets[3].data = [];
        chartDPK.update();
    }

    // ================== LOGIKA SORTING TOP 5 (TERTINGGI & TERENDAH) ==================
    const getTop5High = (objObj) => Object.keys(objObj).map(cab => ({ cabang: cab, saldo: objObj[cab] })).sort((a, b) => b.saldo - a.saldo).slice(0, 5); 
    const getTop5Low = (objObj) => Object.keys(objObj).map(cab => ({ cabang: cab, saldo: objObj[cab] })).sort((a, b) => a.saldo - b.saldo).slice(0, 5); 

    // Render 4 Tertinggi
    renderTop5List(getTop5High(cabangData.tabungan), 'list-top-tabungan-high', '#2b3674', true);
    renderTop5List(getTop5High(cabangData.giro), 'list-top-giro-high', '#2b3674', true);
    renderTop5List(getTop5High(cabangData.deposito), 'list-top-deposito-high', '#2b3674', true);
    renderTop5List(getTop5High(cabangData.dpk), 'list-top-dpk-high', '#2b3674', true);

    // Render 4 Terendah
    renderTop5List(getTop5Low(cabangData.tabungan), 'list-top-tabungan-low', '#ee5d50', false);
    renderTop5List(getTop5Low(cabangData.giro), 'list-top-giro-low', '#ee5d50', false);
    renderTop5List(getTop5Low(cabangData.deposito), 'list-top-deposito-low', '#ee5d50', false);
    renderTop5List(getTop5Low(cabangData.dpk), 'list-top-dpk-low', '#ee5d50', false);
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