const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Datenbank-Pfad
const dbPath = path.join(__dirname, '..', 'logistics.db');
const db = new Database(dbPath);

// Foreign Keys aktivieren
db.pragma('foreign_keys = ON');

// Migrations-Verzeichnis
const migrationsPath = path.join(__dirname, '..', 'migrations');

// Definiere die Migrations in der richtigen Reihenfolge
const migrations = [
  '01_schema.sql',
  '03_initial_data.sql',
  '04_hut_zones_1_2_3_only.sql',
  '05_hut_customer_postal_zones.sql',
  '06_boepple_complete_rates.sql'
];

// Erstelle Migrations-Tracking-Tabelle falls nicht vorhanden
db.exec(`
  CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL UNIQUE,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

// Funktion zum Ausführen einer Migration
function runMigration(filename) {
  const filePath = path.join(migrationsPath, filename);
  
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Migration file not found: ${filename}`);
    return false;
  }
  
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Beginne Transaktion
    db.exec('BEGIN TRANSACTION');
    
    try {
      // Führe die Migration aus
      db.exec(sql);
      
      // Markiere Migration als ausgeführt
      db.prepare('INSERT OR IGNORE INTO migrations (filename) VALUES (?)').run(filename);
      
      // Bestätige Transaktion
      db.exec('COMMIT');
      
      console.log(`✅ Migration executed: ${filename}`);
      return true;
    } catch (error) {
      // Rollback bei Fehler
      db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error(`❌ Error executing migration ${filename}:`, error.message);
    return false;
  }
}

// Funktion zum Prüfen, ob eine Migration bereits ausgeführt wurde
function isMigrationExecuted(filename) {
  const result = db.prepare('SELECT COUNT(*) as count FROM migrations WHERE filename = ?').get(filename);
  return result.count > 0;
}

// Führe alle ausstehenden Migrationen aus
function runPendingMigrations() {
  console.log('🔄 Checking for pending migrations...');
  
  let executed = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const migration of migrations) {
    if (isMigrationExecuted(migration)) {
      console.log(`⏭️  Skipping already executed migration: ${migration}`);
      skipped++;
    } else {
      if (runMigration(migration)) {
        executed++;
      } else {
        failed++;
        // Stoppe bei Fehler
        break;
      }
    }
  }
  
  console.log(`\n📊 Migration Summary:`);
  console.log(`   ✅ Executed: ${executed}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  if (failed > 0) {
    console.log(`   ❌ Failed: ${failed}`);
  }
  
  return failed === 0;
}

// Hilfsfunktion zum Zurücksetzen der Datenbank (nur für Entwicklung!)
function resetDatabase() {
  console.log('⚠️  Resetting database...');
  
  try {
    // Lösche alle Tabellen außer sqlite_sequence
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
    `).all();
    
    db.exec('PRAGMA foreign_keys = OFF');
    
    for (const table of tables) {
      db.exec(`DROP TABLE IF EXISTS ${table.name}`);
      console.log(`   Dropped table: ${table.name}`);
    }
    
    db.exec('PRAGMA foreign_keys = ON');
    
    console.log('✅ Database reset complete');
    return true;
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    return false;
  }
}

// Führe Migrationen beim Start aus
const migrationSuccess = runPendingMigrations();

if (!migrationSuccess) {
  console.error('❌ Migration failed! Please check the errors above.');
  process.exit(1);
}

console.log(`✅ Database connected: ${dbPath}`);

// Exportiere Datenbank und Hilfsfunktionen
module.exports = {
  db,
  runMigration,
  runPendingMigrations,
  resetDatabase,
  
  // Convenience-Methoden
  prepare: (...args) => db.prepare(...args),
  exec: (...args) => db.exec(...args),
  transaction: (fn) => db.transaction(fn),
  
  // Datenbank-Info
  getInfo: () => ({
    path: dbPath,
    tables: db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all(),
    migrations: db.prepare('SELECT * FROM migrations ORDER BY executed_at').all()
  })
};