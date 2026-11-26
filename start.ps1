Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "     FUNDCHAIN 3.0: DECENTRALIZED CROWDFUNDING & ESCROW PLATFORM" -ForegroundColor Green
Write-Host "    Transparent Fundraising, AI Fraud Detection, Milestone Escrow" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host ""

# Step 1: Start Hardhat Node
Write-Host "[1/5] Starting Local Ethereum Blockchain Node on port 8545..." -ForegroundColor Cyan
Start-Process cmd.exe -ArgumentList '/k "npx hardhat node"'

Write-Host "Waiting 5 seconds for local node to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Step 2: Deploy Contract
Write-Host "`n[2/5] Deploying Crowdfunding.sol with Escrow & Milestones..." -ForegroundColor Cyan
& cmd.exe /c "npm run deploy:local"

# Step 3: Seed Campaigns
Write-Host "`n[3/5] Seeding rich FundChain 3.0 campaigns, milestones, proposals, disputes..." -ForegroundColor Cyan
& cmd.exe /c "npm run seed:local"

# Step 4: AI Service (Optional Python)
Write-Host "`n[4/5] Checking Python AI Service..." -ForegroundColor Cyan
$pythonInstalled = Get-Command python -ErrorAction SilentlyContinue
if ($pythonInstalled) {
    Start-Process cmd.exe -ArgumentList '/k "cd ai-service && python main.py"'
    Write-Host "  -> Python AI Service started on http://localhost:8000" -ForegroundColor Green
} else {
    Write-Host "  -> Python not detected. In-browser ML fallback engine will run automatically." -ForegroundColor Yellow
}

# Step 5: Start Frontend
Write-Host "`n[5/5] Starting FundChain React + Vite Web Application..." -ForegroundColor Cyan
Start-Process cmd.exe -ArgumentList '/k "npm run frontend:dev"'

Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"

Write-Host "`n=====================================================================" -ForegroundColor Green
Write-Host "                   ALL SERVICES STARTED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host " Web Application:   http://localhost:5173"
Write-Host " Blockchain Node:   http://127.0.0.1:8545"
Write-Host " Chain ID:          31337"
Write-Host " AI Microservice:   http://localhost:8000 (with auto browser fallback)"
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
Write-Host "    - Account #0 (Admin Account):"
Write-Host "      0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
Write-Host ""
Write-Host "    - Account #1 (Campaign Creator / Beneficiary):"
Write-Host "      0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
Write-Host ""
Write-Host "    - Account #2 (Donor Account 1):"
Write-Host "      0x5de4111afa1a4b94908f83103eb2f9580802c60dd003923a109a2592a8b9c453"
Write-Host ""
Write-Host "    - Account #3 (Donor Account 2):"
Write-Host "      0x7c852118294e51e653712a450583407204e2874b7ecf30453e01712e3e5df30e"
Write-Host "====================================================================="
