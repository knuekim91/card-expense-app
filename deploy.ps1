$ErrorActionPreference = "Stop"

$git = "C:\Program Files\Git\bin\git.exe"
$gh = "C:\Program Files\GitHub CLI\gh.exe"
$repoName = "card-expense-app"

Set-Location $PSScriptRoot

& $gh auth status | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "GitHub 로그인이 필요합니다."
  Write-Host "아래 명령을 실행한 뒤 브라우저에서 인증을 완료하세요:"
  Write-Host "  gh auth login --hostname github.com --git-protocol https --web"
  exit 1
}

$owner = (& $gh api user -q .login).Trim()
Write-Host "GitHub 계정: $owner"

$repoExists = $false
try {
  & $gh repo view "$owner/$repoName" | Out-Null
  $repoExists = $true
} catch {
  $repoExists = $false
}

if (-not $repoExists) {
  Write-Host "저장소 생성 중: $repoName"
  & $gh repo create $repoName --public --source=. --remote=origin --push
} else {
  Write-Host "기존 저장소에 푸시 중: $repoName"
  & $git push -u origin main
}

Write-Host "GitHub Pages 설정 중..."
try {
  & $gh api "repos/$owner/$repoName/pages" -X POST -f build_type=workflow | Out-Null
} catch {
  & $gh api "repos/$owner/$repoName/pages" -X PUT -f build_type=workflow | Out-Null
}

$url = "https://$owner.github.io/$repoName/"
Write-Host ""
Write-Host "배포가 시작되었습니다."
Write-Host "1~2분 후 아래 주소에서 앱을 사용할 수 있습니다:"
Write-Host $url
Write-Host ""
Write-Host "배포 상태 확인:"
Write-Host "  gh run list --repo $owner/$repoName"
