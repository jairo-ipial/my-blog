# Pass the same arguments as the Node command, including --dry-run.
$ErrorActionPreference = 'Stop'
& node (Join-Path $PSScriptRoot 'import-articles.mjs') @args
exit $LASTEXITCODE
