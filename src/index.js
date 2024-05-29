const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  Notification,
  powerMonitor,
} = require("electron");
const path = require("path");
const si = require("systeminformation");

let notificationsEnabled = true;

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

  const menu = Menu.buildFromTemplate([
    {
      label: "File",
      submenu: [
        {
          label: "New",
          accelerator: "CmdOrCtrl+N",
          click() {
            console.log("New File");
          },
        },
        {
          label: "Open",
          accelerator: "CmdOrCtrl+O",
          click() {
            console.log("Open File");
          },
        },
        {
          label: "Save",
          accelerator: "CmdOrCtrl+S",
          click() {
            console.log("Save File");
          },
        },
        { type: "separator" },
        {
          label: "Exit",
          click() {
            app.quit();
          },
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        {
          label: "Undo",
          accelerator: "CmdOrCtrl+Z",
          role: "undo",
        },
        {
          label: "Redo",
          accelerator: "CmdOrCtrl+Y",
          role: "redo",
        },
        { type: "separator" },
        {
          label: "Cut",
          accelerator: "CmdOrCtrl+X",
          role: "cut",
        },
        {
          label: "Copy",
          accelerator: "CmdOrCtrl+C",
          role: "copy",
        },
        {
          label: "Paste",
          accelerator: "CmdOrCtrl+V",
          role: "paste",
        },
        {
          label: "Select All",
          accelerator: "CmdOrCtrl+A",
          role: "selectAll",
        },
      ],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Reload",
          accelerator: "CmdOrCtrl+R",
          click() {
            mainWindow.reload();
          },
        },
        {
          label: "Toggle Developer Tools",
          accelerator:
            process.platform === "darwin" ? "Alt+Command+I" : "Ctrl+Shift+I",
          click() {
            mainWindow.webContents.toggleDevTools();
          },
        },
        { type: "separator" },
        {
          label: "Actual Size",
          role: "resetZoom",
        },
        {
          label: "Zoom In",
          role: "zoomIn",
        },
        {
          label: "Zoom Out",
          role: "zoomOut",
        },
        { type: "separator" },
        {
          label: "Toggle Fullscreen",
          accelerator: process.platform === "darwin" ? "Ctrl+Command+F" : "F11",
          click() {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
          },
        },
      ],
    },
    {
      label: "Window",
      role: "windowMenu",
    },
    {
      label: "Notifications",
      submenu: [
        {
          label: "Enable Notifications",
          type: "checkbox",
          checked: notificationsEnabled,
          click: () => {
            notificationsEnabled = !notificationsEnabled;
          },
        },
      ],
    },
    {
      label: "Help",
      role: "help",
      submenu: [
        {
          label: "Learn More",
          click: async () => {
            const { shell } = require("electron");
            await shell.openExternal("https://electronjs.org");
          },
        },
      ],
    },
  ]);

  Menu.setApplicationMenu(menu);
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
  const cpuSpeed = await si.cpuCurrentSpeed();
  const processes = await si.processes();

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

ipcMain.handle("get-hardware-info", async () => {
  const cpu = await si.cpu();
  const memory = await si.mem();
  const network = await si.wifiConnections();
  const os = await si.osInfo();

  return {
    cpu,
    memory,
    network,
    os,
  };
});

async function checkSystemMetrics() {
  if (notificationsEnabled) {
    const cpuLoad = await si.currentLoad();
    const memoryUsage = await si.mem();

    if (cpuLoad.currentLoad >= 99) {
      sendNotification("High CPU Load", "CPU load is above 99%");
    }

    if ((memoryUsage.used / memoryUsage.total) * 100 >= 99) {
      sendNotification("High Memory Usage", "Memory usage is above 99%");
    }
  }
}

async function checkBatteryLevel() {
  if (notificationsEnabled) {
    const batteryLevel = await si.battery();
    if (batteryLevel && batteryLevel.percent < 20) {
      sendNotification("Low Battery", "Battery level is below 20%");
    }
  }
}

function sendNotification(title, body) {
  const notification = new Notification({ title, body });
  notification.show();
}

setInterval(checkSystemMetrics, 10000);
checkSystemMetrics();

setInterval(checkBatteryLevel, 10000);
checkBatteryLevel();
