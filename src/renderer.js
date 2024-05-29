const { ipcRenderer } = require("electron");
const Chart = require("chart.js/auto");

let cpuData = [];
let cpuCoreData = [];
let cpuSpeedData = [];
let memoryData = [0, 0];
let memoryUsageData = [];
let networkData = [];
let labels = [];

const updateInterval = 1000;

let cpuChart,
  cpuPerCoreChart,
  cpuSpeedChart,
  memoryChart,
  memoryUsageChart,
  networkChart;

async function fetchMetrics() {
  const metrics = await ipcRenderer.invoke("get-system-metrics");
  const timestamp = new Date().toLocaleTimeString();
  labels.push(timestamp);

  // Keep only the last 10 data points
  if (labels.length > 10) {
    labels.shift();
  }

  // CPU data
  const cpuLoad = metrics.cpu.currentLoad;
  cpuData.push(cpuLoad);
  if (cpuData.length > 10) {
    cpuData.shift();
  }

  const cpuCoresLoad = metrics.cpu.cpus.map((core) => core.load);
  cpuCoreData.push(cpuCoresLoad);
  if (cpuCoreData.length > 10) {
    cpuCoreData.shift();
  }

  const cpuSpeed = metrics.cpu.speed;
  cpuSpeedData.push(cpuSpeed);
  if (cpuSpeedData.length > 10) {
    cpuSpeedData.shift();
  }

  // Memory data
  const memoryUsed = metrics.memory.used / (1024 * 1024 * 1024); // Convert to GB
  const memoryTotal = metrics.memory.total / (1024 * 1024 * 1024); // Convert to GB
  memoryData[0] = memoryUsed;
  memoryData[1] = memoryTotal - memoryUsed;

  const memoryUsage = (metrics.memory.used / metrics.memory.total) * 100;
  memoryUsageData.push(memoryUsage);
  if (memoryUsageData.length > 10) {
    memoryUsageData.shift();
  }

  // Network data
  const networkTx = metrics.network[0].txRate;
  networkData.push(networkTx);
  if (networkData.length > 10) {
    networkData.shift();
  }

  updateCharts();
}

function createCharts() {
  const ctxCpu = document.getElementById("cpuChart").getContext("2d");
  cpuChart = new Chart(ctxCpu, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "CPU Load (%)",
          data: cpuData,
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
        },
      },
    },
  });

  const ctxCpuPerCore = document
    .getElementById("cpuPerCoreChart")
    .getContext("2d");
  cpuPerCoreChart = new Chart(ctxCpuPerCore, {
    type: "line",
    data: {
      labels: labels,
      datasets: [],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
        },
      },
    },
  });

  const ctxCpuSpeed = document.getElementById("cpuSpeedChart").getContext("2d");
  cpuSpeedChart = new Chart(ctxCpuSpeed, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "CPU Speed (GHz)",
          data: cpuSpeedData,
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });

  const ctxMemory = document.getElementById("memoryChart").getContext("2d");
  memoryChart = new Chart(ctxMemory, {
    type: "doughnut",
    data: {
      labels: ["Used Memory (GB)", "Free Memory (GB)"],
      datasets: [
        {
          data: memoryData,
          backgroundColor: [
            "rgba(255, 99, 132, 0.2)",
            "rgba(54, 162, 235, 0.2)",
          ],
          borderColor: ["rgba(255, 99, 132, 1)", "rgba(54, 162, 235, 1)"],
          borderWidth: 1,
        },
      ],
    },
    options: {
      cutout: "50%",
      plugins: {
        legend: {
          display: true,
          position: "bottom",
        },
      },
    },
  });

  const ctxMemoryUsage = document
    .getElementById("memoryUsageChart")
    .getContext("2d");
  memoryUsageChart = new Chart(ctxMemoryUsage, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Memory Usage (%)",
          data: memoryUsageData,
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          borderColor: "rgba(255, 99, 132, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
        },
      },
    },
  });

  const ctxNetwork = document.getElementById("networkChart").getContext("2d");
  networkChart = new Chart(ctxNetwork, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Transfer rate (MBit/s)",
          data: networkData,
          backgroundColor: "rgba(153, 102, 255, 0.2)",
          borderColor: "rgba(153, 102, 255, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

function updateCharts() {
  cpuChart.update();

  cpuPerCoreChart.data.datasets = cpuCoreData[0].map((core, index) => ({
    label: `Core ${index + 1}`,
    data: cpuCoreData.map((coreLoads) => coreLoads[index]),
    backgroundColor: `rgba(75, 192, 192, 0.2)`,
    borderColor: `rgba(75, 192, 192, 1)`,
    borderWidth: 1,
  }));
  cpuPerCoreChart.update();
  cpuSpeedChart.update();
  memoryChart.update();
  memoryUsageChart.update();
  networkChart.update();
}

function updateProcessTable(processes) {
  const tableBody = document.getElementById("processTableBody");
  tableBody.innerHTML = "";

  const sortedProcesses = processes.list
    .sort((a, b) => b.mem - a.mem)
    .slice(0, 10);

  sortedProcesses.forEach((process) => {
    const row = document.createElement("tr");
    row.innerHTML = `
        <td class="border px-4 py-2">${process.name}</td>
        <td class="border px-4 py-2">${process.pid}</td>
        <td class="border px-4 py-2">${process.cpu.toFixed(2)}%</td>
        <td class="border px-4 py-2">${process.mem.toFixed(2)}%</td>
      `;
    tableBody.appendChild(row);
  });
}

function switchTab(event) {
  const tabId = event.target.dataset.tab;
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.add("hidden");
  });
  document.getElementById(tabId).classList.remove("hidden");

  document.querySelectorAll(".border-b a").forEach((tabLink) => {
    tabLink.classList.remove(
      "text-blue-700",
      "border-l",
      "border-t",
      "border-r",
      "rounded-t"
    );
    tabLink.classList.add("text-blue-500", "hover:text-blue-800");
  });
  event.target.classList.add(
    "text-blue-700",
    "border-l",
    "border-t",
    "border-r",
    "rounded-t"
  );
}

async function fetchHardwareInfo() {
  const hardwareInfo = await ipcRenderer.invoke("get-hardware-info");

  document.getElementById("cpuHardwareInfo").innerHTML = `
    <p>Model: ${
      hardwareInfo.cpu.manufacturer + " " + hardwareInfo.cpu.brand
    }</p>
    <p>Cores: ${hardwareInfo.cpu.cores}</p>
    <p>Speed: ${hardwareInfo.cpu.speed} GHz</p>
  `;

  document.getElementById("memoryHardwareInfo").innerHTML = `
    <p>Total Memory: ${(
      hardwareInfo.memory.total /
      (1024 * 1024 * 1024)
    ).toFixed(2)} GB</p>
  `;

  document.getElementById("networkHardwareInfo").innerHTML = `
    <p>Wifi name: ${hardwareInfo.network[0].ssid}</p>
  `;

  document.getElementById("processesHardwareInfo").innerHTML = `
    <p>Operating System: ${hardwareInfo.os.platform} ${hardwareInfo.os.distro}</p>
  `;
}

window.onload = () => {
  createCharts();
  fetchHardwareInfo();
  fetchMetrics();
  setInterval(fetchMetrics, updateInterval); // Update every second
  setInterval(() => {
    ipcRenderer.invoke("get-system-metrics").then((metrics) => {
      updateProcessTable(metrics.processes);
    });
  }, updateInterval);

  document.querySelectorAll(".border-b a").forEach((tabLink) => {
    tabLink.addEventListener("click", switchTab);
  });
};
