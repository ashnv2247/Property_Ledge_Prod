const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();

function walkSync(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.next' || file === '.git') continue;
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkSync(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allFiles = walkSync(rootDir);

// 1. Routes
const routeFiles = allFiles.filter(f => {
  const rel = path.relative(rootDir, f).replace(/\\/g, '/');
  return rel.startsWith('app/') && /\/(page|route|layout|loading|error|not-found)\.(tsx|ts|jsx|js)$/.test(rel);
});

// 2. Client Components
const clientComponents = [];
const serverActions = [];
const zustandStores = [];
const agGridFiles = [];
const chartFiles = [];
const routerRefreshFiles = [];
const pollingFiles = [];
const supabaseQueryFiles = [];
const rlsOrSchemaFiles = [];

for (const f of allFiles) {
  if (!/\.(tsx|ts|js|jsx)$/.test(f)) continue;
  const rel = path.relative(rootDir, f).replace(/\\/g, '/');
  let content = '';
  try {
    content = fs.readFileSync(f, 'utf8');
  } catch (e) {
    continue;
  }

  // use client
  if (content.includes('"use client"') || content.includes("'use client'")) {
    clientComponents.push(rel);
  }

  // use server
  if (content.includes('"use server"') || content.includes("'use server'")) {
    serverActions.push(rel);
  }

  // zustand
  if (content.includes('from \'zustand\'') || content.includes('from "zustand"') || content.includes('create<')) {
    zustandStores.push(rel);
  }

  // ag-grid
  if (content.includes('ag-grid') || content.includes('AgGridReact')) {
    agGridFiles.push(rel);
  }

  // recharts / d3
  if (content.includes('recharts') || content.includes('d3')) {
    chartFiles.push(rel);
  }

  // router.refresh
  if (content.includes('router.refresh()')) {
    const lines = content.split('\n');
    lines.forEach((l, idx) => {
      if (l.includes('router.refresh()')) {
        routerRefreshFiles.push({ file: rel, line: idx + 1, text: l.trim() });
      }
    });
  }

  // polling / setInterval / subscriptions
  if (content.includes('setInterval') || content.includes('refetchInterval') || content.includes('.channel(') || content.includes('onPostgresChanges')) {
    const lines = content.split('\n');
    lines.forEach((l, idx) => {
      if (l.includes('setInterval') || l.includes('refetchInterval') || l.includes('.channel(') || l.includes('onPostgresChanges')) {
        pollingFiles.push({ file: rel, line: idx + 1, text: l.trim() });
      }
    });
  }

  // Supabase queries
  if (content.includes('.from(') || content.includes('.rpc(') || content.includes('auth.getUser(') || content.includes('auth.getSession(')) {
    supabaseQueryFiles.push(rel);
  }
}

const audit = {
  routes: routeFiles.map(f => path.relative(rootDir, f).replace(/\\/g, '/')),
  clientComponents,
  serverActions,
  zustandStores,
  agGridFiles,
  chartFiles,
  routerRefreshFiles,
  pollingFiles,
  supabaseQueryFilesCount: supabaseQueryFiles.length,
};

fs.writeFileSync(path.join(rootDir, 'scratch', 'audit_scan.json'), JSON.stringify(audit, null, 2));
console.log('Done scanning! Total routes:', audit.routes.length, 'Client components:', clientComponents.length, 'Server actions:', serverActions.length);
