const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1200,
    minHeight: 760,
    autoHideMenuBar: true,
    title: 'Hesap Et POS',
    backgroundColor: '#060b1a',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile(path.join(__dirname, '..', 'index.html'));

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function setupAutoUpdates(win) {
  if (isDev) return;

  const execPath = String(process.execPath || '').toLowerCase();
  const isUnpackedBuild = execPath.includes('win-unpacked') || execPath.includes('-win32-x64');

  if (isUnpackedBuild) {
    dialog.showMessageBox(win, {
      type: 'info',
      title: 'Auto Update Bilgisi',
      message: 'Bu çalıştırma tipi otomatik güncelleme desteklemez.',
      detail: 'Güncelleme için kurulum dosyası (Setup) ile yüklenen sürümü kullanın.'
    });
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('[updater] Güncelleme kontrol ediliyor...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log(`[updater] Güncelleme bulundu: ${info?.version || 'bilinmiyor'}`);
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[updater] Güncelleme bulunamadı.');
  });

  autoUpdater.on('download-progress', (progress) => {
    const percent = Number(progress?.percent || 0).toFixed(1);
    console.log(`[updater] İndiriliyor: %${percent}`);
  });

  autoUpdater.on('error', async (err) => {
    const message = err?.message || String(err || 'Bilinmeyen hata');
    console.error('[updater] Hata:', message);

    await dialog.showMessageBox(win, {
      type: 'warning',
      title: 'Güncelleme Kontrolü Başarısız',
      message: 'Uygulama güncelleme sunucusuna erişemedi.',
      detail: message
    });
  });

  autoUpdater.on('update-downloaded', async () => {
    const result = await dialog.showMessageBox(win, {
      type: 'info',
      buttons: ['Şimdi yeniden başlat', 'Daha sonra'],
      defaultId: 0,
      cancelId: 1,
      title: 'Güncelleme Hazır',
      message: 'Yeni sürüm indirildi. Güncellemeyi uygulamak için uygulama yeniden başlatılacak.'
    });

    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[updater] İlk kontrol hatası:', err?.message || err);
  });

  setInterval(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[updater] Periyodik kontrol hatası:', err?.message || err);
    });
  }, 6 * 60 * 60 * 1000);
}

app.whenReady().then(() => {
  createWindow();
  const win = BrowserWindow.getAllWindows()[0];
  if (win) setupAutoUpdates(win);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
