const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();

// Find all API routes
const apiDir = path.join(rootDir, 'app', 'api');
function getApiRoutes(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      getApiRoutes(full, list);
    } else if (f.endsWith('.ts') || f.endsWith('.js')) {
      list.push(path.relative(rootDir, full).replace(/\\/g, '/'));
    }
  }
  return list;
}

const apiRoutes = getApiRoutes(apiDir);
console.log('--- API ROUTES (' + apiRoutes.length + ') ---');
apiRoutes.forEach(r => console.log(r));

// Check migrations
const migrationsDir = path.join(rootDir, 'supabase', 'migrations');
const migrations = fs.existsSync(migrationsDir) ? fs.readdirSync(migrationsDir) : [];
console.log('\n--- MIGRATIONS (' + migrations.length + ') ---');
console.log(migrations.slice(-10));
