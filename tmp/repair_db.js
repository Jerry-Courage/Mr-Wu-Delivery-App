const sqlite3 = require('better-sqlite3');
const db = new sqlite3('sqlite.db');

const schemaCols = [
  { name: 'payment_method', type: 'TEXT', default: "'card'" },
  { name: 'payment_status', type: 'TEXT', default: "'pending'" },
  { name: 'transaction_id', type: 'TEXT', default: 'NULL' },
  { name: 'rider_id', type: 'INTEGER', default: 'NULL' },
  { name: 'notes', type: 'TEXT', default: 'NULL' }
];

const currentCols = db.prepare('PRAGMA table_info(orders)').all().map(c => c.name);

schemaCols.forEach(col => {
  if (!currentCols.includes(col.name)) {
    try {
      let query = `ALTER TABLE orders ADD COLUMN ${col.name} ${col.type}`;
      if (col.default !== 'NULL') {
        query += ` DEFAULT ${col.default}`;
      }
      db.exec(query);
      console.log(`Added ${col.name}`);
    } catch (e) {
      console.error(`Error adding ${col.name}:`, e.message);
    }
  } else {
    console.log(`${col.name} already exists`);
  }
});

const finalCols = db.prepare('PRAGMA table_info(orders)').all().map(c => c.name);
console.log('Final columns:', finalCols.join(', '));
