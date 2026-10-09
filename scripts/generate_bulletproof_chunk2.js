const fs = require('fs');
const path = require('path');

const chunk2Path = path.resolve(process.cwd(), 'supabase/chunks/02_tables_and_types.sql');
const content = fs.readFileSync(chunk2Path, 'utf8');

const lines = content.split('\n');

let cleanedTableSql = [];
let foreignKeyStatements = [];

let currentTable = null;
let currentTableLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const tableMatch = line.match(/CREATE TABLE (?:IF NOT EXISTS )?\"?public\"?\.?\"?([a-zA-Z0-9_]+)\"?/i);

  if (tableMatch) {
    if (currentTable && currentTableLines.length > 0) {
      processTableBlock(currentTable, currentTableLines);
    }
    currentTable = tableMatch[1];
    currentTableLines = [line];
  } else if (currentTable) {
    currentTableLines.push(line);
    if (line.trim() === ');' || line.trim().startsWith(');')) {
      processTableBlock(currentTable, currentTableLines);
      currentTable = null;
      currentTableLines = [];
    }
  } else {
    if (line.startsWith('--') || line.trim() === '') {
      cleanedTableSql.push(line);
    }
  }
}

function processTableBlock(tableName, tableLines) {
  let filteredLines = [];
  
  for (let idx = 0; idx < tableLines.length; idx++) {
    const l = tableLines[idx];
    const isFK = l.includes('FOREIGN KEY') && l.includes('REFERENCES');

    if (isFK) {
      // Extract constraint name and FK definition
      // e.g. CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE RESTRICT,
      let cleanConstraint = l.trim();
      if (cleanConstraint.endsWith(',')) {
        cleanConstraint = cleanConstraint.slice(0, -1);
      }
      foreignKeyStatements.push({
        table: tableName,
        constraint: cleanConstraint
      });
      // Do not include FK inline in CREATE TABLE
    } else {
      filteredLines.push(l);
    }
  }

  // Clean trailing commas before closing paren ');'
  let bodyLines = [];
  for (let i = 0; i < filteredLines.length; i++) {
    let line = filteredLines[i];
    if (i < filteredLines.length - 1 && filteredLines[i + 1].trim().startsWith(');')) {
      if (line.trim().endsWith(',')) {
        line = line.replace(/,\s*$/, '');
      }
    }
    bodyLines.push(line);
  }

  cleanedTableSql.push(bodyLines.join('\n'));
}

// Generate the new bulletproof Chunk 02
let finalSql = `-- ====================================================================\n`;
finalSql += `-- CHUNK 02: CORE TABLE DEFINITIONS & FOREIGN KEY CONSTRAINTS\n`;
finalSql += `-- Step 2 of 9 — Run second in Supabase SQL Editor\n`;
finalSql += `-- (Tables created first, Foreign Keys added after all tables exist)\n`;
finalSql += `-- ====================================================================\n\n`;

finalSql += `-- SECTION A: CREATE ALL BASE TABLES\n`;
finalSql += cleanedTableSql.join('\n\n');

finalSql += `\n\n-- ====================================================================\n`;
finalSql += `-- SECTION B: ADD ALL FOREIGN KEY CONSTRAINTS\n`;
finalSql += `-- (Safe execution: All tables now exist in database)\n`;
finalSql += `-- ====================================================================\n\n`;

finalSql += `DO $$\nBEGIN\n`;

for (const fk of foreignKeyStatements) {
  const match = fk.constraint.match(/CONSTRAINT \"?([a-zA-Z0-9_]+)\"? (FOREIGN KEY .+)/i);
  if (match) {
    const cName = match[1];
    const fkDef = match[2];
    finalSql += `  IF NOT EXISTS (\n`;
    finalSql += `    SELECT 1 FROM information_schema.table_constraints\n`;
    finalSql += `    WHERE constraint_name = '${cName}' AND table_schema = 'public'\n`;
    finalSql += `  ) THEN\n`;
    finalSql += `    ALTER TABLE "public"."${fk.table}" ADD CONSTRAINT "${cName}" ${fkDef};\n`;
    finalSql += `  END IF;\n\n`;
  } else {
    finalSql += `  ALTER TABLE "public"."${fk.table}" ADD ${fk.constraint};\n`;
  }
}

finalSql += `END $$;\n`;

fs.writeFileSync(chunk2Path, finalSql, 'utf8');

console.log('SUCCESS: Generated bulletproof Chunk 02 with separated FK constraints!');
console.log(`Total Foreign Keys decoupled: ${foreignKeyStatements.length}`);
