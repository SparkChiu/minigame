$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
$projectRoot = $PSScriptRoot
$archivePath = Join-Path $projectRoot 'dark-cuisine-endless-v29.zip'
$files = @('index.html','style.css','engine.js','render.js','movement.js','combat-ai.js','.nojekyll','README.md','DESIGN.md','VALIDATION.md','start-game.bat','server.cjs','verify-v10.cjs','verify-v11.cjs','verify-v12.cjs','verify-v13.cjs','verify-v14.cjs','verify-v15.cjs','verify-v18.cjs','verify-v19.cjs','verify-v20.cjs','verify-v21.cjs','verify-v22.cjs','verify-v24.cjs','verify-v25.cjs','verify-v28.cjs','verify-v29.cjs','GAME_RULES.md','RULES-v20.md','AGENTS.md','SOURCES.md','package.ps1','assets/cavern.png','.github/workflows/pages.yml')
$outputStream = [System.IO.File]::Open($archivePath, [System.IO.FileMode]::Create)
$archive = [System.IO.Compression.ZipArchive]::new($outputStream, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($relativePath in $files) {
    $entry = $archive.CreateEntry($relativePath, [System.IO.Compression.CompressionLevel]::Optimal)
    $inputStream = [System.IO.File]::OpenRead((Join-Path $projectRoot $relativePath))
    $entryStream = $entry.Open()
    try { $inputStream.CopyTo($entryStream) } finally { $entryStream.Dispose(); $inputStream.Dispose() }
  }
} finally { $archive.Dispose(); $outputStream.Dispose() }
Write-Output "Packaged $archivePath"
