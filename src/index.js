const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { wifiConnections } = require("systeminformation");
const si = require("systeminformation");

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "renderer.js"),
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname + "/dashboard.png"),
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle("get-system-metrics", async () => {
  const cpu = await si.currentLoad();
  const memory = await si.mem();
  const network = await si.wifiConnections();
  const processes = await si.processes();
  const cpuSpeed = await si.cpuCurrentSpeed();

  return {
    cpu: {
      currentLoad: cpu.currentLoad,
      cpus: cpu.cpus,
      speed:
        cpuSpeed.cores.reduce((sum, currentValue) => sum + currentValue, 0) /
        cpuSpeed.cores.length,
    },
    memory: {
      total: memory.total,
      used: memory.used,
    },
    network: network,
    processes: processes,
  };
});
