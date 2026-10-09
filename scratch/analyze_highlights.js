const fs = require('fs');
const path = require('path');

const scan = JSON.parse(fs.readFileSync('scratch/audit_scan.json', 'utf8'));

console.log('--- ROUTER REFRESH CALLS (' + scan.routerRefreshFiles.length + ') ---');
scan.routerRefreshFiles.forEach(r => console.log(`${r.file}:${r.line} -> ${r.text}`));

console.log('\n--- POLLING / INTERVALS / REALTIME (' + scan.pollingFiles.length + ') ---');
scan.pollingFiles.slice(0, 30).forEach(r => console.log(`${r.file}:${r.line} -> ${r.text}`));

console.log('\n--- ZUSTAND STORES (' + scan.zustandStores.length + ') ---');
scan.zustandStores.forEach(s => console.log(s));

console.log('\n--- AG GRID FILES (' + scan.agGridFiles.length + ') ---');
scan.agGridFiles.forEach(g => console.log(g));

console.log('\n--- CHARTS FILES (' + scan.chartFiles.length + ') ---');
scan.chartFiles.forEach(c => console.log(c));
