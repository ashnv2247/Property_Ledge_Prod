const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        results = results.concat(walk(full));
      }
    } else {
      results.push(full);
    }
  });
  return results;
}

const appFiles = walk(path.join(rootDir, 'app')).map(f => f.replace(/\\/g, '/'));
const pagesAndRoutes = appFiles.filter(f => /\/(page|route)\.(tsx|ts|js|jsx)$/.test(f));

const routes = [];

for (const f of pagesAndRoutes) {
  const rel = f.substring(f.indexOf('/app/') + 5);
  const content = fs.readFileSync(f, 'utf8');
  const isClient = content.includes('"use client"') || content.includes("'use client'");
  const isApi = rel.startsWith('api/') || rel.includes('/route.');
  
  // Clean up route path
  let routePath = '/' + rel.replace(/\/(page|route)\.(tsx|ts|js|jsx)$/, '');
  routePath = routePath.replace(/\/\([^)]+\)/g, ''); // remove route groups like (app)
  if (routePath === '/.') routePath = '/';
  if (routePath === '') routePath = '/';

  // Find data sources in page
  const hasSupabase = content.includes('supabase') || content.includes('createClient');
  const hasServerAction = content.includes('@/app/actions') || content.includes('fetch');
  const hasSql = content.includes('from(') || content.includes('rpc(');

  routes.push({
    file: 'app/' + rel,
    path: routePath,
    type: isApi ? 'API Route' : (routePath.startsWith('/admin') ? 'Admin Page' : routePath.startsWith('/onboarding') ? 'Onboarding' : routePath.startsWith('/dashboard') ? 'Dashboard' : 'Public/Auth'),
    isClient: isClient ? 'Client' : 'Server',
    dataSources: [
      hasSupabase ? 'Supabase' : null,
      hasServerAction ? 'Server Action / API' : null,
      hasSql ? 'Direct DB Query' : null
    ].filter(Boolean).join(', ') || 'Static / Client props',
  });
}

// Sort alphabetically by path
routes.sort((a, b) => a.path.localeCompare(b.path));

fs.writeFileSync('scratch/route_inventory.json', JSON.stringify(routes, null, 2));
console.log('Total identified routes:', routes.length);
console.log('Sample routes (first 10):', routes.slice(0, 10));
