@echo off
title FundChain 3.0 - One-Click Launcher
color 0A

echo =====================================================================
echo      FUNDCHAIN 3.0: DECENTRALIZED CROWDFUNDING & ESCROW PLATFORM
echo     Transparent Fundraising, AI Fraud Detection, Milestone Escrow
echo =====================================================================
echo.

:: Step 1: Start Hardhat Node in a separate window
echo [1/5] Starting Local Ethereum Blockchain Node on port 8545...
start "FundChain Hardhat Node (Port 8545)" cmd /k "npx hardhat node"

echo Waiting 5 seconds for local blockchain node to initialize...
timeout /t 5 /nobreak >nul

:: Step 2: Deploy Crowdfunding Smart Contract
echo.
echo [2/5] Deploying Crowdfunding.sol with Escrow & Milestones...
call npm run deploy:local
if %errorlevel% neq 0 (
    echo [ERROR] Contract deployment failed. Make sure port 8545 is open and node is running.
    pause
    exit /b %errorlevel%
)

:: Step 3: Seed Initial Campaigns, Milestones, and Disputes
echo.
echo [3/5] Seeding rich FundChain 3.0 campaigns, milestones, proposals, disputes...
call npm run seed:local
if %errorlevel% neq 0 (
    echo [WARNING] Seeding encountered an issue, but contract is deployed.
)

:: Step 4: Optional Python AI Fraud Detection Microservice
echo.
echo [4/5] Starting AI Fraud Detection Microservice (Port 8000)...
where python >nul 2>nul
if %errorlevel% equ 0 (
    start "FundChain AI Fraud Detection Service" cmd /k "cd ai-service && python main.py"
    echo   -> Python AI Service started on http://localhost:8000
) else (
    echo   -> Python not detected on PATH. Client-side ML fallback will run seamlessly!
)

:: Step 5: Start Frontend Vite Dev Server in a separate window
echo.
echo [5/5] Starting FundChain 3.0 React + Vite Web Application...
start "FundChain Frontend Server" cmd /k "npm run frontend:dev"

:: Wait 3 seconds then open browser
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo =====================================================================
echo                   ALL SERVICES STARTED SUCCESSFULLY!
echo =====================================================================
echo.
echo  Web Application:   http://localhost:5173
echo  Blockchain Node:   http://127.0.0.1:8545
echo  Chain ID:          31337
echo  AI Microservice:   http://localhost:8000 (with auto browser fallback)
echo.
echo ---------------------------------------------------------------------
echo                     METAMASK SETUP INSTRUCTIONS
echo ---------------------------------------------------------------------
echo  1. Open MetaMask extension.
echo  2. Click the Network dropdown (top-left) -> Add Network Manually:
echo     - Network Name:   Hardhat Localhost
echo     - New RPC URL:    http://127.0.0.1:8545
echo     - Chain ID:       31337
echo     - Currency:       ETH
echo.
echo  3. Import Pre-Funded Test Accounts (10,000 ETH each):
echo     - Account #0 (Admin Account):
echo       0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
echo.
echo     - Account #1 (Campaign Creator / Beneficiary):
echo       0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
echo.
echo     - Account #2 (Donor Account 1):
echo       0x5de4111afa1a4b94908f83103eb2f9580802c60dd003923a109a2592a8b9c453
echo.
echo     - Account #3 (Donor Account 2):
echo       0x7c852118294e51e653712a450583407204e2874b7ecf30453e01712e3e5df30e
echo =====================================================================
echo Keep the opened Node and Frontend terminal windows running while using the app.
echo.
pause
