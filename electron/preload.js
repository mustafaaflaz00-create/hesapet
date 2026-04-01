const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('hesapet', {
  platform: process.platform,
  version: '2.1.0'
});
