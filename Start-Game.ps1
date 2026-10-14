param([switch]$NoBrowser)

$ErrorActionPreference = 'Stop'
$gameRoot = $PSScriptRoot
$gameUrl = 'http://127.0.0.1:4175/'
$gameMutex = New-Object System.Threading.Mutex($false, 'Local\DemonKingPhase1Launcher')
$gameHasLock = $false

function Test-GameServer {
    try {
        $gamePage = Invoke-WebRequest -UseBasicParsing -Uri $gameUrl -TimeoutSec 1
        # Windows PowerShell 5.1은 charset 없는 UTF-8 응답의 한글을 잘못 읽을 수 있다.
        # 빌드 앱 구조와 영문 스토리 ID로 확인하여 HTTP 디코딩 차이를 피한다.
        if ($gamePage.Content -notmatch '/assets/index-' -or $gamePage.Content -notmatch 'id="app"') { return $false }
        $gameManifest = Invoke-WebRequest -UseBasicParsing -Uri ($gameUrl + 'stories/demon-king/story.json') -TimeoutSec 1
        $gameData = $gameManifest.Content | ConvertFrom-Json
        return ($gameData.id -eq 'demon-king' -and $gameData.version -in @('1.0.0', '1.1.0'))
    } catch { return $false }
}

try {
    $gameHasLock = $gameMutex.WaitOne(15000)
    if (-not $gameHasLock) { throw '다른 실행 요청이 처리 중입니다. 잠시 후 다시 실행해 주세요.' }
    if (-not (Test-GameServer)) {
        $gameNode = (Get-Command node.exe -ErrorAction Stop).Source
        $gameVite = Join-Path $gameRoot 'node_modules\vite\bin\vite.js'
        if (-not (Test-Path -LiteralPath $gameVite)) { throw '실행 라이브러리가 없습니다. 프로젝트 폴더에서 npm ci를 실행해 주세요.' }
        if (-not (Test-Path -LiteralPath (Join-Path $gameRoot 'dist\index.html'))) { throw '게임 빌드가 없습니다. 프로젝트 폴더에서 npm run build를 실행해 주세요.' }
        $gameLogRoot = Join-Path $env:LOCALAPPDATA 'DemonKingPhase1'
        New-Item -ItemType Directory -Force -Path $gameLogRoot | Out-Null
        $gameProcess = Start-Process -FilePath $gameNode -ArgumentList @(
            ('"{0}"' -f $gameVite), 'preview', '--host', '127.0.0.1', '--port', '4175', '--strictPort'
        ) -WorkingDirectory $gameRoot -WindowStyle Hidden -PassThru `
            -RedirectStandardOutput (Join-Path $gameLogRoot 'server.log') `
            -RedirectStandardError (Join-Path $gameLogRoot 'server-error.log')
        $gameReady = $false
        for ($gameAttempt = 0; $gameAttempt -lt 40; $gameAttempt++) {
            if (Test-GameServer) { $gameReady = $true; break }
            if ($gameProcess.HasExited) { break }
            Start-Sleep -Milliseconds 250
        }
        if (-not $gameReady) { throw ('게임 서버를 시작하지 못했습니다. 4175 포트 사용 여부와 로그를 확인해 주세요: ' + $gameLogRoot) }
    }
    if (-not $NoBrowser) { Start-Process $gameUrl }
} catch {
    if ($NoBrowser) { [Console]::Error.WriteLine($_.Exception.Message); exit 1 }
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, '가짜 마왕의 일생 실행 오류', 'OK', 'Error') | Out-Null
    exit 1
} finally {
    if ($gameHasLock) { $gameMutex.ReleaseMutex() }
    $gameMutex.Dispose()
}
