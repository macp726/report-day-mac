// AWS Pricing (us-east-1, November 2025)
const pricing = {
  rds: {
    'db.t4g.medium': { monthly: 53.29, vcpu: 2, memory: 4, tier: 'Dev/Small' },
    'db.r6g.large': { monthly: 201.48, vcpu: 2, memory: 16, tier: 'Production' },
    'db.r6g.xlarge': { monthly: 402.96, vcpu: 4, memory: 32, tier: 'Large' },
    'db.r6g.2xlarge': { monthly: 805.92, vcpu: 8, memory: 64, tier: 'Enterprise' },
    storage: 0.10, // per GB/month
    multiAzMultiplier: 2
  },
  valkey: {
    'cache.t4g.medium': { monthly: 37.96, memory: 3.09, tier: 'Dev' },
    'cache.r7g.large': { monthly: 146, memory: 13.07, tier: 'Production' },
    'cache.r7g.xlarge': { monthly: 292, memory: 26.32, tier: 'Large' },
    'cache.r7g.2xlarge': { monthly: 584, memory: 52.82, tier: 'Enterprise' },
    serverless: {
      storagePerGbHour: 0.084,
      ecpuPerHour: 0.14
    }
  },
  lambda: {
    perRequest: 0.20 / 1000000,
    gbSecond: 0.0000166667,
    avgMemoryMb: 512,
    avgDurationMs: 400
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
  },
  ses: {
    first62000: 0, // Free tier
    perThousand: 0.10 // $0.10 per 1,000 emails after free tier
  },
  s3: {
    storagePerGb: 0.023, // Standard storage
    putRequests: 0.005 / 1000, // PUT/COPY/POST/LIST per 1,000 requests
    getRequests: 0.0004 / 1000 // GET/SELECT per 1,000 requests
  },
  sns: {
    first1Million: 0, // Free tier
    perMillion: 0.50 // $0.50 per million after free tier
  }
};

// Calculate infrastructure requirements
function calculate() {
  const agentCount = parseInt(document.getElementById('agent-count').value);
  const clientsPerAgent = parseInt(document.getElementById('clients-per-agent').value);
  const workDays = parseInt(document.getElementById('work-days').value);
  const sessionDuration = parseInt(document.getElementById('session-duration').value);
  
  // Update displays
  document.getElementById('agent-display').textContent = agentCount.toLocaleString();
  document.getElementById('clients-display').textContent = clientsPerAgent.toLocaleString();
  document.getElementById('days-display').textContent = workDays.toLocaleString();
  document.getElementById('duration-display').textContent = sessionDuration.toLocaleString();
  
  // Calculate load metrics
  const sessionsPerMonth = agentCount * clientsPerAgent * workDays;
  const sessionsPerDay = Math.round(sessionsPerMonth / workDays);
  
  // Estimate requests per session (auth, messages, sync, heartbeats, logout)
  const requestsPerSession = Math.max(20, Math.round(sessionDuration / 2)); // ~2 requests per minute
  const requestsPerMonth = sessionsPerMonth * requestsPerSession;
  
  // Concurrent connections (assume 20% of agents online simultaneously at peak)
  const concurrentPeak = Math.round(agentCount * 0.35);
  
  // Valkey storage (session data + cache)
  // ~40KB per active session + 20KB cache per agent
  const valkeyStorageMB = Math.round((concurrentPeak * 0.04) + (agentCount * 0.02));
  const valkeyStorageGB = valkeyStorageMB / 1024;
  
  // Update load metrics
  document.getElementById('sessions-month').textContent = sessionsPerMonth.toLocaleString();
  document.getElementById('sessions-day').textContent = `~${sessionsPerDay.toLocaleString()}/día`;
  document.getElementById('requests-month').textContent = formatNumber(requestsPerMonth);
  document.getElementById('concurrent-connections').textContent = concurrentPeak.toLocaleString();
  document.getElementById('valkey-storage').textContent = `${valkeyStorageMB} MB`;
  
  // Determine infrastructure tier
  const tier = determineInfrastructureTier(agentCount, requestsPerMonth, concurrentPeak);
  
  console.log('=== Infrastructure Calculator ===');
  console.log('Agents:', agentCount);
  console.log('Tier:', tier);
  console.log('Requests/month:', requestsPerMonth);
  
  // Calculate costs
  const costs = calculateCosts(tier, requestsPerMonth, valkeyStorageGB, sessionsPerMonth, agentCount);
  
  // Display infrastructure table
  displayInfrastructure(tier, costs);
  
  // Display cost analysis
  displayCostAnalysis(costs, agentCount, sessionsPerMonth);
  
  // Display recommendations
  displayRecommendations(agentCount, tier, costs);
}

function determineInfrastructureTier(agents, requests, concurrent) {
  // Priorizar número de agentes sobre requests para determinar tier
  if (agents <= 20) {
    return 'micro';
  } else if (agents <= 100) {
    return 'starter';
  } else if (agents <= 500) {
    return 'small';
  } else if (agents <= 2000) {
    return 'medium';
  } else if (agents <= 5000) {
    return 'large';
  } else {
    return 'enterprise';
  }
}

function calculateCosts(tier, requests, valkeyStorageGB, sessions, agents) {
  const costs = {};
  
  // Lambda
  const lambdaGbSeconds = (requests * (pricing.lambda.avgMemoryMb / 1024) * (pricing.lambda.avgDurationMs / 1000));
  costs.lambda = (requests * pricing.lambda.perRequest) + (lambdaGbSeconds * pricing.lambda.gbSecond);
  
  // API Gateway (1 REST, 7 HTTP, 2 WebSocket per request)
  costs.apiGateway = (requests * pricing.apiGateway.rest) + 
                     (requests * 7 * pricing.apiGateway.http) + 
                     (requests * 2 * pricing.apiGateway.websocket);
  
  // RDS Aurora
  let rdsConfig = {};
  let rdsStorageGB = 50;
  switch(tier) {
    case 'micro':
      rdsConfig = { instance: 'db.t4g.medium', multiAz: false };
      rdsStorageGB = 30;
      break;
    case 'starter':
      rdsConfig = { instance: 'db.t4g.medium', multiAz: false };
      rdsStorageGB = 50;
      break;
    case 'small':
      rdsConfig = { instance: 'db.r6g.large', multiAz: false };
      rdsStorageGB = 100;
      break;
    case 'medium':
      rdsConfig = { instance: 'db.r6g.large', multiAz: true };
      rdsStorageGB = 150;
      break;
    case 'large':
      rdsConfig = { instance: 'db.r6g.xlarge', multiAz: true };
      rdsStorageGB = 250;
      break;
    case 'enterprise':
      rdsConfig = { instance: 'db.r6g.2xlarge', multiAz: true };
      rdsStorageGB = 500;
      break;
  }
  costs.rds = pricing.rds[rdsConfig.instance].monthly;
  if (rdsConfig.multiAz) costs.rds *= pricing.rds.multiAzMultiplier;
  costs.rds += rdsStorageGB * pricing.rds.storage;
  costs.rdsConfig = rdsConfig;
  costs.rdsStorage = rdsStorageGB;
  
  // Valkey
  let valkeyConfig = {};
  
  if (tier === 'micro') {
    // 5-20 agentes: Serverless $20-80/mes
    const ecpuMin = 0.5;
    const ecpuMax = 2;
    const avgEcpuUsage = 0.0001; // Muy bajo
    
    costs.valkey = (valkeyStorageGB * pricing.valkey.serverless.storagePerGbHour * 730) +
                   (avgEcpuUsage * 500000); // ~$20-40/mes
    valkeyConfig = { type: 'Serverless', ecpu: `${ecpuMin}-${ecpuMax}`, range: '5-20 agentes' };
  } else if (tier === 'starter') {
    // 20-100 agentes: Serverless $80-400/mes
    const ecpuMin = 1;
    const ecpuMax = 5;
    const avgEcpuUsage = 0.001; // Moderado
    
    costs.valkey = (valkeyStorageGB * pricing.valkey.serverless.storagePerGbHour * 730) +
                   (avgEcpuUsage * 2000000); // ~$80-200/mes
    valkeyConfig = { type: 'Serverless', ecpu: `${ecpuMin}-${ecpuMax}`, range: '20-100 agentes' };
  } else if (tier === 'small') {
    // 100-500 agentes: OPCIÓN 1 cache.r7g.large es más económico
    costs.valkey = pricing.valkey['cache.r7g.large'].monthly;
    valkeyConfig = { type: 'Cluster', instance: 'cache.r7g.large', multiAz: false, range: '100-500 agentes', note: 'Más económico que Serverless' };
  } else {
    // Cluster para tier medium, large, enterprise
    let instance = '';
    let multiAz = false;
    switch(tier) {
      case 'medium':
        instance = 'cache.r7g.large';
        multiAz = true;
        break;
      case 'large':
        instance = 'cache.r7g.xlarge';
        multiAz = true;
        break;
      case 'enterprise':
        instance = 'cache.r7g.2xlarge';
        multiAz = true;
        break;
    }
    costs.valkey = pricing.valkey[instance].monthly;
    if (multiAz) costs.valkey *= 2;
    valkeyConfig = { type: 'Cluster', instance, multiAz, range: tier === 'medium' ? '500-2000' : tier === 'large' ? '2000-5000' : '5000+' };
  }
  costs.valkeyConfig = valkeyConfig;
  
  // VPC
  costs.vpc = pricing.vpc.natGateway;
  
  // CloudWatch
  costs.cloudwatch = Math.max(5, requests / 100000 * 0.5);
  
  // SES (Email notifications)
  // Assume 2 emails per session (start/end notifications)
  const emailsPerMonth = sessions * 2;
  const chargeableEmails = Math.max(0, emailsPerMonth - 62000);
  costs.ses = (chargeableEmails / 1000) * pricing.ses.perThousand;
  costs.sesEmails = emailsPerMonth;
  
  // S3 (File storage - chat logs, attachments)
  // Assume 500KB avg per session for chat logs
  const storageGB = (sessions * 0.0005);
  const putRequests = sessions * 5; // 5 PUT operations per session
  const getRequests = sessions * 2; // 2 GET operations per session
  costs.s3 = (storageGB * pricing.s3.storagePerGb) +
             (putRequests / 1000 * pricing.s3.putRequests) +
             (getRequests / 1000 * pricing.s3.getRequests);
  costs.s3Storage = storageGB;
  
  // SNS (Push notifications)
  // Assume 5 SNS messages per session
  const snsMessages = sessions * 5;
  const chargeableSns = Math.max(0, snsMessages - 1000000);
  costs.sns = (chargeableSns / 1000000) * pricing.sns.perMillion;
  costs.snsMessages = snsMessages;
  
  // Total
  costs.total = costs.lambda + costs.apiGateway + costs.rds + costs.valkey + 
                costs.vpc + costs.cloudwatch + costs.ses + costs.s3 + costs.sns;
  
  return costs;
}

function displayInfrastructure(tier, costs) {
  const tbody = document.getElementById('infrastructure-table');
  
  console.log('=== Display Infrastructure ===');
  console.log('Tier:', tier);
  console.log('RDS Config:', costs.rdsConfig);
  console.log('Valkey Config:', costs.valkeyConfig);
  
  // Añadir badge de tier
  const tierBadges = {
    'micro': '<span class="badge badge-success">Micro (5-20 agentes)</span>',
    'starter': '<span class="badge badge-success">Starter (20-100 agentes)</span>',
    'small': '<span class="badge badge-success">Small (100-500 agentes)</span>',
    'medium': '<span class="badge badge-warning">Medium (500-2000 agentes)</span>',
    'large': '<span class="badge badge-error">Large (2000-5000 agentes)</span>',
    'enterprise': '<span class="badge badge-error">Enterprise (5000+ agentes)</span>'
  };
  
  const tierBadge = tierBadges[tier] || '';
  
  const services = [
    {
      name: '⚡ AWS Lambda',
      config: `51 funciones, ${pricing.lambda.avgMemoryMb}MB promedio`,
      cost: costs.lambda,
      justification: 'Serverless compute para API endpoints'
    },
    {
      name: '🔌 API Gateway',
      config: '1 REST + 7 HTTP + 2 WebSocket APIs',
      cost: costs.apiGateway,
      justification: 'Gateway para todas las APIs y WebSockets'
    },
    {
      name: '🗄️ RDS Aurora PostgreSQL',
      config: `${costs.rdsConfig.instance}${costs.rdsConfig.multiAz ? ' Multi-AZ' : ''} + ${costs.rdsStorage}GB storage`,
      cost: costs.rds,
      justification: costs.rdsConfig.multiAz ? 'Alta disponibilidad requerida' : 'Base de datos relacional principal',
      tier: tierBadge
    },
    {
      name: '⚙️ ElastiCache Valkey',
      config: costs.valkeyConfig.type === 'Serverless' ? 
        `Serverless ${costs.valkeyConfig.ecpu} ECPUs (24/7 sin throttling)` :
        `${costs.valkeyConfig.instance}${costs.valkeyConfig.multiAz ? ' Multi-AZ' : ''}`,
      cost: costs.valkey,
      justification: costs.valkeyConfig.type === 'Serverless' ? 
        '24/7 disponibilidad, escalado automático' : 
        'Cache de alta performance para producción',
      tier: costs.valkeyConfig.range ? `<span class="badge" style="background:var(--color-primary);color:var(--color-bg);">${costs.valkeyConfig.range}</span>` : ''
    },
    {
      name: '🌐 VPC NAT Gateway',
      config: '1 NAT Gateway',
      cost: costs.vpc,
      justification: 'Conectividad privada segura'
    },
    {
      name: '📊 CloudWatch Logs',
      config: 'Logs + métricas + alertas',
      cost: costs.cloudwatch,
      justification: 'Monitoring y observabilidad'
    },
    {
      name: '📧 Amazon SES',
      config: `${formatNumber(costs.sesEmails)} emails/mes`,
      cost: costs.ses,
      justification: 'Notificaciones por email (primeros 62K gratis)'
    },
    {
      name: '💾 Amazon S3',
      config: `${costs.s3Storage.toFixed(2)}GB storage + requests`,
      cost: costs.s3,
      justification: 'Chat logs, attachments, backups'
    },
    {
      name: '🔔 Amazon SNS',
      config: `${formatNumber(costs.snsMessages)} mensajes/mes`,
      cost: costs.sns,
      justification: 'Push notifications (primer 1M gratis)'
    }
  ];
  
  let html = '';
  services.forEach(service => {
    html += `
      <tr>
        <td>
          <strong>${service.name}</strong>
          ${service.tier ? '<br>' + service.tier : ''}
        </td>
        <td>${service.config}</td>
        <td style="font-weight:600;font-family:var(--font-family-mono);">$${service.cost.toFixed(2)}</td>
        <td style="font-size:var(--font-size-xs);color:var(--color-text-secondary);">${service.justification}</td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
  document.getElementById('total-cost').textContent = `$${costs.total.toFixed(2)}`;
  document.getElementById('total-yearly').textContent = `$${(costs.total * 12).toFixed(2)}/año`;
}

function displayCostAnalysis(costs, agents, sessions) {
  const costPerAgent = costs.total / agents;
  const costPerSession = costs.total / sessions;
  
  document.getElementById('cost-per-agent').textContent = `$${costPerAgent.toFixed(2)}`;
  document.getElementById('cost-per-session').textContent = `$${costPerSession.toFixed(4)}`;
  
  const revenuePerAgent = 5;
  const revenue = agents * revenuePerAgent;
  const profit = revenue - costs.total;
  const marginPct = ((profit / revenue) * 100).toFixed(0);
  
  document.getElementById('margin-percentage').textContent = `${marginPct}%`;
  document.getElementById('margin-amount').textContent = `$${profit.toFixed(2)}/mes ganancia`;
  
  const marginElement = document.getElementById('margin-percentage');
  if (marginPct >= 85) {
    marginElement.style.color = 'var(--color-success)';
  } else if (marginPct >= 70) {
    marginElement.style.color = 'var(--color-warning)';
  } else {
    marginElement.style.color = 'var(--color-error)';
  }
  
  // Insights
  let insightsHTML = '<div class="recommendation-card" style="background:var(--color-bg-1);">';
  insightsHTML += '<div class="recommendation-title">💡 Análisis de Rentabilidad</div>';
  insightsHTML += '<ul style="margin:0;padding-left:var(--space-24);line-height:1.8;color:var(--color-text);">';
  
  if (marginPct >= 85) {
    insightsHTML += `<li><strong style="color:var(--color-success);">✅ Excelente margen (${marginPct}%)</strong> - Muy rentable con estos costos de infraestructura.</li>`;
  } else if (marginPct >= 70) {
    insightsHTML += `<li><strong style="color:var(--color-warning);">⚠️ Margen aceptable (${marginPct}%)</strong> - Considera optimizar costos o ajustar pricing.</li>`;
  } else {
    insightsHTML += `<li><strong style="color:var(--color-error);">❌ Margen bajo (${marginPct}%)</strong> - Debes aumentar precio o reducir costos significativamente.</li>`;
  }
  
  insightsHTML += `<li>Con <strong>${agents.toLocaleString()} agentes</strong> y precio de <strong>$${revenuePerAgent}/agente</strong>, generas <strong>$${revenue.toLocaleString()}/mes</strong> de revenue.</li>`;
  insightsHTML += `<li>El costo de infraestructura es <strong>$${costs.total.toFixed(2)}/mes</strong> (${(100 - marginPct)}% del revenue).</li>`;
  insightsHTML += `<li>Cada sesión cliente cuesta <strong>${(costPerSession * 100).toFixed(2)}¢</strong> de infraestructura.</li>`;
  
  // Cost breakdown
  const topCosts = [
    { name: 'RDS', value: costs.rds },
    { name: 'Valkey', value: costs.valkey },
    { name: 'Lambda', value: costs.lambda },
    { name: 'API Gateway', value: costs.apiGateway }
  ].sort((a, b) => b.value - a.value);
  
  insightsHTML += `<li>Mayor costo: <strong>${topCosts[0].name}</strong> ($${topCosts[0].value.toFixed(2)}/mes - ${((topCosts[0].value / costs.total) * 100).toFixed(0)}%).</li>`;
  insightsHTML += '</ul></div>';
  
  document.getElementById('cost-insights').innerHTML = insightsHTML;
}

function displayRecommendations(agents, tier, costs) {
  const container = document.getElementById('recommendations-container');
  let html = '<div class="config-panel"><h2 class="panel-title">🎯 Recomendaciones Personalizadas</h2>';
  
  // Tier-specific recommendations
  if (tier === 'micro') {
    html += `
      <div class="recommendation-card">
        <div class="recommendation-title">🌱 Ambiente Micro (${agents} agentes)<span class="badge badge-success">Desarrollo/Piloto</span></div>
        <p style="color:var(--color-text);line-height:1.8;margin:0;">
          Con ${agents.toLocaleString()} agentes, estás en fase de desarrollo/piloto:<br><br>
          <strong>✅ Valkey SERVERLESS ($20-80/mes)</strong> - Perfecto para esta escala, 24/7 sin throttling.<br>
          <strong>✅ db.t4g.medium</strong> - RDS suficiente para pruebas iniciales.<br>
          <strong>💡 Ventaja:</strong> Pay-per-use con Serverless, solo pagas por lo que usas.<br>
          <strong>⚡ Performance:</strong> 1-5ms latencia constante, cold starts <100ms.<br>
          <strong>📈 Siguiente paso:</strong> Al llegar a 20+ agentes, Serverless escala automáticamente.
        </p>
      </div>
    `;
  } else if (tier === 'starter') {
    html += `
      <div class="recommendation-card">
        <div class="recommendation-title">🚀 Ambiente Starter (${agents} agentes)<span class="badge badge-success">Pre-Producción</span></div>
        <p style="color:var(--color-text);line-height:1.8;margin:0;">
          Con ${agents.toLocaleString()} agentes, estás listo para pre-producción:<br><br>
          <strong>✅ Valkey SERVERLESS ($80-400/mes)</strong> - Escala automático según carga real.<br>
          <strong>⚠️ NO uses t4g.medium:</strong> Se queda sin CPU credits en 4-5 horas → Downtime diario.<br>
          <strong>✅ db.t4g.medium</strong> - Suficiente para RDS, actualiza a r6g.large al llegar a 100+.<br>
          <strong>💡 Clave:</strong> Serverless garantiza 1-5ms latencia constante vs 200-500ms throttled en t4g.<br>
          <strong>💰 ROI:</strong> Serverless ~$150/mes vs t4g $7,288/mes (con downtime loss).<br>
          <strong>📈 Siguiente paso:</strong> Al llegar a 100+ agentes, migra a cache.r7g.large ($146/mes fijo).
        </p>
      </div>
    `;
  } else if (tier === 'small') {
    html += `
      <div class="recommendation-card">
        <div class="recommendation-title">📊 Ambiente Small (${agents} agentes)<span class="badge badge-success">Producción Estándar</span></div>
        <p style="color:var(--color-text);line-height:1.8;margin:0;">
          Con ${agents.toLocaleString()} agentes, estás en producción sólida:<br><br>
          <strong>✅ cache.r7g.large ($146/mes)</strong> - MEJOR opción que Serverless ($400-1000/mes).<br>
          <strong>✅ db.r6g.large</strong> - Potencia necesaria para este volumen.<br>
          <strong>💰 Ahorro:</strong> Cluster r7g.large es 3-7x más barato que Serverless para carga constante.<br>
          <strong>💡 Alternativa:</strong> Si tu carga es muy intermitente (<8h/día), considera Serverless.<br>
          <strong>🔒 Considera Multi-AZ:</strong> Al acercarte a 500 agentes para alta disponibilidad.<br>
          <strong>📈 Siguiente paso:</strong> A 500+ agentes, migra a r7g.xlarge + Multi-AZ.
        </p>
      </div>
    `;
  } else if (tier === 'medium') {
    html += `
      <div class="recommendation-card">
        <div class="recommendation-title">🎯 Ambiente Medium (${agents} agentes)<span class="badge badge-warning">Alta Demanda</span></div>
        <p style="color:var(--color-text);line-height:1.8;margin:0;">
          Con ${agents.toLocaleString()} agentes, necesitas infraestructura robusta:<br><br>
          <strong>✅ cache.r7g.large Multi-AZ ($292/mes)</strong> - Alta disponibilidad crítica.<br>
          <strong>✅ db.r6g.large Multi-AZ</strong> - Redundancia esencial para producción.<br>
          <strong>💰 Reserved Instances RECOMENDADO:</strong> Ahorra 30-40% ($100-150/mes).<br>
          <strong>📊 Monitorea:</strong> CloudWatch dashboards para detectar cuellos de botella.<br>
          <strong>🔐 Seguridad:</strong> Implementa AWS WAF en API Gateway.<br>
          <strong>📈 Siguiente paso:</strong> A 2000+ agentes, migra a r7g.xlarge.
        </p>
      </div>
    `;
  } else if (tier === 'large') {
    html += `
      <div class="recommendation-card">
        <div class="recommendation-title">🔥 Ambiente Large (${agents} agentes)<span class="badge badge-error">Enterprise</span></div>
        <p style="color:var(--color-text);line-height:1.8;margin:0;">
          Con ${agents.toLocaleString()} agentes, necesitas infraestructura enterprise:<br><br>
          <strong>✅ cache.r7g.xlarge Multi-AZ ($584/mes)</strong> - Capacidad enterprise.<br>
          <strong>✅ db.r6g.xlarge Multi-AZ</strong> - Potencia necesaria para este volumen.<br>
          <strong>💰 Reserved Instances OBLIGATORIO:</strong> Ahorra $250-500/mes.<br>
          <strong>📊 Auto-scaling:</strong> Configura Lambda concurrency limits y DB read replicas.<br>
          <strong>🔍 APM:</strong> Implementa AWS X-Ray para tracing distribuido.<br>
          <strong>💾 Backups:</strong> Daily snapshots automáticos de RDS y S3.
        </p>
      </div>
    `;
  } else {
    html += `
      <div class="recommendation-card">
        <div class="recommendation-title">🏢 Ambiente Enterprise (${agents} agentes)<span class="badge badge-error">Escala Masiva</span></div>
        <p style="color:var(--color-text);line-height:1.8;margin:0;">
          Con ${agents.toLocaleString()} agentes, estás en escala enterprise:<br><br>
          <strong>✅ db.r6g.2xlarge Multi-AZ</strong> - Máxima capacidad.<br>
          <strong>✅ Valkey r7g.xlarge Multi-AZ</strong> - Cache enterprise-grade.<br>
          <strong>💰 CRÍTICO: Reserved Instances + Savings Plans</strong> - Ahorra $500-1000/mes.<br>
          <strong>🌍 Multi-Region:</strong> Considera despliegue en múltiples regiones.<br>
          <strong>📊 Dedicated Support:</strong> Contacta AWS Enterprise Support.<br>
          <strong>🔐 Compliance:</strong> SOC2, HIPAA según tu industria.<br>
          <strong>⚡ CDN:</strong> Implementa CloudFront para assets estáticos.
        </p>
      </div>
    `;
  }
  
  // Cost optimization tips
  html += `
    <div class="recommendation-card" style="background:var(--color-bg-3);">
      <div class="recommendation-title">💰 Oportunidades de Optimización</div>
      <ul style="margin:0;padding-left:var(--space-24);line-height:1.8;color:var(--color-text);">
        ${costs.rds > 200 ? '<li><strong>RDS:</strong> Considera Reserved Instances para ahorrar 30-40%.</li>' : ''}
        ${costs.ses > 5 ? '<li><strong>SES:</strong> Implementa batch sending para reducir costos de email.</li>' : ''}
        ${costs.s3Storage > 50 ? '<li><strong>S3:</strong> Usa Intelligent-Tiering para archivos antiguos (ahorro 40-70%).</li>' : ''}
        ${costs.cloudwatch > 20 ? '<li><strong>CloudWatch:</strong> Ajusta retención de logs a 7-14 días (default: 30).</li>' : ''}
        ${costs.lambda > 50 ? '<li><strong>Lambda:</strong> Optimiza tamaño de memoria y duración para reducir costos.</li>' : ''}
        <li><strong>Valkey:</strong> Implementa TTL agresivo para mantener solo datos activos.</li>
        <li><strong>General:</strong> Usa AWS Cost Explorer para identificar gastos inesperados.</li>
      </ul>
    </div>
  `;
  
  // Scaling projection
  const futureAgents = Math.round(agents * 2);
  const futureCosts = calculateCosts(
    determineInfrastructureTier(futureAgents, costs.total * 2, futureAgents * 0.35),
    (costs.total / agents) * futureAgents * 22, // rough estimate
    0.1,
    (costs.total / agents) * futureAgents * 88,
    futureAgents
  );
  
  html += `
    <div class="recommendation-card" style="background:var(--color-bg-2);">
      <div class="recommendation-title">📈 Proyección de Escalamiento</div>
      <p style="color:var(--color-text);line-height:1.8;margin:0;">
        Si <strong>duplicas</strong> tu operación a <strong>${futureAgents.toLocaleString()} agentes</strong>:<br><br>
        <strong>Costo proyectado:</strong> $${futureCosts.total.toFixed(2)}/mes (incremento de $${(futureCosts.total - costs.total).toFixed(2)})<br>
        <strong>Costo por agente:</strong> $${(futureCosts.total / futureAgents).toFixed(2)} (vs actual $${(costs.total / agents).toFixed(2)})<br>
        <strong>💡 Economía de escala:</strong> ${((costs.total / agents) > (futureCosts.total / futureAgents)) ? 
          '✅ El costo por agente BAJA al escalar' : 
          '⚠️ Considera optimizaciones antes de escalar'
        }
      </p>
    </div>
    
    <div class="recommendation-card" style="background:var(--color-bg-1);">
      <div class="recommendation-title">📈 Guía de Escalamiento por Agentes</div>
      <div style="font-family:var(--font-family-mono);font-size:var(--font-size-sm);line-height:2;color:var(--color-text);">
        <strong>5-20 agentes</strong> → ElastiCache Serverless ($20-80/mes) ✅<br>
        <strong>20-100 agentes</strong> → ElastiCache Serverless ($80-400/mes) ✅<br>
        <strong>100-500 agentes</strong> → cache.r7g.large ($146/mes) ✅<br>
        <strong>500-2000 agentes</strong> → cache.r7g.xlarge Multi-AZ ($584/mes) ✅<br>
        <strong>2000+ agentes</strong> → cache.r7g.2xlarge + Reserved Instances 📈
      </div>
    </div>
  `;
  
  html += '</div>';
  container.innerHTML = html;
}

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
}

// Initialize on load
window.addEventListener('DOMContentLoaded', calculate);
