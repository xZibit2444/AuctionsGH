// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

const migrationsDir = path.join(__dirname, 'migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

let combined = fs.readFileSync(path.join(__dirname, 'cleanup.sql'), 'utf-8') + '\n\n';

for (const file of files) {
    combined += fs.readFileSync(path.join(migrationsDir, file), 'utf-8') + '\n\n';
}

fs.writeFileSync(path.join(__dirname, 'all_migrations_clean.sql'), combined);
console.log('Created all_migrations_clean.sql');
