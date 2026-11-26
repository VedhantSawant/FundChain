Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "          FUNDCHAIN: DECENTRALIZED CROWDFUNDING PLATFORM" -ForegroundColor Green
Write-Host "             Transparent Fundraising. Powered by Blockchain." -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host ""

# Step 1: Start Hardhat Node
Write-Host "[1/4] Starting Local Ethereum Blockchain Node on port 8545..." -ForegroundColor Cyan
Start-Process cmd.exe -ArgumentList '/k "npx hardhat node"'

Write-Host "Waiting 5 seconds for local node to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Step 2: Deploy Contract
Write-Host "`n[2/4] Deploying Crowdfunding.sol to local network..." -ForegroundColor Cyan
& cmd.exe /c "npm run deploy:local"

# Step 3: Seed Campaigns
Write-Host "`n[3/4] Seeding initial campaigns (BharatAgri agriculture, education, healthcare)..." -ForegroundColor Cyan
& cmd.exe /c "npm run seed:local"

# Step 4: Start Frontend
Write-Host "`n[4/4] Starting FundChain React + Vite Web Application..." -ForegroundColor Cyan
Start-Process cmd.exe -ArgumentList '/k "npm run frontend:dev"'

Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"

Write-Host "`n=====================================================================" -ForegroundColor Green
Write-Host "                   ALL SERVICES STARTED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host " Web Application:   http://localhost:5173"
Write-Host " Blockchain Node:   http://127.0.0.1:8545"
Write-Host " Chain ID:          31337"
Write-Host ""
Write-Host "---------------------------------------------------------------------"
Write-Host "                    METAMASK SETUP INSTRUCTIONS"
Write-Host "---------------------------------------------------------------------"
Write-Host " 1. Open MetaMask -> Network dropdown -> Add Network Manually:"
Write-Host "    - Network Name:   Hardhat Localhost"
Write-Host "    - New RPC URL:    http://127.0.0.1:8545"
Write-Host "    - Chain ID:       31337"
Write-Host "    - Currency:       ETH"
Write-Host ""
Write-Host " 2. Import Pre-Funded Test Accounts (10,000 ETH each):"
Write-Host "    - Account #0 (Deployer / Creator):"
Write-Host "      0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
Write-Host ""
Write-Host "    - Account #1 (Farmer Account / Creator):"
Write-Host "      0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
Write-Host ""
Write-Host "    - Account #2 (Student / Contributor):"
Write-Host "      0x5de4111afa1a4b94908f83103eb2f9580802c60dd003923a109a2592a8b9c453"
Write-Host ""
Write-Host "    - Account #3 (General Contributor):"
Write-Host "      0x7c852118294e51e653712a450583407204e2874b7ecf30453e01712e3e5df30e"
Write-Host "====================================================================="
Write-Host "Press any key to close this launcher..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
