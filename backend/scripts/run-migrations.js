// backend/scripts/run-migrations.js

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs').promises;
const path = require('path');

async function runMigrations() {
    const dbPath = path.join(__dirname, '..', 'logistics.db');
    const schemaPath = path.join(__dirname, '..', 'migrations', '01_schema.sql');

    try {
        // VERBESSERUNG: Versucht, die alte Datenbankdatei zu löschen, um einen sauberen Start zu garantieren.
        console.log(`Prüfe, ob alte Datenbank unter ${dbPath} existiert...`);
        await fs.unlink(dbPath);
        console.log('Alte Datenbankdatei erfolgreich gelöscht.');
    } catch (err) {
        // Ignoriert den Fehler, wenn die Datei nicht existiert (was erwartet wird).
        if (err.code === 'ENOENT') {
            console.log('Keine alte Datenbankdatei gefunden. Das ist in Ordnung.');
        } else {
            // Wirft einen Fehler bei anderen Problemen (z.B. Berechtigungen).
            console.error('Unerwarteter Fehler beim Löschen der alten Datenbank:', err.message);
            return; // Beendet das Skript bei einem schweren Fehler.
        }
    }

    try {
        // Verbindet sich mit der Datenbank (erstellt sie, da sie nun garantiert nicht mehr existiert)
        const db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        console.log('Neue Datenbank verbunden/erstellt.');

        // Liest das SQL-Schema aus der Datei
        const schema = await fs.readFile(schemaPath, 'utf-8');
        
        // Führt das gesamte SQL-Skript aus, um die Tabellen zu erstellen
        await db.exec(schema);

        console.log('Datenbank-Schema erfolgreich angewendet. Tabellen wurden erstellt.');

        await db.close();
        console.log('Datenbankverbindung geschlossen.');

    } catch (err) {
        console.error('Fehler während der Migration:', err.message);
    }
}

runMigrations();

