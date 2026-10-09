const fs = require('fs');
const path = require('path');

const packages = ['lucide-react', '@phosphor-icons/react', 'framer-motion', 'motion', 'recharts', 'd3', 'jspdf', 'jspdf-autotable', 'docx', 'pdf-lib'];
const counts = {};
packages.forEach(p => counts[p] = { total: 0, client: 0, server: 0, files: [] });

function walk(dir) {
  for (const file of fs.readdirSync(dir)) {
    if (file === 'node_modules' || file === '.next' || file === '.git' || file === 'scratch') continue;
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      const content = fs.readFileSync(full, 'utf8');
      const isClient = content.includes("'use client'") || content.includes('"use client"');
      packages.forEach(p => {
        if (content.includes("from '" + p + "'") || content.includes('from "' + p + '"') || content.includes("require('" + p + "')")) {
          counts[p].total++;
          if (isClient) counts[p].client++;
          else counts[p].server++;
          counts[p].files.push(path.relative(process.cwd(), full).replace(/\\/g, '/'));
        }
      });
    }
  }
}
walk(process.cwd());
fs.writeFileSync(path.join(process.cwd(), 'scratch/dep_counts.json'), JSON.stringify(counts, null, 2));
console.log('Done scanning dependencies');
