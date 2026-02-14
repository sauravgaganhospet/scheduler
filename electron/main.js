import { app, BrowserWindow } from 'electron';
import path from 'node:path';

const isDev = !!process.env.VITE_DEV_SERVER_URL;

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 800,
    title: 'Routine Planner',
    webPreferences: {
      preload: path.join(process.cwd(), 'electron', 'preload.js')
    }
  });

  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.cwd(), 'dist', 'index.html'));
  }

  // Optional: remove default menu
  // win.setMenu(null);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
