param(
    [Parameter(Mandatory=$false)][string]$Message = "chore: daily updates"
)

Write-Host "Iniciando Push para FéConecta (Raiz)..." -ForegroundColor Cyan
git add .
git commit -m $Message
git push

Write-Host "`nIniciando Push para FéNamoro (Sub-repositório)..." -ForegroundColor Cyan
cd apps/fenamoro
git add .
git commit -m $Message
git push
cd ../..

Write-Host "`nAmbos os repositórios foram atualizados no GitHub!" -ForegroundColor Green
