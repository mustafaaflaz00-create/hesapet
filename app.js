const STORAGE_KEY = 'hesap_et_pos_v2';

const initialState = {
  activeRole: 'kasiyer',
  auth: {
    isLoggedIn: false,
    role: 'kasiyer',
    username: 'Kasiyer'
  },
  products: [
    {
      id: uid(),
      name: 'Dana Sucuk',
      barcode: '869000000001',
      unit: 'kg',
      buyPrice: 380,
      sellPrice: 460,
      stock: 14.75,
      criticalStock: 3
    },
    {
      id: uid(),
      name: 'Kıyma Orta Yağlı',
      barcode: '869000000002',
      unit: 'kg',
      buyPrice: 290,
      sellPrice: 340,
      stock: 18.2,
      criticalStock: 4
    },
    {
      id: uid(),
      name: 'Yumurta 30lu',
      barcode: '869000000003',
      unit: 'adet',
      buyPrice: 120,
      sellPrice: 145,
      stock: 24,
      criticalStock: 6
    }
  ],
  cart: [],
  sales: [],
  stockMoves: [],
  intakePlans: [],
  endOfDayEntries: [],
  expenses: [],
  receiptFilters: {
    from: '',
    to: ''
  },
  reportFilters: {
    month: '',
    expenseMonth: ''
  },
  cloudBackup: {
    url: '',
    key: '',
    storeId: '',
    lastBackupAt: '',
    lastRestoreAt: ''
  },
  barcodeMode: false
};

let state = loadState();
let autoSyncTimer = null;
let autoPushTimer = null;
let suppressAutoPush = false;

const el = {
  clock: document.getElementById('clock'),
  toast: document.getElementById('toast'),
  activeRole: document.getElementById('activeRole'),
  authGate: document.getElementById('authGate'),
  adminLoginForm: document.getElementById('adminLoginForm'),
  adminUsername: document.getElementById('adminUsername'),
  adminPassword: document.getElementById('adminPassword'),
  cashierLoginBtn: document.getElementById('cashierLoginBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  appShell: document.querySelector('.app-shell'),

  searchInput: document.getElementById('searchInput'),
  productList: document.getElementById('productList'),
  cartList: document.getElementById('cartList'),
  subtotal: document.getElementById('subtotal'),
  grandTotal: document.getElementById('grandTotal'),
  paymentMethod: document.getElementById('paymentMethod'),
  completeSaleBtn: document.getElementById('completeSaleBtn'),
  cashFields: document.getElementById('cashFields'),
  cashReceived: document.getElementById('cashReceived'),
  cashChange: document.getElementById('cashChange'),
  recentSalesList: document.getElementById('recentSalesList'),

  productForm: document.getElementById('productForm'),
  inventoryList: document.getElementById('inventoryList'),

  intakePlanForm: document.getElementById('intakePlanForm'),
  intakeProductSelect: document.getElementById('intakeProductSelect'),
  pendingIntakeList: document.getElementById('pendingIntakeList'),
  stockMoves: document.getElementById('stockMoves'),

  receiptFrom: document.getElementById('receiptFrom'),
  receiptTo: document.getElementById('receiptTo'),
  filterReceiptsBtn: document.getElementById('filterReceiptsBtn'),
  printReceiptsBtn: document.getElementById('printReceiptsBtn'),
  exportReceiptsBtn: document.getElementById('exportReceiptsBtn'),
  receiptSummary: document.getElementById('receiptSummary'),
  receiptDumpList: document.getElementById('receiptDumpList'),

  dailyReport: document.getElementById('dailyReport'),
  weeklyReport: document.getElementById('weeklyReport'),
  monthlyReport: document.getElementById('monthlyReport'),
  stockReport: document.getElementById('stockReport'),
  barcodeModeToggle: document.getElementById('barcodeModeToggle'),
  barcodeModeStatus: document.getElementById('barcodeModeStatus'),
  quickAddBtn: document.getElementById('quickAddBtn'),

  endOfDayForm: document.getElementById('endOfDayForm'),
  endOfDayList: document.getElementById('endOfDayList'),
  expenseForm: document.getElementById('expenseForm'),
  expenseList: document.getElementById('expenseList'),
  expenseMonthFilter: document.getElementById('expenseMonthFilter'),
  clearExpenseMonthFilterBtn: document.getElementById('clearExpenseMonthFilterBtn'),
  expenseMonthSummary: document.getElementById('expenseMonthSummary'),

  reportMonthSelect: document.getElementById('reportMonthSelect'),
  clearReportMonthBtn: document.getElementById('clearReportMonthBtn'),
  selectedMonthReport: document.getElementById('selectedMonthReport'),

  cloudBackupForm: document.getElementById('cloudBackupForm'),
  cloudUrl: document.getElementById('cloudUrl'),
  cloudKey: document.getElementById('cloudKey'),
  cloudStoreId: document.getElementById('cloudStoreId'),
  saveCloudConfigBtn: document.getElementById('saveCloudConfigBtn'),
  backupNowBtn: document.getElementById('backupNowBtn'),
  restoreNowBtn: document.getElementById('restoreNowBtn'),
  autoSyncEnabled: document.getElementById('autoSyncEnabled'),
  autoSyncIntervalSec: document.getElementById('autoSyncIntervalSec'),
  applyAutoSyncBtn: document.getElementById('applyAutoSyncBtn'),
  cloudBackupStatus: document.getElementById('cloudBackupStatus')
};

init();

function init() {
  ensureAuthState();
  forceLogoutOnStartup();
  bindTabs();
  bindEvents();
  bindAuthEvents();
  bindKeyboardShortcuts();
  startClock();
  hydrateReceiptFilters();
  hydrateReportFilters();
  hydrateCloudBackupConfig();
  renderBarcodeMode();
  renderAll();
  restartAutoSyncLoop();
}

function bindTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!isLoggedIn()) return;
      if (!canAccessTab(btn.dataset.tab)) {
        notify('Bu sekmeye erişim için yönetici girişi gerekir.');
        return;
      }

      document.querySelectorAll('.tab-btn').forEach((x) => x.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((x) => x.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');

      if (btn.dataset.tab === 'raporlar') renderReports();
      if (btn.dataset.tab === 'fis') renderReceiptDump();
      if (btn.dataset.tab === 'satis' && state.barcodeMode) focusSearchInput();
    });
  });
}

function bindAuthEvents() {
  if (el.adminLoginForm) {
    el.adminLoginForm.addEventListener('submit', onAdminLogin);
  }

  if (el.cashierLoginBtn) {
    el.cashierLoginBtn.addEventListener('click', loginAsCashier);
  }

  if (el.logoutBtn) {
    el.logoutBtn.addEventListener('click', logout);
  }
}

function bindEvents() {
  el.searchInput.addEventListener('input', renderProductList);
  el.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      quickAddFirstResult();
    }
  });
  el.searchInput.addEventListener('blur', () => {
    if (state.barcodeMode && activeTab() === 'satis') {
      setTimeout(() => focusSearchInput(), 0);
    }
  });

  el.completeSaleBtn.addEventListener('click', completeSale);
  el.paymentMethod.addEventListener('change', renderPaymentFields);
  if (el.cashReceived) {
    el.cashReceived.addEventListener('input', renderPaymentFields);
  }

  if (el.quickAddBtn) {
    el.quickAddBtn.addEventListener('click', quickAddFirstResult);
  }

  if (el.barcodeModeToggle) {
    el.barcodeModeToggle.addEventListener('click', () => toggleBarcodeMode());
  }

  el.productForm.addEventListener('submit', onSubmitProduct);
  el.intakePlanForm.addEventListener('submit', onSubmitIntakePlan);

  el.filterReceiptsBtn.addEventListener('click', applyReceiptFilter);
  el.printReceiptsBtn.addEventListener('click', printReceiptDump);
  el.exportReceiptsBtn.addEventListener('click', exportReceiptDumpCsv);

  if (el.endOfDayForm) {
    el.endOfDayForm.addEventListener('submit', onSubmitEndOfDay);
  }

  if (el.expenseForm) {
    el.expenseForm.addEventListener('submit', onSubmitExpense);
  }

  if (el.expenseMonthFilter) {
    el.expenseMonthFilter.addEventListener('change', onChangeExpenseMonthFilter);
  }

  if (el.clearExpenseMonthFilterBtn) {
    el.clearExpenseMonthFilterBtn.addEventListener('click', clearExpenseMonthFilter);
  }

  if (el.reportMonthSelect) {
    el.reportMonthSelect.addEventListener('change', onChangeReportMonth);
  }

  if (el.clearReportMonthBtn) {
    el.clearReportMonthBtn.addEventListener('click', clearReportMonthFilter);
  }

  if (el.cloudBackupForm) {
    el.cloudBackupForm.addEventListener('submit', onSubmitCloudBackupConfig);
  }

  if (el.backupNowBtn) {
    el.backupNowBtn.addEventListener('click', backupToCloud);
  }

  if (el.restoreNowBtn) {
    el.restoreNowBtn.addEventListener('click', restoreFromCloud);
  }

  if (el.applyAutoSyncBtn) {
    el.applyAutoSyncBtn.addEventListener('click', applyAutoSyncSettings);
  }
}

function bindKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    if (key === 'f2') {
      e.preventDefault();
      if (activeTab() !== 'satis') activateTab('satis');
      focusSearchInput();
      return;
    }

    if (key === 'f4') {
      e.preventDefault();
      if (activeTab() !== 'satis') activateTab('satis');
      quickAddFirstResult();
      return;
    }

    if (key === 'f8') {
      e.preventDefault();
      if (activeTab() !== 'satis') activateTab('satis');
      completeSale();
      return;
    }

    if (e.ctrlKey && key === 'b') {
      e.preventDefault();
      toggleBarcodeMode();
    }
  });
}

function activeTab() {
  const current = document.querySelector('.tab-btn.active');
  return current ? current.dataset.tab : 'satis';
}

function activateTab(tabKey) {
  if (!isLoggedIn()) return;
  if (!canAccessTab(tabKey)) return;
  const btn = document.querySelector(`.tab-btn[data-tab="${tabKey}"]`);
  if (btn) btn.click();
}

function focusSearchInput() {
  el.searchInput.focus();
  el.searchInput.select();
}

function normalizeBarcode(value) {
  return String(value || '')
    .trim()
    .replaceAll(' ', '');
}

function getSearchResults() {
  const q = String(el.searchInput.value || '').toLowerCase().trim();
  return state.products.filter((p) => {
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || (p.barcode || '').toLowerCase().includes(q);
  });
}

function quickAddFirstResult() {
  const results = getSearchResults();
  if (!results.length) {
    notify('Eklenecek ürün bulunamadı.');
    return;
  }

  const queryBarcode = normalizeBarcode(el.searchInput.value);
  const exactBarcodeMatch = results.find((p) => normalizeBarcode(p.barcode) === queryBarcode);
  const product = state.barcodeMode ? exactBarcodeMatch || results[0] : results[0];

  addToCart(product.id);

  if (state.barcodeMode) {
    el.searchInput.value = '';
    renderProductList();
    focusSearchInput();
  }
}

function renderBarcodeMode() {
  if (!el.barcodeModeToggle || !el.barcodeModeStatus) return;

  const enabled = Boolean(state.barcodeMode);
  el.barcodeModeToggle.textContent = `Barkod Modu: ${enabled ? 'Açık' : 'Kapalı'}`;
  el.barcodeModeToggle.setAttribute('aria-pressed', String(enabled));
  el.barcodeModeToggle.classList.toggle('is-on', enabled);

  el.barcodeModeStatus.textContent = enabled
    ? 'Barkod odağı aktif: arama kutusu odakta kalır, Enter direkt sepete ekler.'
    : 'Standart arama modu';

  el.searchInput.classList.toggle('barcode-focus', enabled);
}

function toggleBarcodeMode(forceValue) {
  const next = typeof forceValue === 'boolean' ? forceValue : !state.barcodeMode;
  state.barcodeMode = next;
  saveState();
  renderBarcodeMode();

  if (next && activeTab() === 'satis') {
    focusSearchInput();
    notify('Barkod modu açıldı.');
    return;
  }

  notify('Barkod modu kapatıldı.');
}

function onSubmitProduct(e) {
  e.preventDefault();

  if (!canAddProduct()) {
    notify('Yeni ürün tanımı sadece yönetici tarafından yapılabilir.');
    return;
  }

  const form = new FormData(el.productForm);
  const product = {
    id: uid(),
    name: String(form.get('name') || '').trim(),
    barcode: String(form.get('barcode') || '').trim(),
    unit: String(form.get('unit') || 'adet'),
    buyPrice: Number(form.get('buyPrice')),
    sellPrice: Number(form.get('sellPrice')),
    stock: 0,
    criticalStock: Number(form.get('criticalStock'))
  };

  if (!product.name || Number.isNaN(product.buyPrice) || Number.isNaN(product.sellPrice) || Number.isNaN(product.criticalStock)) {
    notify('Ürün bilgilerini eksiksiz girin.');
    return;
  }

  state.products.push(product);
  saveState();
  el.productForm.reset();
  renderAll();
  notify('Ürün kataloğa eklendi. İlk stok için plan oluşturun.');
}

function onSubmitIntakePlan(e) {
  e.preventDefault();

  if (!canCreateIntakePlan()) {
    notify('Stok giriş planı için yetkiniz yok.');
    return;
  }

  const form = new FormData(el.intakePlanForm);
  const productId = String(form.get('productId') || '');
  const supplier = String(form.get('supplier') || '').trim();
  const expectedQty = Number(form.get('expectedQty') || 0);
  const note = String(form.get('note') || '').trim();

  const product = state.products.find((p) => p.id === productId);
  if (!product) {
    notify('Ürün bulunamadı.');
    return;
  }

  state.intakePlans.unshift({
    id: uid(),
    productId,
    supplier,
    expectedQty: Number.isNaN(expectedQty) ? 0 : expectedQty,
    note,
    status: 'pending',
    createdAt: new Date().toISOString(),
    createdBy: state.activeRole,
    receivedQty: 0,
    unitCost: 0,
    receivedAt: '',
    receivedBy: ''
  });

  el.intakePlanForm.reset();
  saveState();
  renderAll();
  notify('Stok giriş planı oluşturuldu.');
}

function renderAll() {
  renderAuthGate();
  renderRole();
  renderProductList();
  renderCart();
  renderPaymentFields();
  renderInventory();
  renderIntakeProductOptions();
  renderPendingIntakePlans();
  renderStockMoves();
  renderRecentSales();
  renderReportMonthOptions();
  renderReports();
  renderReceiptDump();
  renderEndOfDayList();
  renderExpenseList();
  renderCloudBackupStatus();
}

function renderRole() {
  el.activeRole.textContent = roleLabel(getCurrentRole());
}

function renderAuthGate() {
  const loggedIn = isLoggedIn();
  if (el.authGate) {
    el.authGate.style.display = loggedIn ? 'none' : 'flex';
  }

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    const blocked = !loggedIn || !canAccessTab(btn.dataset.tab);
    btn.disabled = blocked;
    btn.classList.toggle('is-disabled', blocked);
  });

  if (el.logoutBtn) {
    el.logoutBtn.disabled = !loggedIn;
  }

  if (!loggedIn) {
    document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.remove('active'));
    const salesPanel = document.getElementById('tab-satis');
    if (salesPanel) salesPanel.classList.add('active');
    const salesBtn = document.querySelector('.tab-btn[data-tab="satis"]');
    if (salesBtn) salesBtn.classList.add('active');
  }
}

function renderProductList() {
  const products = getSearchResults();

  if (!products.length) {
    el.productList.innerHTML = '<div class="list-item">Ürün bulunamadı.</div>';
    return;
  }

  el.productList.innerHTML = products
    .map((p) => {
      const lowClass = p.stock <= p.criticalStock ? 'low-stock' : '';
      return `
        <div class="list-item">
          <div>
            <strong>${escapeHtml(p.name)}</strong><br/>
            <small>${fmtMoney(p.sellPrice)} / ${p.unit} • <span class="${lowClass}">Stok: ${fmtQty(p.stock)} ${p.unit}</span></small>
          </div>
          <button data-add="${p.id}">Sepete Ekle</button>
        </div>
      `;
    })
    .join('');

  el.productList.querySelectorAll('button[data-add]').forEach((btn) => {
    btn.addEventListener('click', () => addToCart(btn.dataset.add));
  });
}

function addToCart(productId) {
  const product = state.products.find((p) => p.id === productId);
  if (!product) return;

  let qty = 1;
  if (product.unit === 'kg') {
    const input = prompt(`${product.name} için kg giriniz (örn: 0.750):`, '0.500');
    if (input === null) return;
    qty = Number(String(input).replace(',', '.'));
    if (!(qty > 0)) {
      notify('Geçerli kilogram değeri girin.');
      return;
    }
  }

  if (product.stock < qty) {
    notify('Yetersiz stok.');
    return;
  }

  const existing = state.cart.find((c) => c.productId === productId && c.unit === 'adet');
  if (existing && product.unit === 'adet') {
    existing.qty += 1;
  } else {
    state.cart.push({
      id: uid(),
      productId,
      name: product.name,
      unit: product.unit,
      qty,
      unitPrice: product.sellPrice
    });
  }

  saveState();
  renderCart();
}

function renderCart() {
  if (!state.cart.length) {
    el.cartList.innerHTML = '<div class="list-item">Sepet boş.</div>';
  } else {
    el.cartList.innerHTML = state.cart
      .map(
        (item) => `
        <div class="list-item">
          <div>
            <strong>${escapeHtml(item.name)}</strong><br/>
            <small>${fmtQty(item.qty)} ${item.unit} x ${fmtMoney(item.unitPrice)}</small>
          </div>
          <div>
            <strong>${fmtMoney(item.qty * item.unitPrice)}</strong>
            <button class="danger" data-remove="${item.id}">Satır İptal</button>
          </div>
        </div>
      `
      )
      .join('');

    el.cartList.querySelectorAll('button[data-remove]').forEach((btn) => {
      btn.addEventListener('click', () => removeLine(btn.dataset.remove));
    });
  }

  const subtotal = getCartSubtotal();

  el.subtotal.textContent = fmtMoney(subtotal);
  el.grandTotal.textContent = fmtMoney(subtotal);
  renderPaymentFields();
}

function removeLine(cartLineId) {
  if (!canSell()) {
    notify('Satır iptali için yetkiniz yok.');
    return;
  }

  state.cart = state.cart.filter((line) => line.id !== cartLineId);
  saveState();
  renderCart();
  notify('Satır iptal edildi.');
}

function completeSale() {
  if (!canSell()) {
    notify('Satış işlemi için yetkiniz yok.');
    return;
  }

  if (!state.cart.length) {
    notify('Sepet boş.');
    return;
  }

  for (const line of state.cart) {
    const product = state.products.find((p) => p.id === line.productId);
    if (!product || product.stock < line.qty) {
      notify(`${line.name} için stok yetersiz.`);
      return;
    }
  }

  const subtotal = getCartSubtotal();
  const total = subtotal;

  let cashReceived = null;
  let cashChange = null;

  if (el.paymentMethod.value === 'nakit') {
    cashReceived = Number(String(el.cashReceived.value || '0').replace(',', '.'));
    if (!(cashReceived >= total)) {
      notify('Nakit satışta alınan tutar toplamdan az olamaz.');
      return;
    }
    cashChange = round(cashReceived - total);
  }

  const sale = {
    id: uid(),
    type: 'satis',
    lines: [...state.cart],
    paymentMethod: el.paymentMethod.value,
    subtotal,
    tax: 0,
    total,
    cashReceived,
    cashChange,
    createdAt: new Date().toISOString(),
    roleAtSale: state.activeRole,
    refunded: false
  };

  for (const line of state.cart) {
    const product = state.products.find((p) => p.id === line.productId);
    product.stock = round(product.stock - line.qty);

    state.stockMoves.unshift({
      id: uid(),
      type: 'satis',
      productId: line.productId,
      qty: line.qty,
      unitCost: product.buyPrice,
      createdAt: sale.createdAt,
      note: `Satış ${sale.id.slice(0, 8)}`
    });
  }

  state.sales.unshift(sale);
  state.cart = [];
  if (el.cashReceived) {
    el.cashReceived.value = '';
  }

  saveState();
  renderAll();
  printSingleReceipt(sale);
  notify('Satış tamamlandı.');
}

function renderRecentSales() {
  const sales = state.sales.filter((s) => s.type === 'satis').slice(0, 30);

  if (!sales.length) {
    el.recentSalesList.innerHTML = '<div class="list-item">Henüz satış yok.</div>';
    return;
  }

  el.recentSalesList.innerHTML = sales
    .map((sale) => {
      const refundText = sale.refunded ? ' • İADE EDİLDİ' : '';
      const action = sale.refunded
        ? '<small>İade tamamlandı</small>'
        : `<button class="danger" data-refund="${sale.id}">Fişi İade Et</button>`;

      return `
        <div class="list-item">
          <div>
            <strong>${fmtDateTime(sale.createdAt)}</strong><br/>
            <small>Fiş: ${sale.id.slice(0, 8)} • ${fmtMoney(sale.total)} • ${paymentLabel(sale.paymentMethod)}${refundText}</small>
          </div>
          <div>${action}</div>
        </div>
      `;
    })
    .join('');

  el.recentSalesList.querySelectorAll('button[data-refund]').forEach((btn) => {
    btn.addEventListener('click', () => refundSale(btn.dataset.refund));
  });
}

function refundSale(saleId) {
  if (!canSell()) {
    notify('İade işlemi için yetkiniz yok.');
    return;
  }

  const sale = state.sales.find((s) => s.id === saleId && s.type === 'satis');
  if (!sale) {
    notify('Satış bulunamadı.');
    return;
  }
  if (sale.refunded) {
    notify('Bu satış zaten iade edilmiş.');
    return;
  }

  const refundAt = new Date().toISOString();

  for (const line of sale.lines) {
    const product = state.products.find((p) => p.id === line.productId);
    if (!product) continue;

    product.stock = round(product.stock + line.qty);
    state.stockMoves.unshift({
      id: uid(),
      type: 'iade',
      productId: line.productId,
      qty: line.qty,
      unitCost: product.buyPrice,
      createdAt: refundAt,
      note: `İade ${sale.id.slice(0, 8)}`
    });
  }

  sale.refunded = true;
  sale.refundedAt = refundAt;

  state.sales.unshift({
    id: uid(),
    type: 'iade',
    relatedSaleId: sale.id,
    lines: sale.lines,
    paymentMethod: sale.paymentMethod,
    subtotal: -Math.abs(sale.subtotal),
    tax: -Math.abs(sale.tax),
    total: -Math.abs(sale.total),
    createdAt: refundAt,
    roleAtSale: state.activeRole,
    refunded: false
  });

  saveState();
  renderAll();
  notify('İade alındı, stok geri eklendi.');
}

function renderInventory() {
  if (!state.products.length) {
    el.inventoryList.innerHTML = '<div class="list-item">Ürün yok.</div>';
    return;
  }

  el.inventoryList.innerHTML = state.products
    .map((p) => {
      const lowClass = p.stock <= p.criticalStock ? 'low-stock' : '';
      const adminActions = isAdmin()
        ? `
            <div class="pay-row">
              <button class="secondary" data-edit-product="${p.id}" type="button">Düzenle</button>
              <button class="danger" data-delete-product="${p.id}" type="button">Sil</button>
            </div>
          `
        : '';

      return `
        <div class="list-item">
          <div>
            <strong>${escapeHtml(p.name)}</strong> (${p.unit})<br/>
            <small>Barkod: ${escapeHtml(p.barcode || '-')} • Alış: ${fmtMoney(p.buyPrice)} • Satış: ${fmtMoney(p.sellPrice)}</small>
            ${adminActions}
          </div>
          <div class="${lowClass}">Stok: ${fmtQty(p.stock)} ${p.unit}</div>
        </div>
      `;
    })
    .join('');

  if (isAdmin()) {
    el.inventoryList.querySelectorAll('button[data-edit-product]').forEach((btn) => {
      btn.addEventListener('click', () => editProduct(btn.dataset.editProduct));
    });

    el.inventoryList.querySelectorAll('button[data-delete-product]').forEach((btn) => {
      btn.addEventListener('click', () => deleteProduct(btn.dataset.deleteProduct));
    });
  }
}

function renderIntakeProductOptions() {
  if (!state.products.length) {
    el.intakeProductSelect.innerHTML = '';
    return;
  }

  el.intakeProductSelect.innerHTML = state.products
    .map((p) => `<option value="${p.id}">${escapeHtml(p.name)} (${p.unit})</option>`)
    .join('');
}

function renderPendingIntakePlans() {
  const pending = state.intakePlans.filter((x) => x.status === 'pending');
  if (!pending.length) {
    el.pendingIntakeList.innerHTML = '<div class="list-item">Bekleyen stok planı yok.</div>';
    return;
  }

  const productMap = new Map(state.products.map((p) => [p.id, p]));

  el.pendingIntakeList.innerHTML = pending
    .map((plan) => {
      const product = productMap.get(plan.productId);
      const unit = product ? product.unit : 'adet';
      return `
        <div class="list-item">
          <div>
            <strong>${escapeHtml(product ? product.name : 'Silinmiş ürün')}</strong><br/>
            <small>Beklenen: ${fmtQty(plan.expectedQty || 0)} ${unit} • Tedarikçi: ${escapeHtml(plan.supplier || '-')}</small><br/>
            <small>Plan: ${fmtDateTime(plan.createdAt)} • Not: ${escapeHtml(plan.note || '-')}</small>
          </div>
          <div class="pay-row">
            <button data-receive="${plan.id}">Teslim Al / Stoğa İşle</button>
            ${isAdmin() ? `<button class="danger" data-delete-plan="${plan.id}" type="button">Sil</button>` : ''}
          </div>
        </div>
      `;
    })
    .join('');

  el.pendingIntakeList.querySelectorAll('button[data-receive]').forEach((btn) => {
    btn.addEventListener('click', () => receiveIntakePlan(btn.dataset.receive));
  });

  el.pendingIntakeList.querySelectorAll('button[data-delete-plan]').forEach((btn) => {
    btn.addEventListener('click', () => deleteIntakePlan(btn.dataset.deletePlan));
  });
}

function receiveIntakePlan(planId) {
  if (!canReceiveIntake()) {
    notify('Stoğa işleme sadece yönetici tarafından yapılabilir.');
    return;
  }

  const plan = state.intakePlans.find((x) => x.id === planId && x.status === 'pending');
  if (!plan) {
    notify('Stok planı bulunamadı.');
    return;
  }

  const product = state.products.find((p) => p.id === plan.productId);
  if (!product) {
    notify('Ürün bulunamadı.');
    return;
  }

  const qtyInput = prompt(`${product.name} için gelen miktar (${product.unit})`, String(plan.expectedQty || '0'));
  if (qtyInput === null) return;
  const receivedQty = Number(String(qtyInput).replace(',', '.'));
  if (!(receivedQty > 0)) {
    notify('Geçerli miktar girin.');
    return;
  }

  const costInput = prompt(`${product.name} için birim maliyet`, String(product.buyPrice || '0'));
  if (costInput === null) return;
  const unitCost = Number(String(costInput).replace(',', '.'));
  if (!(unitCost >= 0)) {
    notify('Geçerli maliyet girin.');
    return;
  }

  const now = new Date().toISOString();
  product.stock = round(product.stock + receivedQty);
  product.buyPrice = unitCost;

  plan.status = 'received';
  plan.receivedQty = receivedQty;
  plan.unitCost = unitCost;
  plan.receivedAt = now;
  plan.receivedBy = state.activeRole;

  state.stockMoves.unshift({
    id: uid(),
    type: 'giris',
    productId: plan.productId,
    qty: receivedQty,
    unitCost,
    createdAt: now,
    note: `Plan ${plan.id.slice(0, 8)} teslim alındı`
  });

  saveState();
  renderAll();
  notify('Stok artırıldı ve plan kapatıldı.');
}

function renderStockMoves() {
  if (!state.stockMoves.length) {
    el.stockMoves.innerHTML = '<div class="list-item">Hareket yok.</div>';
    return;
  }

  const productMap = new Map(state.products.map((p) => [p.id, p.name]));

  el.stockMoves.innerHTML = state.stockMoves
    .slice(0, 200)
    .map((m) => {
      const productName = productMap.get(m.productId) || 'Silinmiş ürün';
      return `
        <div class="list-item">
          <div>
            <strong>${escapeHtml(productName)}</strong><br/>
            <small>${escapeHtml(m.type.toUpperCase())} • ${fmtQty(m.qty)} • ${fmtDateTime(m.createdAt)}</small>
          </div>
          <small>${escapeHtml(m.note || '')}</small>
        </div>
      `;
    })
    .join('');
}

function hydrateReceiptFilters() {
  el.receiptFrom.value = state.receiptFilters.from || '';
  el.receiptTo.value = state.receiptFilters.to || '';
}

function applyReceiptFilter() {
  state.receiptFilters.from = el.receiptFrom.value;
  state.receiptFilters.to = el.receiptTo.value;
  saveState();
  renderReceiptDump();
}

function getFilteredReceipts() {
  const from = state.receiptFilters.from ? new Date(`${state.receiptFilters.from}T00:00:00`).getTime() : -Infinity;
  const to = state.receiptFilters.to ? new Date(`${state.receiptFilters.to}T23:59:59`).getTime() : Infinity;

  return state.sales
    .filter((s) => {
      const t = new Date(s.createdAt).getTime();
      return t >= from && t <= to;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function renderReceiptDump() {
  const receipts = getFilteredReceipts();

  const net = round(receipts.reduce((sum, r) => sum + signedTotal(r), 0));
  const salesCount = receipts.filter((r) => r.type === 'satis').length;
  const refundCount = receipts.filter((r) => r.type === 'iade').length;

  el.receiptSummary.innerHTML = `
    <div>Toplam Fiş: <strong>${receipts.length}</strong></div>
    <div>Satış: <strong>${salesCount}</strong></div>
    <div>İade: <strong>${refundCount}</strong></div>
    <div>Net Tutar: <strong>${fmtMoney(net)}</strong></div>
  `;

  if (!receipts.length) {
    el.receiptDumpList.innerHTML = '<div class="list-item">Seçilen tarih aralığında fiş yok.</div>';
    return;
  }

  el.receiptDumpList.innerHTML = receipts
    .map((r) => {
      const typeLabel = r.type === 'iade' ? 'İADE' : 'SATIŞ';
      const linesText = (r.lines || [])
        .map((l) => `${l.name} (${fmtQty(l.qty)} ${l.unit})`)
        .join(', ');
      return `
        <div class="list-item">
          <div>
            <strong>${typeLabel}</strong> • ${fmtDateTime(r.createdAt)} • Fiş: ${r.id.slice(0, 8)}<br/>
            <small>${escapeHtml(linesText || '-')}</small>
          </div>
          <div>
            <strong>${fmtMoney(r.total)}</strong><br/>
            <small>${escapeHtml(paymentLabel(r.paymentMethod || '-'))}</small>
          </div>
        </div>
      `;
    })
    .join('');
}

function printReceiptDump() {
  const receipts = getFilteredReceipts();
  if (!receipts.length) {
    notify('Yazdırılacak fiş yok.');
    return;
  }

  const rows = receipts
    .map((r) => {
      const typeLabel = r.type === 'iade' ? 'İADE' : 'SATIŞ';
      return `${fmtDateTime(r.createdAt)} | ${typeLabel} | ${r.id.slice(0, 8)} | ${paymentLabel(r.paymentMethod || '-')} | ${fmtMoney(r.total)}`;
    })
    .join('\n');

  const content = [
    'HESAP ET POS - TARİH ARALIĞI FİŞ DÖKÜMÜ',
    `Aralık: ${state.receiptFilters.from || '-'} / ${state.receiptFilters.to || '-'}`,
    '-------------------------------------------------------',
    rows
  ].join('\n');

  const w = window.open('', '_blank', 'width=740,height=820');
  if (!w) return;
  w.document.write(`<pre style="font-family: monospace; white-space: pre-wrap;">${escapeHtml(content)}</pre>`);
  w.document.close();
  w.focus();
  w.print();
}

function exportReceiptDumpCsv() {
  const receipts = getFilteredReceipts();
  if (!receipts.length) {
    notify('CSV için fiş yok.');
    return;
  }

  const header = ['Tarih', 'Tip', 'FisNo', 'Odeme', 'AraToplam', 'Toplam'];
  const lines = receipts.map((r) => [
    fmtDateTime(r.createdAt),
    r.type,
    r.id,
    paymentLabel(r.paymentMethod || ''),
    String(r.subtotal),
    String(r.total)
  ]);

  const csv = [header, ...lines]
    .map((row) => row.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(';'))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fis-dokumu-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  notify('CSV indirildi.');
}

function renderReports() {
  el.dailyReport.innerHTML = reportBlock(periodSummary(1));
  el.weeklyReport.innerHTML = reportBlock(periodSummary(7));
  el.monthlyReport.innerHTML = reportBlock(periodSummary(30));
  renderSelectedMonthReport();

  if (!state.products.length) {
    el.stockReport.innerHTML = '<div class="list-item">Stok verisi yok.</div>';
    return;
  }

  el.stockReport.innerHTML = state.products
    .map((p) => {
      const lowClass = p.stock <= p.criticalStock ? 'low-stock' : '';
      return `
        <div class="list-item">
          <div>${escapeHtml(p.name)}</div>
          <div class="${lowClass}">${fmtQty(p.stock)} ${p.unit}</div>
        </div>
      `;
    })
    .join('');
}

function reportBlock(summary) {
  return `
    <p>Gün Sonu Kaydı: <strong>${summary.entryCount}</strong></p>
    <p>Toplam Ciro: <strong>${fmtMoney(summary.gross)}</strong></p>
    <p>Nakit: <strong>${fmtMoney(summary.cash)}</strong></p>
    <p>Kart: <strong>${fmtMoney(summary.card)}</strong></p>
    <p>Gider: <strong>${fmtMoney(summary.expense)}</strong></p>
    <p>Net: <strong>${fmtMoney(summary.net)}</strong></p>
  `;
}

function periodSummary(days) {
  const now = Date.now();
  const threshold = now - days * 24 * 60 * 60 * 1000;

  const entries = state.endOfDayEntries.filter((x) => new Date(`${x.date}T23:59:59`).getTime() >= threshold);
  const expenses = state.expenses.filter((x) => new Date(`${x.date}T23:59:59`).getTime() >= threshold);

  const cash = round(entries.reduce((sum, x) => sum + Number(x.cash || 0), 0));
  const card = round(entries.reduce((sum, x) => sum + Number(x.card || 0), 0));
  const gross = round(cash + card);
  const expense = round(expenses.reduce((sum, x) => sum + Number(x.amount || 0), 0));

  return {
    entryCount: entries.length,
    cash,
    card,
    gross,
    expense,
    net: round(gross - expense)
  };
}

function canSell() {
  return getCurrentRole() === 'kasiyer' || getCurrentRole() === 'yonetici';
}

function canAddProduct() {
  return getCurrentRole() === 'yonetici';
}

function canCreateIntakePlan() {
  return getCurrentRole() === 'yonetici';
}

function canReceiveIntake() {
  return getCurrentRole() === 'yonetici';
}

function roleLabel(role) {
  if (role === 'yonetici') return 'Yönetici';
  if (role === 'mal-girisi') return 'Mal Girişi';
  return 'Kasiyer';
}

function signedTotal(receipt) {
  if (receipt.type === 'iade') return -Math.abs(Number(receipt.total || 0));
  return Math.abs(Number(receipt.total || 0));
}

function getCartSubtotal() {
  return round(state.cart.reduce((sum, i) => sum + i.qty * i.unitPrice, 0));
}

function paymentLabel(method) {
  if (method === 'nakit') return 'NAKİT';
  if (method === 'kart') return 'POS (KART)';
  return String(method || '-').toUpperCase();
}

function renderPaymentFields() {
  const total = getCartSubtotal();
  const isCash = el.paymentMethod.value === 'nakit';

  if (el.cashFields) {
    el.cashFields.classList.toggle('is-hidden', !isCash);
  }

  if (!isCash) {
    if (el.cashChange) el.cashChange.textContent = fmtMoney(0);
    return;
  }

  const received = Number(String(el.cashReceived?.value || '0').replace(',', '.'));
  const change = received >= total ? round(received - total) : 0;
  if (el.cashChange) {
    el.cashChange.textContent = fmtMoney(change);
  }
}

function printSingleReceipt(sale) {
  const lines = sale.lines
    .map((l) => `${l.name} | ${fmtQty(l.qty)} ${l.unit} x ${fmtMoney(l.unitPrice)} = ${fmtMoney(l.qty * l.unitPrice)}`)
    .join('\n');

  const content = [
    'HESAP ET POS - SATIŞ FİŞİ',
    `Tarih: ${fmtDateTime(sale.createdAt)}`,
    `Fiş No: ${sale.id}`,
    '-------------------------------------',
    lines,
    '-------------------------------------',
    `Ara Toplam: ${fmtMoney(sale.subtotal)}`,
    `Genel Toplam: ${fmtMoney(sale.total)}`,
    `Ödeme: ${paymentLabel(sale.paymentMethod || '')}`,
    ...(sale.paymentMethod === 'nakit'
      ? [
          `Alınan: ${fmtMoney(sale.cashReceived)}`,
          `Para Üstü: ${fmtMoney(sale.cashChange)}`
        ]
      : []),
    'Teşekkürler.'
  ].join('\n');

  const w = window.open('', '_blank', 'width=420,height=740');
  if (!w) return;
  w.document.write(`<pre style="font-family: monospace; white-space: pre-wrap;">${escapeHtml(content)}</pre>`);
  w.document.close();
  w.focus();
  w.print();
}

function onSubmitEndOfDay(e) {
  e.preventDefault();

  const form = new FormData(el.endOfDayForm);
  const date = String(form.get('date') || '').trim();
  const cash = Number(String(form.get('cash') || '0').replace(',', '.'));
  const card = Number(String(form.get('card') || '0').replace(',', '.'));
  const note = String(form.get('note') || '').trim();

  if (!date || Number.isNaN(cash) || Number.isNaN(card) || cash < 0 || card < 0) {
    notify('Gün sonu bilgilerini geçerli girin.');
    return;
  }

  state.endOfDayEntries.unshift({
    id: uid(),
    date,
    cash: round(cash),
    card: round(card),
    note,
    createdAt: new Date().toISOString()
  });

  saveState();
  el.endOfDayForm.reset();
  renderAll();
  notify('Gün sonu kaydı eklendi.');
}

function onSubmitExpense(e) {
  e.preventDefault();

  const form = new FormData(el.expenseForm);
  const date = String(form.get('date') || '').trim();
  const amount = Number(String(form.get('amount') || '0').replace(',', '.'));
  const category = String(form.get('category') || '').trim();
  const note = String(form.get('note') || '').trim();

  if (!date || Number.isNaN(amount) || !(amount > 0)) {
    notify('Gider bilgilerini geçerli girin.');
    return;
  }

  state.expenses.unshift({
    id: uid(),
    date,
    amount: round(amount),
    category,
    note,
    createdAt: new Date().toISOString()
  });

  saveState();
  el.expenseForm.reset();
  renderAll();
  notify('Gider kaydı eklendi.');
}

function renderEndOfDayList() {
  if (!el.endOfDayList) return;

  if (!state.endOfDayEntries.length) {
    el.endOfDayList.innerHTML = '<div class="list-item">Henüz gün sonu kaydı yok.</div>';
    return;
  }

  el.endOfDayList.innerHTML = state.endOfDayEntries
    .slice(0, 200)
    .map((x) => {
      return `
        <div class="list-item">
          <div>
            <strong>${escapeHtml(x.date)}</strong><br/>
            <small>Nakit: ${fmtMoney(x.cash)} • Kart: ${fmtMoney(x.card)} • Toplam: ${fmtMoney(round(Number(x.cash || 0) + Number(x.card || 0)))}</small><br/>
            <small>Not: ${escapeHtml(x.note || '-')}</small>
          </div>
          <div class="pay-row">
            <button class="secondary" data-edit-endofday="${x.id}" type="button">Düzenle</button>
            <button class="danger" data-delete-endofday="${x.id}" type="button">Sil</button>
          </div>
        </div>
      `;
    })
    .join('');

  el.endOfDayList.querySelectorAll('button[data-edit-endofday]').forEach((btn) => {
    btn.addEventListener('click', () => editEndOfDayEntry(btn.dataset.editEndofday));
  });

  el.endOfDayList.querySelectorAll('button[data-delete-endofday]').forEach((btn) => {
    btn.addEventListener('click', () => deleteEndOfDayEntry(btn.dataset.deleteEndofday));
  });
}

function renderExpenseList() {
  if (!el.expenseList) return;

  renderExpenseMonthOptions();
  renderExpenseMonthSummary();

  const filteredExpenses = getFilteredExpensesForList();
  if (!filteredExpenses.length) {
    el.expenseList.innerHTML = '<div class="list-item">Seçili filtrede gider kaydı yok.</div>';
    return;
  }

  el.expenseList.innerHTML = filteredExpenses
    .slice(0, 200)
    .map((x) => {
      return `
        <div class="list-item">
          <div>
            <strong>${escapeHtml(x.date)}</strong><br/>
            <small>Kategori: ${escapeHtml(x.category || '-')}</small><br/>
            <small>Not: ${escapeHtml(x.note || '-')}</small>
          </div>
          <div>
            <strong>${fmtMoney(x.amount)}</strong><br/>
            <div class="pay-row">
              <button class="secondary" data-edit-expense="${x.id}" type="button">Düzenle</button>
              <button class="danger" data-delete-expense="${x.id}" type="button">Sil</button>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  el.expenseList.querySelectorAll('button[data-edit-expense]').forEach((btn) => {
    btn.addEventListener('click', () => editExpenseEntry(btn.dataset.editExpense));
  });

  el.expenseList.querySelectorAll('button[data-delete-expense]').forEach((btn) => {
    btn.addEventListener('click', () => deleteExpenseEntry(btn.dataset.deleteExpense));
  });
}

function editEndOfDayEntry(entryId) {
  const entry = state.endOfDayEntries.find((x) => x.id === entryId);
  if (!entry) {
    notify('Gün sonu kaydı bulunamadı.');
    return;
  }

  const cashInput = prompt('Yeni nakit tutarı', String(entry.cash ?? 0));
  if (cashInput === null) return;
  const cardInput = prompt('Yeni kart tutarı', String(entry.card ?? 0));
  if (cardInput === null) return;
  const noteInput = prompt('Yeni not', String(entry.note || ''));
  if (noteInput === null) return;

  const cash = Number(String(cashInput).replace(',', '.'));
  const card = Number(String(cardInput).replace(',', '.'));

  if (Number.isNaN(cash) || Number.isNaN(card) || cash < 0 || card < 0) {
    notify('Geçerli nakit/kart tutarı girin.');
    return;
  }

  entry.cash = round(cash);
  entry.card = round(card);
  entry.note = String(noteInput).trim();
  entry.updatedAt = new Date().toISOString();

  saveState();
  renderAll();
  notify('Gün sonu kaydı güncellendi.');
}

function deleteEndOfDayEntry(entryId) {
  const entry = state.endOfDayEntries.find((x) => x.id === entryId);
  if (!entry) {
    notify('Gün sonu kaydı bulunamadı.');
    return;
  }

  const ok = confirm(`${entry.date} tarihli gün sonu kaydı silinsin mi?`);
  if (!ok) return;

  state.endOfDayEntries = state.endOfDayEntries.filter((x) => x.id !== entryId);
  saveState();
  renderAll();
  notify('Gün sonu kaydı silindi.');
}

function editExpenseEntry(expenseId) {
  const expense = state.expenses.find((x) => x.id === expenseId);
  if (!expense) {
    notify('Gider kaydı bulunamadı.');
    return;
  }

  const amountInput = prompt('Yeni gider tutarı', String(expense.amount ?? 0));
  if (amountInput === null) return;
  const categoryInput = prompt('Yeni kategori', String(expense.category || ''));
  if (categoryInput === null) return;
  const noteInput = prompt('Yeni not', String(expense.note || ''));
  if (noteInput === null) return;

  const amount = Number(String(amountInput).replace(',', '.'));
  if (Number.isNaN(amount) || !(amount > 0)) {
    notify('Geçerli gider tutarı girin.');
    return;
  }

  expense.amount = round(amount);
  expense.category = String(categoryInput).trim();
  expense.note = String(noteInput).trim();
  expense.updatedAt = new Date().toISOString();

  saveState();
  renderAll();
  notify('Gider kaydı güncellendi.');
}

function deleteExpenseEntry(expenseId) {
  const expense = state.expenses.find((x) => x.id === expenseId);
  if (!expense) {
    notify('Gider kaydı bulunamadı.');
    return;
  }

  const ok = confirm(`${expense.date} tarihli ${fmtMoney(expense.amount)} gider kaydı silinsin mi?`);
  if (!ok) return;

  state.expenses = state.expenses.filter((x) => x.id !== expenseId);
  saveState();
  renderAll();
  notify('Gider kaydı silindi.');
}

function hydrateReportFilters() {
  if (!state.reportFilters || typeof state.reportFilters !== 'object') {
    state.reportFilters = { month: '', expenseMonth: '' };
  }
  state.reportFilters.month = String(state.reportFilters.month || '');
  state.reportFilters.expenseMonth = String(state.reportFilters.expenseMonth || '');
}

function getMonthKeyFromDate(dateStr) {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function getAvailableReportMonths() {
  const monthSet = new Set();

  state.endOfDayEntries.forEach((x) => {
    const key = getMonthKeyFromDate(x.date);
    if (key) monthSet.add(key);
  });

  state.expenses.forEach((x) => {
    const key = getMonthKeyFromDate(x.date);
    if (key) monthSet.add(key);
  });

  return Array.from(monthSet).sort((a, b) => (a < b ? 1 : -1));
}

function monthLabel(monthKey) {
  if (!monthKey) return '-';
  const [year, month] = monthKey.split('-');
  return `${month}.${year}`;
}

function getAvailableExpenseMonths() {
  const monthSet = new Set();

  state.expenses.forEach((x) => {
    const key = getMonthKeyFromDate(x.date);
    if (key) monthSet.add(key);
  });

  return Array.from(monthSet).sort((a, b) => (a < b ? 1 : -1));
}

function getFilteredExpensesForList() {
  const selectedMonth = String(state.reportFilters?.expenseMonth || '');
  if (!selectedMonth) return state.expenses;
  return state.expenses.filter((x) => getMonthKeyFromDate(x.date) === selectedMonth);
}

function renderExpenseMonthOptions() {
  if (!el.expenseMonthFilter) return;

  const months = getAvailableExpenseMonths();
  const options = ['<option value="">Tüm Aylar</option>']
    .concat(months.map((m) => `<option value="${m}">${monthLabel(m)}</option>`))
    .join('');

  el.expenseMonthFilter.innerHTML = options;

  const selected = String(state.reportFilters?.expenseMonth || '');
  const hasSelected = selected && months.includes(selected);
  el.expenseMonthFilter.value = hasSelected ? selected : '';

  if (selected && !hasSelected) {
    state.reportFilters.expenseMonth = '';
    saveState();
  }
}

function renderExpenseMonthSummary() {
  if (!el.expenseMonthSummary) return;

  const rows = getFilteredExpensesForList();
  const total = round(rows.reduce((sum, x) => sum + Number(x.amount || 0), 0));
  const selectedMonth = String(state.reportFilters?.expenseMonth || '');

  const categoryMap = new Map();
  rows.forEach((x) => {
    const key = String(x.category || 'Diğer').trim() || 'Diğer';
    categoryMap.set(key, round(Number(categoryMap.get(key) || 0) + Number(x.amount || 0)));
  });

  const topCategory = Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1])[0];

  el.expenseMonthSummary.innerHTML = `
    <div>Dönem: <strong>${selectedMonth ? monthLabel(selectedMonth) : 'Tüm Aylar'}</strong></div>
    <div>Kayıt: <strong>${rows.length}</strong></div>
    <div>Toplam Gider: <strong>${fmtMoney(total)}</strong></div>
    <div>En Büyük Kategori: <strong>${topCategory ? `${escapeHtml(topCategory[0])} (${fmtMoney(topCategory[1])})` : '-'}</strong></div>
  `;
}

function onChangeExpenseMonthFilter() {
  if (!el.expenseMonthFilter) return;
  state.reportFilters.expenseMonth = String(el.expenseMonthFilter.value || '');
  saveState();
  renderExpenseList();
}

function clearExpenseMonthFilter() {
  state.reportFilters.expenseMonth = '';
  saveState();
  renderExpenseList();
}

function renderReportMonthOptions() {
  if (!el.reportMonthSelect) return;

  const months = getAvailableReportMonths();
  const options = ['<option value="">Bu Ay (Canlı)</option>']
    .concat(months.map((m) => `<option value="${m}">${monthLabel(m)}</option>`))
    .join('');

  el.reportMonthSelect.innerHTML = options;

  const selected = state.reportFilters?.month || '';
  const hasSelected = selected && months.includes(selected);
  el.reportMonthSelect.value = hasSelected ? selected : '';

  if (selected && !hasSelected) {
    state.reportFilters.month = '';
    saveState();
  }
}

function onChangeReportMonth() {
  if (!el.reportMonthSelect) return;
  state.reportFilters.month = String(el.reportMonthSelect.value || '');
  saveState();
  renderReports();
}

function clearReportMonthFilter() {
  state.reportFilters.month = '';
  saveState();
  renderReportMonthOptions();
  renderReports();
}

function summaryForMonth(monthKey) {
  if (!monthKey) return periodSummary(30);

  const entries = state.endOfDayEntries.filter((x) => getMonthKeyFromDate(x.date) === monthKey);
  const expenses = state.expenses.filter((x) => getMonthKeyFromDate(x.date) === monthKey);

  const cash = round(entries.reduce((sum, x) => sum + Number(x.cash || 0), 0));
  const card = round(entries.reduce((sum, x) => sum + Number(x.card || 0), 0));
  const gross = round(cash + card);
  const expense = round(expenses.reduce((sum, x) => sum + Number(x.amount || 0), 0));

  return {
    entryCount: entries.length,
    cash,
    card,
    gross,
    expense,
    net: round(gross - expense)
  };
}

function renderSelectedMonthReport() {
  if (!el.selectedMonthReport) return;

  const monthKey = String(state.reportFilters?.month || '');
  const effectiveMonth = monthKey || new Date().toISOString().slice(0, 7);
  const summary = summaryForMonth(effectiveMonth);

  el.selectedMonthReport.innerHTML = `
    <div>Seçili Ay: <strong>${monthLabel(effectiveMonth)}</strong></div>
    <div>Kayıt: <strong>${summary.entryCount}</strong></div>
    <div>Ciro: <strong>${fmtMoney(summary.gross)}</strong></div>
    <div>Gider: <strong>${fmtMoney(summary.expense)}</strong></div>
    <div>Net: <strong>${fmtMoney(summary.net)}</strong></div>
  `;
}

function hydrateCloudBackupConfig() {
  if (!state.cloudBackup || typeof state.cloudBackup !== 'object') {
    state.cloudBackup = {
      url: '',
      key: '',
      storeId: '',
      lastBackupAt: '',
      lastRestoreAt: '',
      autoSyncEnabled: true,
      autoSyncIntervalSec: 30,
      lastRemoteUpdatedAt: ''
    };
  }

  state.cloudBackup.url = String(state.cloudBackup.url || '').trim();
  state.cloudBackup.key = String(state.cloudBackup.key || '').trim();
  state.cloudBackup.storeId = String(state.cloudBackup.storeId || '').trim();
  state.cloudBackup.lastBackupAt = String(state.cloudBackup.lastBackupAt || '');
  state.cloudBackup.lastRestoreAt = String(state.cloudBackup.lastRestoreAt || '');
  state.cloudBackup.autoSyncEnabled = Boolean(
    typeof state.cloudBackup.autoSyncEnabled === 'boolean' ? state.cloudBackup.autoSyncEnabled : true
  );
  state.cloudBackup.autoSyncIntervalSec = Math.max(10, Number(state.cloudBackup.autoSyncIntervalSec || 30));
  state.cloudBackup.lastRemoteUpdatedAt = String(state.cloudBackup.lastRemoteUpdatedAt || '');

  if (el.cloudUrl) el.cloudUrl.value = state.cloudBackup.url;
  if (el.cloudKey) el.cloudKey.value = state.cloudBackup.key;
  if (el.cloudStoreId) el.cloudStoreId.value = state.cloudBackup.storeId;
  if (el.autoSyncEnabled) el.autoSyncEnabled.checked = state.cloudBackup.autoSyncEnabled;
  if (el.autoSyncIntervalSec) el.autoSyncIntervalSec.value = String(state.cloudBackup.autoSyncIntervalSec || 30);
}

function renderCloudBackupStatus() {
  if (!el.cloudBackupStatus) return;
  const url = state.cloudBackup?.url ? escapeHtml(state.cloudBackup.url) : '-';
  const storeId = state.cloudBackup?.storeId ? escapeHtml(state.cloudBackup.storeId) : '-';
  const lastBackup = state.cloudBackup?.lastBackupAt ? fmtDateTime(state.cloudBackup.lastBackupAt) : '-';
  const lastRestore = state.cloudBackup?.lastRestoreAt ? fmtDateTime(state.cloudBackup.lastRestoreAt) : '-';

  el.cloudBackupStatus.innerHTML = `
    <div>Sunucu: <strong>${url}</strong></div>
    <div>Store ID: <strong>${storeId}</strong></div>
    <div>Son Yedek: <strong>${lastBackup}</strong></div>
    <div>Son Geri Yükleme: <strong>${lastRestore}</strong></div>
    <div>Otomatik Senkron: <strong>${state.cloudBackup.autoSyncEnabled ? 'Açık' : 'Kapalı'}</strong></div>
    <div>Senkron Aralığı: <strong>${Number(state.cloudBackup.autoSyncIntervalSec || 30)} sn</strong></div>
  `;
}

async function onSubmitCloudBackupConfig(e) {
  e.preventDefault();

  state.cloudBackup.url = String(el.cloudUrl?.value || '').trim().replace(/\/$/, '');
  state.cloudBackup.key = String(el.cloudKey?.value || '').trim();
  state.cloudBackup.storeId = String(el.cloudStoreId?.value || '').trim();

  suppressAutoPush = true;
  saveState();
  suppressAutoPush = false;

  renderCloudBackupStatus();
  restartAutoSyncLoop();

  const pulled = await pullLatestFromCloud(true, true);
  if (pulled) {
    notify('Bulut ayarları kaydedildi. Buluttaki son veri cihaza alındı.');
    return;
  }

  notify('Bulut ayarları kaydedildi.');
}

function applyAutoSyncSettings() {
  state.cloudBackup.autoSyncEnabled = Boolean(el.autoSyncEnabled?.checked);
  state.cloudBackup.autoSyncIntervalSec = Math.max(10, Number(el.autoSyncIntervalSec?.value || 30));

  suppressAutoPush = true;
  saveState();
  suppressAutoPush = false;

  renderCloudBackupStatus();
  restartAutoSyncLoop();
  notify('Otomatik senkron ayarları güncellendi.');
}

function restartAutoSyncLoop() {
  if (autoSyncTimer) {
    clearInterval(autoSyncTimer);
    autoSyncTimer = null;
  }

  if (!hasValidCloudConfig()) return;
  if (!state.cloudBackup.autoSyncEnabled) return;

  const intervalMs = Math.max(10, Number(state.cloudBackup.autoSyncIntervalSec || 30)) * 1000;

  autoSyncTimer = setInterval(() => {
    pullLatestFromCloud(true);
  }, intervalMs);
}

function hasValidCloudConfig() {
  const cfg = state.cloudBackup || {};
  return Boolean(cfg.url && cfg.key && cfg.storeId);
}

function cloudHeaders() {
  const key = state.cloudBackup.key;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json'
  };
}

function backupPayload() {
  const cloned = structuredClone(state);
  if (cloned.cloudBackup) {
    cloned.cloudBackup.key = '';
  }
  if (cloned.auth) {
    cloned.auth.isLoggedIn = false;
    cloned.auth.role = 'kasiyer';
    cloned.auth.username = 'Kasiyer';
  }
  return cloned;
}

async function backupToCloud(options = {}) {
  const silent = Boolean(options.silent);
  if (!hasValidCloudConfig()) {
    if (!silent) notify('Önce bulut ayarlarını eksiksiz girin.');
    return false;
  }

  const endpoint = `${state.cloudBackup.url}/rest/v1/pos_backups?on_conflict=store_id`;
  const nowIso = new Date().toISOString();
  const body = [
    {
      store_id: state.cloudBackup.storeId,
      payload: backupPayload(),
      updated_at: nowIso
    }
  ];

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...cloudHeaders(),
        Prefer: 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || `HTTP ${res.status}`);
    }

    const rows = await res.json().catch(() => []);
    const remoteUpdatedAt = String((Array.isArray(rows) && rows[0]?.updated_at) || nowIso);

    state.cloudBackup.lastBackupAt = nowIso;
    state.cloudBackup.lastRemoteUpdatedAt = remoteUpdatedAt;
    saveState();
    renderCloudBackupStatus();
    if (!silent) notify('Bulut yedekleme tamamlandı.');
    return true;
  } catch (err) {
    if (!silent) notify(`Yedekleme hatası: ${String(err.message || err)}`);
    return false;
  }
}

async function pullLatestFromCloud(silent = true, force = false) {
  if (!hasValidCloudConfig()) return false;

  const endpoint = `${state.cloudBackup.url}/rest/v1/pos_backups?store_id=eq.${encodeURIComponent(state.cloudBackup.storeId)}&select=payload,updated_at&order=updated_at.desc.nullslast&limit=1`;

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: cloudHeaders()
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      if (!silent) notify(`Bulut okuma hatası: ${errText || `HTTP ${res.status}`}`);
      return false;
    }

    const rows = await res.json();
    const first = Array.isArray(rows) ? rows[0] : null;
    if (!first) {
      if (!silent) notify('Bulutta bu Store ID için kayıt bulunamadı.');
      return false;
    }

    if (!first.payload || typeof first.payload !== 'object') {
      if (!silent) notify('Bulut kaydı bulundu ama payload biçimi geçersiz.');
      return false;
    }

    const remoteUpdatedAt = String(first.updated_at || '');
    const localRemoteRef = String(state.cloudBackup.lastRemoteUpdatedAt || '');
    const remoteMs = Date.parse(remoteUpdatedAt);
    const localMs = Date.parse(localRemoteRef);
    if (!force && !Number.isNaN(remoteMs) && !Number.isNaN(localMs) && remoteMs <= localMs) {
      return false;
    }

    const preservedCloud = {
      url: state.cloudBackup.url,
      key: state.cloudBackup.key,
      storeId: state.cloudBackup.storeId,
      autoSyncEnabled: state.cloudBackup.autoSyncEnabled,
      autoSyncIntervalSec: state.cloudBackup.autoSyncIntervalSec,
      lastBackupAt: state.cloudBackup.lastBackupAt || '',
      lastRestoreAt: new Date().toISOString(),
      lastRemoteUpdatedAt: remoteUpdatedAt || new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(first.payload));
    state = loadState();
    state.cloudBackup = {
      ...state.cloudBackup,
      ...preservedCloud
    };
    ensureAuthState();

    suppressAutoPush = true;
    saveState();
    suppressAutoPush = false;

    hydrateCloudBackupConfig();
    renderAll();
    if (!silent) notify('Buluttan en güncel veri alındı.');
    return true;
  } catch (err) {
    if (!silent) notify(`Bulut okuma hatası: ${String(err.message || err)}`);
    return false;
  }
}

async function restoreFromCloud() {
  if (!hasValidCloudConfig()) {
    notify('Önce bulut ayarlarını eksiksiz girin.');
    return;
  }

  const ok = confirm('Buluttan geri yükleme mevcut yerel verileri değiştirecek. Devam edilsin mi?');
  if (!ok) return;

  try {
    const changed = await pullLatestFromCloud(false, true);
    if (!changed) {
      notify('Buluttan geri yükleme yapılamadı. Store ID / API Key / RLS izinlerini kontrol edin.');
    }
  } catch (err) {
    notify(`Geri yükleme hatası: ${String(err.message || err)}`);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(initialState);

    const parsed = JSON.parse(raw);
    return {
      activeRole: parsed.activeRole || 'kasiyer',
      auth:
        parsed.auth && typeof parsed.auth === 'object'
          ? {
              isLoggedIn: Boolean(parsed.auth.isLoggedIn),
              role: parsed.auth.role === 'yonetici' ? 'yonetici' : 'kasiyer',
              username: parsed.auth.username ? String(parsed.auth.username) : parsed.auth.role === 'yonetici' ? 'admin' : 'Kasiyer'
            }
          : {
              isLoggedIn: false,
              role: 'kasiyer',
              username: 'Kasiyer'
            },
      products: Array.isArray(parsed.products) ? parsed.products : structuredClone(initialState.products),
      cart: Array.isArray(parsed.cart) ? parsed.cart : [],
      sales: Array.isArray(parsed.sales)
        ? parsed.sales.map((s) => ({
            ...s,
            type: s.type || 'satis',
            refunded: Boolean(s.refunded)
          }))
        : [],
      stockMoves: Array.isArray(parsed.stockMoves) ? parsed.stockMoves : [],
      intakePlans: Array.isArray(parsed.intakePlans) ? parsed.intakePlans : [],
      endOfDayEntries: Array.isArray(parsed.endOfDayEntries) ? parsed.endOfDayEntries : [],
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      receiptFilters:
        parsed.receiptFilters && typeof parsed.receiptFilters === 'object'
          ? {
              from: parsed.receiptFilters.from || '',
              to: parsed.receiptFilters.to || ''
            }
          : { from: '', to: '' },
      reportFilters:
        parsed.reportFilters && typeof parsed.reportFilters === 'object'
          ? {
              month: parsed.reportFilters.month || '',
              expenseMonth: parsed.reportFilters.expenseMonth || ''
            }
          : { month: '', expenseMonth: '' },
      cloudBackup:
        parsed.cloudBackup && typeof parsed.cloudBackup === 'object'
          ? {
              url: parsed.cloudBackup.url || '',
              key: parsed.cloudBackup.key || '',
              storeId: parsed.cloudBackup.storeId || '',
              lastBackupAt: parsed.cloudBackup.lastBackupAt || '',
              lastRestoreAt: parsed.cloudBackup.lastRestoreAt || '',
              autoSyncEnabled: typeof parsed.cloudBackup.autoSyncEnabled === 'boolean' ? parsed.cloudBackup.autoSyncEnabled : true,
              autoSyncIntervalSec: parsed.cloudBackup.autoSyncIntervalSec || 30,
              lastRemoteUpdatedAt: parsed.cloudBackup.lastRemoteUpdatedAt || ''
            }
          : {
              url: '',
              key: '',
              storeId: '',
              lastBackupAt: '',
              lastRestoreAt: '',
              autoSyncEnabled: true,
              autoSyncIntervalSec: 30,
              lastRemoteUpdatedAt: ''
            },
      barcodeMode: Boolean(parsed.barcodeMode)
    };
  } catch {
    return structuredClone(initialState);
  }
}

function scheduleAutoPush() {
  if (!state.cloudBackup?.autoSyncEnabled) return;
  if (!hasValidCloudConfig()) return;

  if (autoPushTimer) {
    clearTimeout(autoPushTimer);
  }

  autoPushTimer = setTimeout(() => {
    backupToCloud({ silent: true });
  }, 1200);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  if (!suppressAutoPush) {
    scheduleAutoPush();
  }
}

function onAdminLogin(e) {
  e.preventDefault();
  const username = String(el.adminUsername?.value || '').trim();
  const password = String(el.adminPassword?.value || '').trim();

  if (username !== 'admin' || password !== 'admin') {
    notify('Yönetici giriş bilgileri hatalı.');
    return;
  }

  state.auth.isLoggedIn = true;
  state.auth.role = 'yonetici';
  state.auth.username = 'admin';
  state.activeRole = 'yonetici';

  suppressAutoPush = true;
  saveState();
  suppressAutoPush = false;

  if (el.adminLoginForm) el.adminLoginForm.reset();
  renderAll();
  notify('Yönetici olarak giriş yapıldı.');
}

function loginAsCashier() {
  state.auth.isLoggedIn = true;
  state.auth.role = 'kasiyer';
  state.auth.username = 'Kasiyer';
  state.activeRole = 'kasiyer';

  suppressAutoPush = true;
  saveState();
  suppressAutoPush = false;

  renderAll();
  notify('Kasiyer olarak giriş yapıldı.');
}

function logout() {
  state.auth.isLoggedIn = false;
  state.auth.role = 'kasiyer';
  state.auth.username = 'Kasiyer';
  state.activeRole = 'kasiyer';

  suppressAutoPush = true;
  saveState();
  suppressAutoPush = false;

  renderAll();
  notify('Oturum kapatıldı.');
}

function forceLogoutOnStartup() {
  state.auth.isLoggedIn = false;
  state.auth.role = 'kasiyer';
  state.auth.username = 'Kasiyer';
  state.activeRole = 'kasiyer';

  suppressAutoPush = true;
  saveState();
  suppressAutoPush = false;
}

function ensureAuthState() {
  if (!state.auth || typeof state.auth !== 'object') {
    state.auth = {
      isLoggedIn: false,
      role: 'kasiyer',
      username: 'Kasiyer'
    };
  }

  if (!state.auth.role || (state.auth.role !== 'kasiyer' && state.auth.role !== 'yonetici')) {
    state.auth.role = 'kasiyer';
  }

  if (!state.auth.username) {
    state.auth.username = state.auth.role === 'yonetici' ? 'admin' : 'Kasiyer';
  }

  state.activeRole = state.auth.role;
}

function isLoggedIn() {
  return Boolean(state.auth?.isLoggedIn);
}

function isAdmin() {
  return state.auth?.role === 'yonetici';
}

function getCurrentRole() {
  return state.auth?.role || 'kasiyer';
}

function canAccessTab(tabKey) {
  if (isAdmin()) return true;

  const cashierTabs = new Set(['satis', 'fis', 'raporlar', 'gunsonu', 'giderler']);
  return cashierTabs.has(tabKey);
}

function editProduct(productId) {
  if (!isAdmin()) {
    notify('Ürün düzenleme yetkisi sadece yöneticide.');
    return;
  }

  const product = state.products.find((p) => p.id === productId);
  if (!product) {
    notify('Ürün bulunamadı.');
    return;
  }

  const nameInput = prompt('Ürün adı', String(product.name || ''));
  if (nameInput === null) return;
  const buyPriceInput = prompt('Alış fiyatı', String(product.buyPrice ?? 0));
  if (buyPriceInput === null) return;
  const sellPriceInput = prompt('Satış fiyatı', String(product.sellPrice ?? 0));
  if (sellPriceInput === null) return;
  const criticalStockInput = prompt('Kritik stok', String(product.criticalStock ?? 0));
  if (criticalStockInput === null) return;

  const buyPrice = Number(String(buyPriceInput).replace(',', '.'));
  const sellPrice = Number(String(sellPriceInput).replace(',', '.'));
  const criticalStock = Number(String(criticalStockInput).replace(',', '.'));

  if (!String(nameInput).trim() || Number.isNaN(buyPrice) || Number.isNaN(sellPrice) || Number.isNaN(criticalStock)) {
    notify('Ürün bilgilerini geçerli girin.');
    return;
  }

  product.name = String(nameInput).trim();
  product.buyPrice = round(Math.max(0, buyPrice));
  product.sellPrice = round(Math.max(0, sellPrice));
  product.criticalStock = round(Math.max(0, criticalStock));
  product.updatedAt = new Date().toISOString();

  saveState();
  renderAll();
  notify('Ürün güncellendi.');
}

function deleteProduct(productId) {
  if (!isAdmin()) {
    notify('Ürün silme yetkisi sadece yöneticide.');
    return;
  }

  const product = state.products.find((p) => p.id === productId);
  if (!product) {
    notify('Ürün bulunamadı.');
    return;
  }

  const hasCartLine = state.cart.some((line) => line.productId === productId);
  const hasPlan = state.intakePlans.some((plan) => plan.productId === productId && plan.status === 'pending');

  if (hasCartLine || hasPlan) {
    notify('Ürün sepette veya bekleyen planda olduğu için silinemez.');
    return;
  }

  const ok = confirm(`${product.name} ürünü silinsin mi?`);
  if (!ok) return;

  state.products = state.products.filter((p) => p.id !== productId);
  saveState();
  renderAll();
  notify('Ürün silindi.');
}

function deleteIntakePlan(planId) {
  if (!isAdmin()) {
    notify('Plan silme yetkisi sadece yöneticide.');
    return;
  }

  const plan = state.intakePlans.find((x) => x.id === planId && x.status === 'pending');
  if (!plan) {
    notify('Bekleyen plan bulunamadı.');
    return;
  }

  const ok = confirm('Bekleyen stok planı silinsin mi?');
  if (!ok) return;

  state.intakePlans = state.intakePlans.filter((x) => x.id !== planId);
  saveState();
  renderAll();
  notify('Bekleyen stok planı silindi.');
}

function notify(msg) {
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  setTimeout(() => el.toast.classList.remove('show'), 1900);
}

function startClock() {
  const run = () => {
    el.clock.textContent = new Date().toLocaleString('tr-TR');
  };
  run();
  setInterval(run, 1000);
}

function fmtMoney(v) {
  return Number(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
}

function fmtQty(v) {
  return Number(v || 0).toLocaleString('tr-TR', { maximumFractionDigits: 3 });
}

function fmtDateTime(iso) {
  return new Date(iso).toLocaleString('tr-TR');
}

function round(v) {
  return Math.round(Number(v) * 1000) / 1000;
}

function uid() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}
