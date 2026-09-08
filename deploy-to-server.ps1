# =============================================================================
#  mbt_minigames - Deploy to the FiveM dev server (mbt-shared/deploy v1.0)
#
#  Syncs this resource into MalibuESX [mbt] with robocopy /MIR, excluding
#  dev-only artifacts so that only what fxmanifest.lua declares is copied:
#  the Lua, config.lua, and the built web/dist.
#
#  Runs the NUI build by DEFAULT before the sync. mbt_minigames is a shared
#  library - mbt_elevator consumes it in production - so deploying a stale
#  bundle breaks a consumer, not just this resource.
#
#  ASCII only on purpose - PowerShell 5.1 reads .ps1 as ANSI unless there is a
#  BOM, and a stray em dash inside a quoted string breaks the parser.
#
#  Usage:
#     .\deploy-to-server.ps1              # build + deploy
#     .\deploy-to-server.ps1 -SkipBuild   # Lua-only edit, dist already current
#     .\deploy-to-server.ps1 -DryRun      # list what would change, write nothing
#     .\deploy-to-server.ps1 -Dest '...'  # override the destination
# =============================================================================

param(
    [string]$Src  = $PSScriptRoot,
    [string]$Dest = '',
    [switch]$SkipBuild,
    [switch]$DryRun
)

$DefaultDest = 'D:\Projects\FiveM\MalibuESX\server-data\resources\[mbt]\mbt_minigames'

if (-not $Dest) { $Dest = $DefaultDest }
if (-not $Dest) { Write-Error 'No destination: set $DefaultDest or pass -Dest.'; exit 1 }

if (-not $SkipBuild) {
    Write-Host '== NUI build (bun run build) ==' -ForegroundColor Cyan
    Push-Location (Join-Path $Src 'web')
    try {
        bun run build
        if ($LASTEXITCODE -ne 0) { throw "bun run build failed (exit $LASTEXITCODE)" }
    } finally {
        Pop-Location
    }
}

# ui_page points at web/dist/index.html. Without it the resource still starts
# and the NUI is a blank screen, so fail here rather than on the server.
if (-not (Test-Path -LiteralPath (Join-Path $Src 'web\dist\index.html'))) {
    Write-Error 'web/dist/index.html not found. Run without -SkipBuild, or bun run build in web/ first.'
    exit 1
}

# web/index.html, web/README.md and web/trace.svg are excluded by FULL PATH:
# a bare '/XF index.html' would also drop web/dist/index.html, which is the
# ui_page. web/public is excluded because vite already copies it into dist.
$rcArgs = @($Src, $Dest, '/MIR', '/NFL', '/NDL', '/NP', '/R:1', '/W:1',
    '/XD', 'node_modules', '.git', '.github', '.claude',
           "$Src\web\src", "$Src\web\public",
    '/XF', 'bun.lock', 'package.json', 'tsconfig*.json', 'vite.config.*',
           'eslint.config.js', 'deploy-to-server.ps1', '.gitignore', '.gitattributes',
           "$Src\web\index.html", "$Src\web\README.md", "$Src\web\trace.svg")
if ($DryRun) { $rcArgs += '/L' }

Write-Host "== robocopy $Src -> $Dest ==" -ForegroundColor Cyan
robocopy @rcArgs
if ($LASTEXITCODE -ge 8) { Write-Error "robocopy failed (code $LASTEXITCODE)"; exit 1 }

Write-Host '== deploy OK - now: ensure mbt_minigames / restart in txAdmin ==' -ForegroundColor Green
Write-Host '   mbt_elevator consumes this resource: restart it too if it is running.' -ForegroundColor Yellow
exit 0
