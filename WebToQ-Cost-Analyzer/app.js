// Pricing data
const pricing = {
  rds: {
    instances: {
      'db.t4g.medium': { monthly: 53.29, tier: 'Development' },
      'db.r6g.large': { monthly: 201.48, tier: 'Small Production' },
      'db.r6g.xlarge': { monthly: 402.96, tier: 'Medium Production' },
      'db.r6g.2xlarge': { monthly: 805.92, tier: 'Large Production' }
    },
    storage: 0.10,
    multiAzMultiplier: 2
  },
  valkey: {
    serverless: {
      storagePerGbHour: 0.084,
      ecpuPerHour: 0.14
    },
    cluster: {
      'cache.t4g.medium': 37.96,
      'cache.r7g.large': 146,
      'cache.r7g.xlarge': 292,
      'cache.r7g.2xlarge': 584
    },
    multiAzMultiplier: 2
  },
  lambda: {
    perRequest: 0.20 / 1000000,
    gbSecond: 0.0000166667
  },
  apiGateway: {
    http: 1.00 / 1000000,
    rest: 3.50 / 1000000,
    websocket: 1.00 / 1000000
  },
  vpc: {
    natGateway: 32.85
  },
  cloudwatch: {
    logs: 0.50 / 1000000000
  }
};

// Environment scenarios
const scenarios = {
  base: {
    name: 'Uso Base',
    lambdaRequests: 500000,
    lambdaAvgMemoryMb: 256,
    lambdaAvgDurationMs: 300,
    apiRequests: 10000,
    rdsStorageDefault: 50,
    valkeyStorageDefault: 0.1,
    rdsInstanceDefault: 'db.t4g.medium',
    multiAzDefault: false
  },
  medio: {
    name: 'Uso Medio',
    lambdaRequests: 10000000,
    lambdaAvgMemoryMb: 512,
    lambdaAvgDurationMs: 400,
    apiRequests: 1000000,
    rdsStorageDefault: 100,
    valkeyStorageDefault: 0.5,
    rdsInstanceDefault: 'db.r6g.large',
    multiAzDefault: false
  },
  alto: {
    name: 'Uso Alto',
    lambdaRequests: 100000000,
    lambdaAvgMemoryMb: 512,
    lambdaAvgDurationMs: 500,
    apiRequests: 10000000,
    rdsStorageDefault: 200,
    valkeyStorageDefault: 5,
    rdsInstanceDefault: 'db.r6g.xlarge',
    multiAzDefault: true
  },
  webtoq: {
    name: 'Proyección WebToQ',
    description: '1,000 Agentes × 4 Clientes/día',
    lambdaRequests: 12400000,
    lambdaAvgMemoryMb: 512,
    lambdaAvgDurationMs: 450,
    apiRequests: 12400000,
    rdsStorageDefault: 100,
    valkeyStorageDefault: 0.07,
    valkeyQueriesPerMonth: 43400000,
    concurrentConnections: 1750,
    concurrentWebsocket: 1750,
    agents: 1000,
    clientsPerAgent: 4,
    sessionsPerMonth: 110000,
    recommendedRds: 'db.r6g.large',
    recommendedValkey: 'cache.r7g.large',
    recommendationText: 'Usar Cluster Valkey (carga 24/7 sostenida). NO Serverless.',
    rdsInstanceDefault: 'db.r6g.large',
    multiAzDefault: false,
    valkeyClusterDefault: true
  },
  burstable: {
    name: 'Burstable (t4g)',
    description: 'Instancia económica Burstable - NO recomendada',
    instance: 'cache.t4g.medium',
    memory_gb: 3.09,
    vcpu: '2 (burstable)',
    lambdaRequests: 12400000,
    lambdaAvgMemoryMb: 512,
    lambdaAvgDurationMs: 450,
    apiRequests: 12400000,
    rdsStorageDefault: 100,
    valkeyStorageDefault: 0.07,
    valkeyInstanceDefault: 'cache.t4g.medium',
    rdsInstanceDefault: 'db.r6g.large',
    multiAzDefault: false,
    valkeyQueriesPerMonth: 43400000,
    concurrentConnections: 1750,
    concurrentWebsocket: 1750,
    cost: 37.96,
    burstable_specs: {
      cpu_baseline: '20%',
      initial_credits: 100,
      consumption_per_minute: 2.5,
      hours_until_throttle: 4,
      hours_per_month: 40
    },
    latency_projection: [
      { time: '8:00 AM', credits: 100, latency_ms: '1-5', status: '✅ OK' },
      { time: '9:00 AM', credits: 70, latency_ms: '1-5', status: '✅ OK' },
      { time: '10:00 AM', credits: 40, latency_ms: '5-20', status: '⚠️ Degradando' },
      { time: '11:00 AM', credits: 10, latency_ms: '50-100', status: '⚠️ Crítico' },
      { time: '12:00 PM', credits: 0, latency_ms: '200-500', status: '❌ THROTTLED' },
      { time: '1:00 PM', credits: 0, latency_ms: '200-500', status: '❌ THROTTLED' },
      { time: 'After 1 PM', credits: 0, latency_ms: '200-500', status: '❌ THROTTLED (Rest of day)' }
    ],
    comparison_with_r6g: [
      { label: 'Costo/Mes', t4g: '$37.96', r6g: '$146.00' },
      { label: 'Latencia Normal', t4g: '1-5ms', r6g: '1-5ms' },
      { label: 'Latencia Degradada', t4g: '200-500ms', r6g: '1-5ms (igual)' },
      { label: 'Performance Garantizado', t4g: '❌ NO', r6g: '✅ SÍ' },
      { label: 'Créditos/Mes', t4g: '~100', r6g: '∞ (sin límite)' },
      { label: 'Downtime esperado', t4g: 'SÍ', r6g: 'NO' },
      { label: 'Adecuada para Prod', t4g: '❌ NO', r6g: '✅ SÍ' },
    ]
  }
};

// Current state
let currentEnvironment = 'base';
let pieChart = null;
let barChart = null;
let instanceComparisonChart = null;
let growthProjectionChart = null;
let latencyDegradationChart = null;

// Initialize
function init() {
  console.log('Initializing app...');
  
  // Verify required elements exist
  const pieCanvas = document.getElementById('pieChart');
  const legendContainer = document.getElementById('pie-legend');
  const tableBody = document.getElementById('cost-table-body');
  
  if (!pieCanvas) {
    console.error('pieChart canvas not found');
    return;
  }
  if (!legendContainer) {
    console.error('pie-legend container not found');
    return;
  }
  if (!tableBody) {
    console.error('cost-table-body not found');
    return;
  }
  
  // Verify Chart.js is loaded
  if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded');
    return;
  }
  
  console.log('All elements found, initializing...');
  initCharts();
  switchEnvironment('base');
}

// Switch environment (make it globally accessible)
window.switchEnvironment = function switchEnvironment(env) {
  currentEnvironment = env;
  
  // Get scenario once
  const scenario = scenarios[env];
  if (!scenario) {
    console.error('Invalid environment:', env);
    return;
  }
  
  // Update button states
  document.querySelectorAll('.env-button').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.env === env) {
      btn.classList.add('active');
    }
  });
  
  // Show/hide WebToQ panel
  const webtoqPanel = document.getElementById('webtoq-panel');
  if (webtoqPanel) {
    webtoqPanel.style.display = env === 'webtoq' ? 'block' : 'none';
  }
  
  // Show/hide Burstable panel
  const burstablePanel = document.getElementById('burstable-panel');
  if (burstablePanel) {
    burstablePanel.style.display = env === 'burstable' ? 'block' : 'none';
  }
  
  // Show/hide Growth chart for WebToQ
  const growthChartContainer = document.getElementById('growth-chart-container');
  if (growthChartContainer) {
    growthChartContainer.style.display = env === 'webtoq' ? 'block' : 'none';
  }
  
  // Update defaults
  document.getElementById('rds-instance').value = scenario.rdsInstanceDefault;
  document.getElementById('rds-multiaz').checked = scenario.multiAzDefault;
  document.getElementById('rds-storage').value = scenario.rdsStorageDefault;
  document.getElementById('valkey-storage').value = scenario.valkeyStorageDefault;
  
  // Set Valkey type based on environment
  if (env === 'burstable') {
    // Burstable uses special t4g configuration
    if (document.getElementById('valkey-cluster')) {
      document.getElementById('valkey-cluster').checked = true;
      document.getElementById('valkey-node-type').value = 'cache.t4g.medium';
      document.getElementById('valkey-nodes').value = 1;
      document.getElementById('valkey-multiaz').checked = false;
      toggleValkeyConfig();
    }
  } else if (env === 'webtoq' && scenario.valkeyClusterDefault) {
    if (document.getElementById('valkey-cluster')) {
      document.getElementById('valkey-cluster').checked = true;
      document.getElementById('valkey-node-type').value = 'cache.r7g.large';
      document.getElementById('valkey-nodes').value = 2;
      document.getElementById('valkey-multiaz').checked = false;
      toggleValkeyConfig();
    }
  } else {
    if (document.getElementById('valkey-serverless')) {
      document.getElementById('valkey-serverless').checked = true;
      toggleValkeyConfig();
    }
  }
  
  // Set Valkey ECPUs based on environment
  if (env === 'burstable') {
    document.getElementById('valkey-ecpu-min').value = 20;
    document.getElementById('valkey-ecpu-max').value = 40;
    document.getElementById('valkey-hours').value = 24;
  } else if (env === 'base') {
    document.getElementById('valkey-ecpu-min').value = 1;
    document.getElementById('valkey-ecpu-max').value = 5;
    document.getElementById('valkey-hours').value = 8;
  } else if (env === 'medio') {
    document.getElementById('valkey-ecpu-min').value = 5;
    document.getElementById('valkey-ecpu-max').value = 15;
    document.getElementById('valkey-hours').value = 16;
  } else if (env === 'webtoq') {
    document.getElementById('valkey-ecpu-min').value = 20;
    document.getElementById('valkey-ecpu-max').value = 40;
    document.getElementById('valkey-hours').value = 24;
  } else {
    document.getElementById('valkey-ecpu-min').value = 30;
    document.getElementById('valkey-ecpu-max').value = 50;
    document.getElementById('valkey-hours').value = 24;
  }
  
  calculateCosts();
};

// Toggle Valkey configuration (make it globally accessible)
window.toggleValkeyConfig = function toggleValkeyConfig() {
  const isServerless = document.getElementById('valkey-serverless').checked;
  
  if (isServerless) {
    document.getElementById('serverless-options').classList.add('active');
    document.getElementById('cluster-options').classList.remove('active');
  } else {
    document.getElementById('serverless-options').classList.remove('active');
    document.getElementById('cluster-options').classList.add('active');
  }
  
  calculateCosts();
};

// Calculate all costs
function calculateCosts() {
  const scenario = scenarios[currentEnvironment];
  const costs = {};
  
  // Lambda costs
  const lambdaGbSeconds = (scenario.lambdaRequests * (scenario.lambdaAvgMemoryMb / 1024) * (scenario.lambdaAvgDurationMs / 1000));
  const lambdaCost = (scenario.lambdaRequests * pricing.lambda.perRequest) + (lambdaGbSeconds * pricing.lambda.gbSecond);
  costs.lambda = lambdaCost;
  
  // API Gateway costs (1 REST, 7 HTTP, 2 WebSocket)
  const apiCost = (scenario.apiRequests * pricing.apiGateway.rest) + 
                  (scenario.apiRequests * 7 * pricing.apiGateway.http) + 
                  (scenario.apiRequests * 2 * pricing.apiGateway.websocket);
  costs.apiGateway = apiCost;
  
  // RDS costs
  const rdsInstance = document.getElementById('rds-instance').value;
  const rdsMultiAz = document.getElementById('rds-multiaz').checked;
  const rdsStorage = parseFloat(document.getElementById('rds-storage').value);
  
  let rdsCost = pricing.rds.instances[rdsInstance].monthly;
  if (rdsMultiAz) rdsCost *= pricing.rds.multiAzMultiplier;
  rdsCost += (rdsStorage * pricing.rds.storage);
  costs.rds = rdsCost;
  
  // Valkey costs - check if cluster or serverless
  const isServerless = document.getElementById('valkey-serverless').checked;
  let valkeyCost = 0;
  
  if (isServerless) {
    const ecpuMin = parseFloat(document.getElementById('valkey-ecpu-min').value);
    const ecpuMax = parseFloat(document.getElementById('valkey-ecpu-max').value);
    const storage = parseFloat(document.getElementById('valkey-storage').value);
    const hoursPerDay = parseFloat(document.getElementById('valkey-hours').value);
    
    const avgEcpu = (ecpuMin + ecpuMax) / 2;
    const hoursPerMonth = (hoursPerDay / 24) * 730;
    
    const storageCost = storage * pricing.valkey.serverless.storagePerGbHour * 730;
    const ecpuCost = avgEcpu * pricing.valkey.serverless.ecpuPerHour * hoursPerMonth;
    
    valkeyCost = storageCost + ecpuCost;
  } else {
    const nodeType = document.getElementById('valkey-node-type').value;
    const nodes = parseFloat(document.getElementById('valkey-nodes').value);
    const multiAz = document.getElementById('valkey-multiaz').checked;
    
    valkeyCost = pricing.valkey.cluster[nodeType] * nodes;
    if (multiAz) valkeyCost *= pricing.valkey.multiAzMultiplier;
  }
  
  costs.valkey = valkeyCost;
  
  // VPC costs
  costs.vpc = pricing.vpc.natGateway;
  
  // CloudWatch Logs (estimated)
  const logsCost = Math.max(5, scenario.apiRequests / 100000 * 0.5);
  costs.cloudwatch = logsCost;
  
  // Update UI
  updateCostTable(costs);
  updateCharts(costs);
  updateRecommendations(costs);
}

// Update cost table
function updateCostTable(costs) {
  const tbody = document.getElementById('cost-table-body');
  const total = Object.values(costs).reduce((a, b) => a + b, 0);
  
  const isServerless = document.getElementById('valkey-serverless').checked;
  const valkeyConfig = isServerless ? 'Serverless' : document.getElementById('valkey-node-type').value;
  const valkeyMultiAz = !isServerless && document.getElementById('valkey-multiaz').checked;
  
  const services = [
    { name: '⚡ Lambda', key: 'lambda', config: `51 funciones, ${scenarios[currentEnvironment].lambdaRequests.toLocaleString()} requests` },
    { name: '🔌 API Gateway', key: 'apiGateway', config: '1 REST + 7 HTTP + 2 WebSocket' },
    { name: '🗄️ RDS Aurora', key: 'rds', config: `${document.getElementById('rds-instance').value}${document.getElementById('rds-multiaz').checked ? ' Multi-AZ' : ''}` },
    { name: '⚙️ ElastiCache Valkey', key: 'valkey', config: valkeyConfig + (valkeyMultiAz ? ' Multi-AZ' : '') },
    { name: '🌐 VPC NAT Gateway', key: 'vpc', config: '1 NAT Gateway' },
    { name: '📊 CloudWatch Logs', key: 'cloudwatch', config: 'Log retention & analytics' }
  ];
  
  let html = '';
  services.forEach(service => {
    const cost = costs[service.key];
    const percentage = (cost / total * 100).toFixed(1);
    const costClass = cost > total * 0.3 ? 'cost-high' : cost > total * 0.15 ? 'cost-medium' : 'cost-low';
    
    html += `
      <tr>
        <td>${service.name}</td>
        <td>${service.config}</td>
        <td class="cost-value ${costClass}">$${cost.toFixed(2)}</td>
        <td>${percentage}%</td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
  document.getElementById('total-monthly').textContent = `$${total.toFixed(2)}`;
  document.getElementById('total-yearly').textContent = `$${(total * 12).toFixed(2)}`;
}

// Initialize charts
function initCharts() {
  const canvas = document.getElementById('pieChart');
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }
  
  const ctx1 = canvas.getContext('2d');
  if (!ctx1) {
    console.error('Could not get 2d context');
    return;
  }
  
  // Initialize Instance Comparison Chart
  const instanceCanvas = document.getElementById('instanceComparisonChart');
  if (instanceCanvas) {
    const ctx2 = instanceCanvas.getContext('2d');
    instanceComparisonChart = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: ['t4g.medium', 'r7g.large', 'r7g.xlarge', 'r7g.2xlarge'],
        datasets: [{
          label: 'Costo Mensual ($)',
          data: [37.96, 146, 292, 584],
          backgroundColor: ['#FF6B6B', '#1FB8CD', '#FFC185', '#B4413C'],
          borderColor: ['#E84D4D', '#208C7E', '#FFB627', '#A13838'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return '$' + context.parsed.y.toFixed(2) + '/mes';
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '$' + value;
              }
            }
          }
        }
      }
    });
  }
  
  // Initialize Growth Projection Chart (WebToQ)
  const growthCanvas = document.getElementById('growthProjectionChart');
  if (growthCanvas) {
    const ctx3 = growthCanvas.getContext('2d');
    growthProjectionChart = new Chart(ctx3, {
      type: 'line',
      data: {
        labels: ['Mes 1', 'Mes 2', 'Mes 3', 'Mes 4', 'Mes 5', 'Mes 6', 'Mes 7', 'Mes 8', 'Mes 9', 'Mes 10', 'Mes 11', 'Mes 12'],
        datasets: [{
          label: 'Costo Mensual',
          data: [150, 150, 150, 250, 250, 250, 380, 380, 380, 590, 590, 590],
          borderColor: '#1FB8CD',
          backgroundColor: 'rgba(31, 184, 205, 0.1)',
          tension: 0.4,
          fill: true,
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true },
          tooltip: {
            callbacks: {
              label: function(context) {
                return '$' + context.parsed.y + '/mes';
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '$' + value;
              }
            }
          }
        }
      }
    });
  }
  
  // Initialize t4g Latency Degradation Chart
  const t4gLatencyCanvas = document.getElementById('t4gLatencyChart');
  if (t4gLatencyCanvas) {
    const ctx4 = t4gLatencyCanvas.getContext('2d');
    latencyDegradationChart = new Chart(ctx4, {
      type: 'line',
      data: {
        labels: ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM'],
        datasets: [
          {
            label: 'Latencia (ms)',
            data: [3, 3, 12, 75, 350, 350, 350],
            borderColor: '#E84D4D',
            backgroundColor: 'rgba(232, 77, 77, 0.1)',
            tension: 0.3,
            fill: true,
            borderWidth: 3,
            yAxisID: 'y'
          },
          {
            label: 'Créditos CPU',
            data: [100, 70, 40, 10, 0, 0, 0],
            borderColor: '#1FB8CD',
            backgroundColor: 'rgba(31, 184, 205, 0.1)',
            tension: 0.3,
            fill: true,
            borderWidth: 2,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: { 
            display: true,
            position: 'top'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                if (context.datasetIndex === 0) {
                  return 'Latencia: ' + context.parsed.y + 'ms';
                } else {
                  return 'Créditos: ' + context.parsed.y;
                }
              }
            }
          }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            beginAtZero: true,
            title: {
              display: true,
              text: 'Latencia (ms)'
            },
            ticks: {
              callback: function(value) {
                return value + 'ms';
              }
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Créditos CPU'
            },
            grid: {
              drawOnChartArea: false
            }
          }
        }
      }
    });
  }
  
  try {
    pieChart = new Chart(ctx1, {
    type: 'doughnut',
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545'],
        borderWidth: 2,
        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--color-surface')
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.label + ': $' + context.parsed.toFixed(2);
            }
          }
        }
      }
    }
    });
    console.log('Pie chart initialized successfully');
  } catch (error) {
    console.error('Error initializing chart:', error);
  }
}

// Update charts
function updateCharts(costs) {
  // Update pie chart
  const labels = ['Lambda', 'API Gateway', 'RDS Aurora', 'Valkey', 'VPC', 'CloudWatch'];
  const data = [costs.lambda, costs.apiGateway, costs.rds, costs.valkey, costs.vpc, costs.cloudwatch];
  const total = data.reduce((a, b) => a + b, 0);
  const colors = ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545'];
  
  if (pieChart && pieChart.data) {
    pieChart.data.labels = labels;
    pieChart.data.datasets[0].data = data;
    try {
      pieChart.update();
    } catch (error) {
      console.error('Error updating pie chart:', error);
    }
  } else {
    console.error('Pie chart not initialized');
  }
  
  // Update custom legend
  const legendContainer = document.getElementById('pie-legend');
  let legendHTML = '';
  labels.forEach((label, i) => {
    const percentage = ((data[i] / total) * 100).toFixed(1);
    legendHTML += `
      <li style="display:flex;align-items:center;gap:var(--space-8);font-size:var(--font-size-sm);">
        <span style="display:inline-block;width:14px;height:14px;border-radius:var(--radius-sm);background-color:${colors[i]};flex-shrink:0;"></span>
        <span style="color:var(--color-text);flex:1;">${label}</span>
        <span style="color:var(--color-text-secondary);font-family:var(--font-family-mono);font-size:var(--font-size-xs);">${percentage}%</span>
        <span style="color:var(--color-text);font-weight:var(--font-weight-semibold);font-family:var(--font-family-mono);font-size:var(--font-size-sm);">$${data[i].toFixed(2)}</span>
      </li>
    `;
  });
  legendContainer.innerHTML = legendHTML;
  
  // Update Valkey comparison SVG
  updateValkeyComparisonSVG(costs);
  
  // Update RDS comparison table
  updateRDSComparisonTable(costs);
  
  // Update Valkey comparison table
  updateValkeyComparisonTable(costs);
  
  // Highlight selected instance in comparison chart
  updateInstanceComparisonHighlight();
}

// Calculate serverless estimate for comparison
function calculateServerlessEstimate() {
  const scenario = scenarios[currentEnvironment];
  let ecpuMin, ecpuMax, hours;
  
  if (currentEnvironment === 'base') {
    ecpuMin = 1; ecpuMax = 5; hours = 8;
  } else if (currentEnvironment === 'medio') {
    ecpuMin = 5; ecpuMax = 15; hours = 16;
  } else {
    ecpuMin = 30; ecpuMax = 50; hours = 24;
  }
  
  const avgEcpu = (ecpuMin + ecpuMax) / 2;
  const hoursPerMonth = (hours / 24) * 730;
  const storage = scenario.valkeyStorageDefault;
  
  const storageCost = storage * pricing.valkey.serverless.storagePerGbHour * 730;
  const ecpuCost = avgEcpu * pricing.valkey.serverless.ecpuPerHour * hoursPerMonth;
  
  return storageCost + ecpuCost;
}

// Update recommendations
function updateRecommendations(costs) {
  const container = document.getElementById('recommendations');
  const isServerless = document.getElementById('valkey-serverless').checked;
  const rdsInstance = document.getElementById('rds-instance').value;
  const multiAz = document.getElementById('rds-multiaz').checked;
  
  const recommendations = [];
  
  // WebToQ specific recommendations
  if (currentEnvironment === 'webtoq') {
    if (isServerless) {
      const serverlessCost = costs.valkey;
      const clusterCost = pricing.valkey.cluster['cache.r7g.large'] * 2;
      recommendations.push({
        title: 'Usar Cluster para WebToQ',
        savings: 'Recomendado',
        description: `Para carga 24/7 sostenida con 1,000 agentes, Cluster Valkey es más eficiente que Serverless. Costo Cluster: $${clusterCost.toFixed(2)}/mes vs Serverless: $${serverlessCost.toFixed(2)}/mes. Mejor rendimiento y predicibilidad.`
      });
    }
    
    if (!multiAz) {
      recommendations.push({
        title: 'Implementar Multi-AZ en Mes 12',
        savings: 'Plan',
        description: `Para producción crítica con 1,000 agentes, implementar Multi-AZ proporciona alta disponibilidad. Costo adicional: $${(costs.rds).toFixed(2)}/mes. Planificar implementación gradual.`
      });
    }
    
    recommendations.push({
      title: 'Reserved Instances desde Mes 9',
      savings: '~$60/mes',
      description: `Al mes 9 con carga estable, comprar Reserved Instances de 1 año ahorra ~40% en RDS. Ahorro estimado: $60/mes, ROI en 6 meses.`
    });
  }
  
  // Valkey serverless recommendation
  if (!isServerless && currentEnvironment !== 'alto' && currentEnvironment !== 'webtoq') {
    const clusterCost = costs.valkey;
    const serverlessCost = calculateServerlessEstimate();
    const savings = ((clusterCost - serverlessCost) / clusterCost * 100).toFixed(0);
    
    if (savings > 0) {
      recommendations.push({
        title: 'Cambiar a Valkey Serverless',
        savings: `${savings}%`,
        description: `Para ambientes de desarrollo y staging, Valkey Serverless ofrece mejor costo-beneficio con escalado automático. Ahorro estimado: $${(clusterCost - serverlessCost).toFixed(2)}/mes`
      });
    }
  }
  
  // Reserved Instances recommendation
  if (currentEnvironment === 'alto' && rdsInstance !== 'db.t4g.medium') {
    recommendations.push({
      title: 'Reserved Instances RDS',
      savings: '40%',
      description: `Para producción con carga sostenida, Reserved Instances de 1 año pueden ahorrar hasta 40% ($${(costs.rds * 0.4).toFixed(2)}/mes). Compromiso de pago adelantado.`
    });
  }
  
  // Multi-AZ optimization
  if (currentEnvironment === 'base' && multiAz) {
    const savingsAmount = costs.rds * 0.5;
    recommendations.push({
      title: 'Desactivar Multi-AZ en Dev',
      savings: '50%',
      description: `En ambientes de desarrollo no es necesaria alta disponibilidad Multi-AZ. Ahorro: $${savingsAmount.toFixed(2)}/mes en RDS.`
    });
  }
  
  // Right-sizing recommendation
  if (rdsInstance === 'db.r6g.2xlarge' && currentEnvironment !== 'alto') {
    recommendations.push({
      title: 'Right-sizing RDS',
      savings: '30-50%',
      description: `La instancia ${rdsInstance} puede ser excesiva para ${scenarios[currentEnvironment].name}. Considere db.r6g.large o db.r6g.xlarge para optimizar costos.`
    });
  }
  
  // Default recommendation if none apply
  if (recommendations.length === 0) {
    recommendations.push({
      title: 'Configuración Optimizada',
      savings: '✓',
      description: 'Su configuración actual está bien optimizada para el nivel de uso seleccionado. Continúe monitoreando el uso real.'
    });
  }
  
  // Render recommendations
  let html = '';
  recommendations.forEach(rec => {
    html += `
      <div class="recommendation-card">
        <div class="recommendation-header">
          <div class="recommendation-title">${rec.title}</div>
          <div class="savings-tag">${rec.savings}</div>
        </div>
        <div class="recommendation-desc">${rec.description}</div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

// Export analysis
function exportAnalysis() {
  const scenario = scenarios[currentEnvironment];
  const costs = {};
  
  // Recalculate costs for export
  calculateCosts();
  
  // Get current costs from table
  const rows = document.querySelectorAll('#cost-table-body tr');
  let csv = 'Servicio,Configuración,Costo Mensual,Porcentaje\n';
  
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    const service = cells[0].textContent;
    const config = cells[1].textContent;
    const cost = cells[2].textContent;
    const pct = cells[3].textContent;
    csv += `"${service}","${config}","${cost}","${pct}"\n`;
  });
  
  const total = document.getElementById('total-monthly').textContent;
  const yearly = document.getElementById('total-yearly').textContent;
  csv += `\nTotal Mensual,,${total},100%\n`;
  csv += `Total Anual,,${yearly},\n`;
  csv += `\nAmbiente:,${scenario.name}\n`;
  csv += `Fecha:,${new Date().toLocaleDateString('es-ES')}\n`;
  
  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `webtoq-aws-costs-${currentEnvironment}-${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Make exportAnalysis globally accessible
window.exportAnalysis = exportAnalysis;

// Update Valkey comparison SVG
function updateValkeyComparisonSVG(costs) {
  const isServerless = document.getElementById('valkey-serverless').checked;
  
  let serverlessCost, clusterCost;
  if (isServerless) {
    serverlessCost = costs.valkey;
    clusterCost = pricing.valkey.cluster['cache.r7g.large'] * 2;
  } else {
    serverlessCost = calculateServerlessEstimate();
    clusterCost = costs.valkey;
  }
  
  const maxCost = Math.max(serverlessCost, clusterCost);
  const serverlessBarWidth = (serverlessCost / maxCost) * 240;
  const clusterBarWidth = (clusterCost / maxCost) * 240;
  
  const svg = document.getElementById('valkey-comparison-svg');
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--color-text').trim();
  const recommendedColor = '#208C7E';
  const alternativeColor = '#FFB627';
  
  svg.innerHTML = `
    <g transform="translate(0, 10)">
      <text x="0" y="0" fill="${textColor}" font-size="13" font-weight="500">Serverless ${isServerless ? '✓' : ''}</text>
      <rect x="0" y="6" width="${serverlessBarWidth}" height="24" fill="${isServerless ? recommendedColor : alternativeColor}" rx="4"/>
      <text x="${serverlessBarWidth + 8}" y="22" fill="${textColor}" font-size="13" font-family="monospace">$${serverlessCost.toFixed(2)}</text>
    </g>
    <g transform="translate(0, 60)">
      <text x="0" y="0" fill="${textColor}" font-size="13" font-weight="500">Cluster ${!isServerless ? '✓' : ''}</text>
      <rect x="0" y="6" width="${clusterBarWidth}" height="24" fill="${!isServerless ? recommendedColor : alternativeColor}" rx="4"/>
      <text x="${clusterBarWidth + 8}" y="22" fill="${textColor}" font-size="13" font-family="monospace">$${clusterCost.toFixed(2)}</text>
    </g>
  `;
}

// Update Valkey comparison table
function updateValkeyComparisonTable(costs) {
  const container = document.getElementById('valkey-comparison-table-container');
  const isServerless = document.getElementById('valkey-serverless').checked;
  
  let serverlessCost, clusterCost;
  if (isServerless) {
    serverlessCost = costs.valkey;
    clusterCost = pricing.valkey.cluster['cache.r7g.large'] * 2;
  } else {
    serverlessCost = calculateServerlessEstimate();
    clusterCost = costs.valkey;
  }
  
  const serverlessRecommended = serverlessCost < clusterCost;
  
  const html = `
    <table class="cost-table" style="font-size:var(--font-size-sm);">
      <thead>
        <tr>
          <th>Métrica</th>
          <th>Serverless</th>
          <th>Cluster Tradicional</th>
          <th>Recomendación</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background:${isServerless && serverlessRecommended ? 'var(--color-bg-3)' : 'transparent'};">
          <td><strong>Costo Mensual</strong></td>
          <td class="cost-value">$${serverlessCost.toFixed(2)}</td>
          <td class="cost-value">$${clusterCost.toFixed(2)}</td>
          <td style="color:var(--color-success);font-weight:var(--font-weight-semibold);">${serverlessRecommended ? 'Serverless ✓' : 'Cluster ✓'}</td>
        </tr>
        <tr>
          <td>Escalado</td>
          <td>Automático</td>
          <td>Manual</td>
          <td>${currentEnvironment !== 'alto' ? 'Dev/Staging' : 'Producción'}</td>
        </tr>
        <tr>
          <td>Disponibilidad</td>
          <td>Multi-AZ incluido</td>
          <td>Opcional (2x costo)</td>
          <td>-</td>
        </tr>
        <tr>
          <td>Mejor para</td>
          <td>Cargas variables</td>
          <td>Cargas predecibles</td>
          <td>Según req/mes</td>
        </tr>
      </tbody>
    </table>
  `;
  
  container.innerHTML = html;
}

// Update RDS comparison table
function updateRDSComparisonTable(costs) {
  const container = document.getElementById('rds-comparison-table-container');
  const rdsInstance = document.getElementById('rds-instance').value;
  const multiAz = document.getElementById('rds-multiaz').checked;
  
  const instances = ['db.t4g.medium', 'db.r6g.large', 'db.r6g.xlarge', 'db.r6g.2xlarge'];
  
  const html = `
    <div class="chart-title" style="margin-bottom:var(--space-12);">Comparación de Instancias RDS Aurora</div>
    <table class="cost-table" style="font-size:var(--font-size-sm);">
      <thead>
        <tr>
          <th>Instancia</th>
          <th>vCPU / RAM</th>
          <th>Costo Base</th>
          <th>Multi-AZ</th>
          <th>Recomendación</th>
        </tr>
      </thead>
      <tbody>
        ${instances.map(inst => {
          const instData = pricing.rds.instances[inst];
          const baseCost = instData.monthly;
          const multiAzCost = baseCost * 2;
          const isSelected = inst === rdsInstance;
          const isRecommended = (currentEnvironment === 'base' && inst === 'db.t4g.medium') || 
                                (currentEnvironment === 'medio' && inst === 'db.r6g.large') ||
                                (currentEnvironment === 'alto' && inst === 'db.r6g.xlarge');
          
          const vcpu = inst.includes('t4g') ? '2' : inst.includes('.2xlarge') ? '8' : inst.includes('.xlarge') ? '4' : '2';
          const ram = inst.includes('t4g') ? '4 GB' : inst.includes('.2xlarge') ? '64 GB' : inst.includes('.xlarge') ? '32 GB' : '16 GB';
          
          return `
            <tr style="background:${isSelected ? 'var(--color-bg-3)' : 'transparent'};">
              <td><strong>${inst}</strong> ${isSelected ? '✓' : ''}</td>
              <td>${vcpu} vCPU / ${ram}</td>
              <td class="cost-value">$${baseCost.toFixed(2)}</td>
              <td class="cost-value">$${multiAzCost.toFixed(2)}</td>
              <td style="color:${isRecommended ? 'var(--color-success)' : 'var(--color-text-secondary)'};font-weight:${isRecommended ? 'var(--font-weight-semibold)' : 'normal'};">
                ${isRecommended ? instData.tier + ' ✓' : instData.tier}
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
  
  container.innerHTML = html;
}

// Initialize t4g latency chart
function initT4gLatencyChart() {
  const canvas = document.getElementById('t4gLatencyChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--color-text').trim();
  const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--color-border').trim();
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM'],
      datasets: [
        {
          label: 't4g.medium (Burstable)',
          data: [5, 5, 15, 75, 350, 450],
          borderColor: '#E84D4D',
          backgroundColor: 'rgba(232, 77, 77, 0.1)',
          tension: 0.3,
          borderWidth: 3,
          pointRadius: 5,
          pointBackgroundColor: '#E84D4D'
        },
        {
          label: 'r6g.large (Standard)',
          data: [5, 5, 5, 5, 5, 5],
          borderColor: '#208C7E',
          backgroundColor: 'rgba(32, 140, 126, 0.1)',
          tension: 0.1,
          borderWidth: 3,
          pointRadius: 5,
          pointBackgroundColor: '#208C7E'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: textColor,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.dataset.label + ': ' + context.parsed.y + 'ms';
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 500,
          ticks: {
            color: textColor,
            callback: function(value) {
              return value + 'ms';
            }
          },
          grid: {
            color: gridColor
          },
          title: {
            display: true,
            text: 'Latencia (ms)',
            color: textColor
          }
        },
        x: {
          ticks: {
            color: textColor
          },
          grid: {
            color: gridColor
          },
          title: {
            display: true,
            text: 'Hora del Día',
            color: textColor
          }
        }
      }
    }
  });
}

// Update instance comparison chart highlight
function updateInstanceComparisonHighlight() {
  if (!instanceComparisonChart) return;
  
  const valkeySelector = document.getElementById('valkey-instance-selector');
  if (!valkeySelector) return;
  
  const selectedInstance = valkeySelector.value;
  const instances = ['cache.t4g.medium', 'cache.r7g.large', 'cache.r7g.xlarge', 'cache.r7g.2xlarge'];
  const selectedIndex = instances.indexOf(selectedInstance);
  
  // Update colors to highlight selected
  const colors = ['#FF6B6B', '#1FB8CD', '#FFC185', '#B4413C'];
  const borderColors = ['#E84D4D', '#208C7E', '#FFB627', '#A13838'];
  const highlightedColors = colors.map((color, index) => {
    if (index === selectedIndex) return color;
    return color + '80'; // Add transparency to non-selected
  });
  const highlightedBorders = borderColors.map((color, index) => {
    if (index === selectedIndex) return color;
    return color + '80';
  });
  
  instanceComparisonChart.data.datasets[0].backgroundColor = highlightedColors;
  instanceComparisonChart.data.datasets[0].borderColor = highlightedBorders;
  instanceComparisonChart.data.datasets[0].borderWidth = selectedIndex >= 0 ? 
    [1, 1, 1, 1].map((w, i) => i === selectedIndex ? 3 : 2) : [2, 2, 2, 2];
  
  try {
    instanceComparisonChart.update();
  } catch (error) {
    console.error('Error updating instance comparison chart:', error);
  }
}

// Initialize on load - wait for Chart.js
function initWhenReady() {
  if (typeof Chart === 'undefined') {
    console.log('Waiting for Chart.js to load...');
    setTimeout(initWhenReady, 100);
    return;
  }
  init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWhenReady);
} else {
  // DOMContentLoaded already fired
  initWhenReady();
}