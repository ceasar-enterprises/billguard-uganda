const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  accounts: {
    list: (type) => ipcRenderer.invoke('accounts:list', type),
    get: (id) => ipcRenderer.invoke('accounts:get', id),
    add: (data) => ipcRenderer.invoke('accounts:add', data),
    update: (id, data) => ipcRenderer.invoke('accounts:update', id, data),
    delete: (id) => ipcRenderer.invoke('accounts:delete', id)
  },
  bills: {
    list: (accountId) => ipcRenderer.invoke('bills:list', accountId),
    upcoming: () => ipcRenderer.invoke('bills:upcoming'),
    overdue: () => ipcRenderer.invoke('bills:overdue'),
    add: (data) => ipcRenderer.invoke('bills:add', data),
    update: (id, data) => ipcRenderer.invoke('bills:update', id, data),
    pay: (billId, paymentData) => ipcRenderer.invoke('bills:pay', billId, paymentData),
    delete: (id) => ipcRenderer.invoke('bills:delete', id)
  },
  payments: {
    list: (accountId) => ipcRenderer.invoke('payments:list', accountId),
    add: (data) => ipcRenderer.invoke('payments:add', data)
  },
  dashboard: {
    summary: () => ipcRenderer.invoke('dashboard:summary'),
    monthly: () => ipcRenderer.invoke('dashboard:monthly')
  },
  ussd: {
    nwsc: (accountNumber, area) => ipcRenderer.invoke('ussd:nwsc', accountNumber, area),
    umeme: (accountNumber) => ipcRenderer.invoke('ussd:umeme', accountNumber)
  },
  shell: {
    open: (url) => ipcRenderer.invoke('shell:open', url)
  }
});
