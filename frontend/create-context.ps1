# Context Generator für Claude
# Sammelt alle wichtigen Dateien für bessere Claude-Sessions

Write-Host "🔄 Erstelle Context für Claude..." -ForegroundColor Yellow

$output = @"
=== LOGISTIKPRO CONTEXT $(Get-Date -Format "dd.MM.yyyy HH:mm") ===

=== 🚀 PROJEKT STATUS ===
✅ SendungsBoard - Funktioniert
✅ NeueSendung - Funktioniert  
✅ PartnerKalkulation - Funktioniert
✅ Anfragen speichern - Funktioniert
⏳ Anfragen anzeigen - In Arbeit
❌ Navigation Sidebar - Nicht implementiert
❌ E-Mail Templates - Nicht implementiert
❌ PDF Export - Nicht implementiert
❌ Finanzen - Nicht implementiert

=== 📁 PROJEKT-STRUKTUR ===
"@

# Struktur hinzufügen
$output += "`n"
$output += (tree /F | Out-String)

# Wichtige Backend-Dateien
Write-Host "📄 Lese Backend-Dateien..." -ForegroundColor Cyan
$backendFiles = @(
    "backend\server.js",
    "backend\supabaseClient.js",
    "backend\milestoneDefinitions.js"
)

foreach ($file in $backendFiles) {
    if (Test-Path $file) {
        $output += "`n`n=== FILE: $file ===`n"
        $output += Get-Content $file -Raw
    }
}

# Wichtige Frontend-Dateien
Write-Host "📄 Lese Frontend-Dateien..." -ForegroundColor Cyan
$frontendFiles = @(
    "frontend\src\components\SendungsBoard.jsx",
    "frontend\src\components\NeueSendungSuper.jsx",
    "frontend\src\components\PartnerKalkulation.jsx"
)

foreach ($file in $frontendFiles) {
    if (Test-Path $file) {
        $output += "`n`n=== FILE: $file ===`n"
        # Nur erste 200 Zeilen für Übersicht
        $content = Get-Content $file -TotalCount 200
        $output += ($content -join "`n")
        $output += "`n... [Rest der Datei gekürzt für Übersicht]"
    }
}

# In Datei speichern
$output | Out-File "CURRENT_CONTEXT.txt" -Encoding UTF8

Write-Host "✅ Context erstellt!" -ForegroundColor Green
Write-Host "📍 Gespeichert als: CURRENT_CONTEXT.txt" -ForegroundColor White
Write-Host "💡 Diese Datei bei Claude anhängen für beste Ergebnisse!" -ForegroundColor Yellow