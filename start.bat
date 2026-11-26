@echo off
title FundChain - One-Click Launcher
color 0A

echo =====================================================================
echo           FUNDCHAIN: DECENTRALIZED CROWDFUNDING PLATFORM
echo              Transparent Fundraising. Powered by Blockchain.
echo =====================================================================
echo.

:: Step 1: Start Hardhat Node in a separate window
echo [1/4] Starting Local Ethereum Blockchain Node on port 8545...
start "FundChain Hardhat Node (Port 8545)" cmd /k "npx hardhat node"

echo Waiting 5 seconds for local blockchain node to initialize...
timeout /t 5 /nobreak >nul

:: Step 2: Deploy Crowdfunding Smart Contract
echo.
echo [2/4] Deploying Crowdfunding.sol to local network...
call npm run deploy:local
if %errorlevel% neq 0 (
    echo [ERROR] Contract deployment failed. Make sure port 8545 is open and node is running.
    pause
    exit /b %errorlevel%
)

:: Step 3: Seed Initial Campaigns
echo.
echo [3/4] Seeding initial campaigns (BharatAgri agriculture, education, healthcare)...
call npm run seed:local
if %errorlevel% neq 0 (
    echo [WARNING] Seeding encountered an issue, but contract is deployed.
)

:: Step 4: Start Frontend Vite Dev Server in a separate window
echo.
echo [4/4] Starting FundChain React + Vite Web Application...
start "FundChain Frontend Server" cmd /k "npm run frontend:dev"

:: Wait 3 seconds then open browser
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo =====================================================================
echo                    ALL SERVICES STARTED SUCCESSFULLY!
echo =====================================================================
echo.
echo  Web Application:   http://localhost:5173
echo  Blockchain Node:   http://127.0.0.1:8545
echo  Chain ID:          31337
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
echo  3. Import a Pre-Funded Test Account (10,000 ETH each):
echo     - Account #0 (Deployer / Creator):
echo       0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
echo.
echo     - Account #1 (Farmer Account / Creator):
echo       0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
echo.
echo     - Account #2 (Student / Contributor):
echo       0x5de4111afa1a4b94908f83103eb2f9580802c60dd003923a109a2592a8b9c453
echo.
echo     - Account #3 (General Contributor):
echo       0x7c852118294e51e653712a450583407204e2874b7ecf30453e01712e3e5df30e
echo =====================================================================
echo Keep the opened Node and Frontend terminal windows running while using the app.
echo.
pause
