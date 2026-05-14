// One-shot patcher: add IF NOT EXISTS / DROP IF EXISTS guards to
// CREATE INDEX, CREATE POLICY, ADD CONSTRAINT, CREATE TRIGGER across
// the duplicate-pattern migrations. Idempotent.
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const dir = 'D:/Half-Lens/h-lens-platform-bolt/supabase/migrations';
const all = readdirSync(dir).filter(f => f.endsWith('.sql'));

// Targets: the entire 20260314xxxxxx cluster + the duplicate add_expense_payments
const targets = all.filter(f =>
  /^20260314\d{6}_/.test(f) ||
  /^20260308000000_add_expense_payments/.test(f)
);

let totalEdits = 0;
for (const f of targets) {
  const path = join(dir, f);
  let src = readFileSync(path, 'utf8');
  const before = src;

  // CREATE INDEX foo ON ...   →  CREATE INDEX IF NOT EXISTS foo ON ...
  src = src.replace(/CREATE INDEX (?!IF NOT EXISTS)(\w+)\s+ON/g, 'CREATE INDEX IF NOT EXISTS $1 ON');

  // CREATE UNIQUE INDEX foo   →  CREATE UNIQUE INDEX IF NOT EXISTS foo
  src = src.replace(/CREATE UNIQUE INDEX (?!IF NOT EXISTS)(\w+)\s+ON/g, 'CREATE UNIQUE INDEX IF NOT EXISTS $1 ON');

  // CREATE POLICY "name" ON table   →  DROP POLICY IF EXISTS "name" ON table; CREATE POLICY "name" ON table
  // Skip lines that are already preceded by DROP POLICY IF EXISTS for the same name.
  src = src.replace(/(?<!IF EXISTS [^\n]*\n\s*)CREATE POLICY ("[^"]+"|\w+)\s+ON\s+([^\s]+)/g, (m, name, table) => {
    return `DROP POLICY IF EXISTS ${name} ON ${table};\nCREATE POLICY ${name} ON ${table}`;
  });

  // ALTER TABLE x ADD CONSTRAINT name  →  ALTER TABLE x DROP CONSTRAINT IF EXISTS name; ALTER TABLE x ADD CONSTRAINT name
  src = src.replace(/ALTER TABLE (\w+)\s+ADD CONSTRAINT (\w+)/g, (m, table, cname) => {
    return `ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${cname};\nALTER TABLE ${table} ADD CONSTRAINT ${cname}`;
  });

  // CREATE TRIGGER name ... ON table  →  DROP TRIGGER IF EXISTS name ON table; CREATE TRIGGER ...
  src = src.replace(/CREATE TRIGGER (\w+)\s+([\s\S]*?)\s+ON\s+(\w+(?:\.\w+)?)/g, (m, name, body, table) => {
    return `DROP TRIGGER IF EXISTS ${name} ON ${table};\nCREATE TRIGGER ${name} ${body} ON ${table}`;
  });

  if (src !== before) {
    writeFileSync(path, src, 'utf8');
    totalEdits++;
    console.log('Patched', f);
  } else {
    console.log('No changes', f);
  }
}

console.log(`\nTotal files patched: ${totalEdits} / ${targets.length}`);
