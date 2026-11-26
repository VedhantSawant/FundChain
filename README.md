# FundChain: Decentralized Crowdfunding Platform with Refund Mechanism

> **Official Project Title:** Decentralized Crowdfunding Platform with Refund Mechanism  
> **Course:** Blockchain Technology Mini-Project  
> **Application Name:** FundChain  
> **Tagline:** *Transparent Fundraising. Powered by Blockchain.*

---

## 1. Project Introduction & Overview

**FundChain** is a decentralized application (dApp) built on the Ethereum blockchain that redefines online fundraising through smart contracts. By removing intermediaries, central fees, and arbitrary funding freezes, FundChain provides transparent, auditable, and trustless crowdfunding.

The platform includes an automated, smart-contract-enforced **Refund Mechanism**: donors are guaranteed a 100% refund of their contributed cryptocurrency directly from the smart contract if a campaign fails to reach its funding target before its deadline.

### Real-World Inspiration: Agriculture & BharatAgri
While FundChain supports diverse categories (Education, Healthcare, Technology, Environment, Community Development), it places a special architectural emphasis on **agricultural financing**. Inspired by **BharatAgri**, rural farmers and cooperatives can crowdfund capital for solar-powered micro-drip irrigation, organic bio-fertilizer banks, certified non-GMO seeds, and harvest machinery without exploitation by predatory lenders.

---

## 2. Problem Statement

Conventional crowdfunding platforms (e.g., Kickstarter, GoFundMe) suffer from critical limitations:
1. **High Intermediary Fees:** Platforms and payment processors deduct 5% to 10% of total funds raised.
2. **Centralized Counterparty Risk:** Platforms can arbitrarily freeze or delay funds based on subjective policies.
3. **Lack of Transparent Fund Tracking:** Donors cannot independently verify if contributions were received, how much total capital was accumulated, or whether withdrawal conditions were honored.
4. **Unreliable Refund Processing:** If a project fails, refunds depend on centralized payment gateways, often incurring chargebacks, delays, or currency conversion losses.

---

## 3. Proposed Solution & Escrow Architecture

FundChain replaces centralized intermediaries with an immutable, audited **Solidity Smart Contract Escrow System (`Crowdfunding.sol`)**:
- **Smart Contract Vault Escrow:** Ether contributions are stored securely inside the contract's escrow balance (`escrowBalance`). Funds are strictly segregated and protected against arbitrary withdrawals.
- **Designated Beneficiary Routing:** Campaign creators can specify a separate beneficiary wallet address (e.g., an agricultural cooperative, clinic, or equipment vendor) upon creation. If left empty, it safely defaults to the creator's address.
- **Permissionless Automated Release:**
  - Once `amountRaised >= goal` and `block.timestamp >= deadline`, the campaign enters the **Awaiting Fund Release** state.
  - Anyone—the creator, the beneficiary, an administrator, or any donor—can trigger `releaseFunds(campaignId)`. The smart contract atomically disburses 100% of the escrowed ETH directly to `campaign.beneficiary`, updates `campaign.fundsReleased = true`, and sets `campaign.escrowBalance = 0`.
- **Guaranteed 100% Contributor Refund:**
  - If a campaign expires without reaching its goal (`amountRaised < goal` and `block.timestamp >= deadline`), all contributions remain safeguarded in escrow.
  - Each contributor can call `claimRefund(campaignId)` to withdraw their full ETH deposit directly to their wallet in an atomic, non-reentrant transaction.
- **Zero Creator Self-Funding:** Creators cannot contribute to their own campaigns to manipulate metrics or fake social proof.
- **No Arbitrary Admin Withdrawal:** Neither the campaign creator nor the platform administrator has any privilege to seize, alter, or drain escrowed funds. The smart contract acts as an impartial code-governed fiduciary.
- **Permanent Public Record:** Every lifecycle event (`CampaignCreated`, `ContributionReceived`, `FundsLocked`, `FundsReleased`, `RefundClaimed`, `ContributionWithdrawn`, `UserDeposited`, `UserWithdrewDeposit`, `AdminTransferred`) is permanently emitted on the blockchain ledger.

---

## 4. Technology Stack

### Frontend & UI/UX
- **Framework:** React.js (v18) with Vite
- **Styling:** Tailwind CSS (Custom Color Palette: Deep Green `#14532D`, Emerald `#16A34A`, Soft Gold `#D4A017`, Off-White `#F8FAF7`)
- **Routing:** React Router v6
- **Icons:** Lucide React
- **Web3 Integration:** Ethers.js (v6) + MetaMask Browser Extension

### Blockchain & Smart Contract
- **Language:** Solidity (`^0.8.20`)
- **Development Tooling:** Hardhat + Hardhat Network Toolbox
- **Alternative Compiler:** Remix IDE (Injected Provider - MetaMask)
- **EVM Target:** Ethereum Localhost (Chain ID `31337`) / Ethereum Sepolia Testnet (Chain ID `11155111`)
- **Security:** Custom Non-Reentrant Guard + Checks-Effects-Interactions Pattern

---

## 5. System Architecture

```
+-------------------------------------------------------------------------+
|                              USER BROWSER                               |
|                                                                         |
|  +--------------------+    +--------------------+    +---------------+  |
|  | React Components   |    | Web3Context        |    | MetaMask Ext  |  |
|  | - Home             |--->| - Account / Signer |--->| - Private Key |  |
|  | - Explore          |    | - Balance / Chain  |    | - Tx Approval |  |
|  | - Campaign Details |    | - Ethers.js v6     |    +---------------+  |
|  | - Create Campaign  |    +--------------------+            |          |
|  | - Dashboard        |              |                       |          |
|  | - Transactions     |              | JSON-RPC              | Signed Tx|
|  +--------------------+              | Provider              | (Gas)    |
+--------------------------------------|-----------------------|----------+
                                       v                       v
+-------------------------------------------------------------------------+
|                       ETHEREUM-COMPATIBLE BLOCKCHAIN                    |
|                        (Hardhat Node / Sepolia)                         |
|                                                                         |
|                 +------------------------------------+                  |
|                 |     Crowdfunding.sol (0.8.20)      |                  |
|                 |                                    |                  |
|                 | - createCampaign()                 |                  |
|                 | - contribute() [payable]           |                  |
|                 | - withdrawFunds()                  |                  |
|                 | - claimRefund()                    |                  |
|                 | - getContributionStatus()          |                  |
|                 | - Reentrancy Guard Protection      |                  |
|                 +------------------------------------+                  |
|                                  |                                      |
|               +------------------+------------------+                   |
|               |                                     |                   |
|               v                                     v                   |
|       [State Variables]                     [Contract Events]           |
|       - campaigns mapping                   - CampaignCreated           |
|       - contributions mapping               - ContributionReceived      |
|       - refundClaimed mapping               - FundsWithdrawn            |
|                                             - RefundClaimed             |
+-------------------------------------------------------------------------+
```

---

## 6. Smart Contract Functions & Security

### Key Functions in `Crowdfunding.sol`:
1. `createCampaign(string _title, string _description, uint256 _goal, uint256 _deadline, string _category, string _imageUrl, address _beneficiary)`:
   - Validates that title and description are non-empty.
   - Requires `_goal > 0` and `_deadline > block.timestamp`.
   - Allows designating a separate `_beneficiary` wallet address (defaults to `msg.sender` if `address(0)` is provided).
   - Stores campaign struct, registers interacting user, and emits `CampaignCreated`.

2. `contribute(uint256 _campaignId) external payable nonReentrant`:
   - Checks that the campaign exists and `block.timestamp < campaign.deadline`.
   - Requires `msg.value > 0`.
   - Restricts creators: `require(msg.sender != campaign.creator)`.
   - Locks funds into smart contract escrow: updates `campaign.amountRaised` and `campaign.escrowBalance += msg.value`.
   - Registers contributor in `contributions[_campaignId][msg.sender]` and platform users registry.
   - Emits `ContributionReceived` and `FundsLocked`.

3. `releaseFunds(uint256 _campaignId) external nonReentrant`:
   - **Permissionless Escrow Release:** Can be invoked by ANY account (beneficiary, creator, donor, or admin) once requirements are fulfilled.
   - Requires `block.timestamp >= campaign.deadline`.
   - Requires `campaign.amountRaised >= campaign.goal`.
   - Prevents duplicate disbursements: `require(!campaign.fundsReleased && campaign.escrowBalance > 0)`.
   - Modifies state first: sets `campaign.fundsReleased = true`, zero out `campaign.escrowBalance`, updates `campaign.totalReleased`.
   - Transfers the entire escrow balance directly to `campaign.beneficiary` via low-level `.call`.
   - Emits `FundsReleased`.

4. `claimRefund(uint256 _campaignId) external nonReentrant`:
   - Requires `block.timestamp >= campaign.deadline` and `campaign.amountRaised < campaign.goal`.
   - Requires `contributions[_campaignId][msg.sender] > 0`.
   - Requires `!refundClaimed[_campaignId][msg.sender]`.
   - Updates state first (`refundClaimed[_campaignId][msg.sender] = true`, deducts `campaign.escrowBalance`), then transfers 100% refund ETH to backer.
   - Emits `RefundClaimed`.

5. `withdrawContribution(uint256 _campaignId) external nonReentrant`:
   - Allows a contributor to withdraw their contribution from an active campaign before the deadline.
   - If the campaign has ended and failed to meet its goal, it safely triggers the internal refund routine.
   - Adjusts `campaign.amountRaised`, `campaign.escrowBalance`, and contributor mappings atomically before transfer.
   - Emits `ContributionWithdrawn` (or `RefundClaimed`).

6. `depositFunds() external payable nonReentrant` & `withdrawVaultDeposit(uint256 _amount) external nonReentrant`:
   - Allows users to add money and deposit ETH into their personal FundChain smart contract vault balance.
   - Users can withdraw their deposited vault balance back to their MetaMask wallet at any time.
   - Emits `UserDeposited` and `UserWithdrewDeposit`.

7. `getContributionStatus(uint256 _campaignId, address _contributor)`:
   - Returns contributed amount in wei, whether refund was claimed, refund eligibility, and real-time `canWithdrawNow` boolean.

8. `getPlatformStats() external view returns (...)`:
   - Provides real-time macro statistics for the Admin Console: total campaigns count, total ETH raised all-time, total platform refunds claimed, total platform funds released to beneficiaries, active campaigns count, and current aggregate contract balance.

9. `getAllInteractingUsers() external view returns (address[] memory)`:
   - Returns the list of all distinct Ethereum addresses that have created campaigns, contributed funds, or deposited to vaults on FundChain.

10. `transferAdmin(address _newAdmin) external onlyAdmin`:
    - Allows the current contract administrator to transfer admin privileges to a new address. Emits `AdminTransferred`.

### Security Highlights:
- **Impartial Smart Contract Escrow:** Contributions are secured within the contract itself; no creator or admin possesses a backdoor to withdraw funds without fulfilling on-chain goal & time invariants.
- **Reentrancy Protection:** Mutex status lock preventing recursive calling on all state-mutating functions.
- **Checks-Effects-Interactions Pattern:** All state mappings (`fundsReleased`, `escrowBalance`, `refundClaimed`) are modified before ETH is dispatched.
- **Pull over Push Refunds:** Contributors withdraw refunds individually, preventing malicious contracts from reverting batch transfers.

---

## 7. Website Pages & Features

| Page | Route | Description |
| :--- | :--- | :--- |
| **Home Page** | `/` | Hero section, live on-chain stats (Campaigns, Total ETH Raised, Successes), BharatAgri Agriculture highlight, "How It Works" 4-step workflow, "Why Blockchain" value propositions. |
| **Explore Campaigns** | `/explore` | Real-time campaign directory with search by keyword, category filter (Agriculture, Education, Healthcare, etc.), status filter (Active, Goal Achieved, Awaiting Release, Funds Released, Refund Available, Refunded), and sorting options. |
| **Campaign Details** | `/campaign/:id` | Dedicated campaign view with status badges, countdown timer, creator & beneficiary cards, escrow balance display, progress bar, interactive ETH contribution form, permissionless "Release Escrow Funds" button, and backer refund/withdraw buttons. |
| **Create Campaign** | `/create` | Interactive campaign creation form with designated Beneficiary address support, deadline selector (+7d, +14d, +30d), demo category image presets, input validation, and real-time live card preview before submitting on-chain. |
| **User Dashboard** | `/dashboard` | User portfolio tracking 6 KPI metrics, created campaigns with escrow disbursement triggers, backed campaigns with escrow status, eligibility tracking, withdrawal/refund buttons, and on-chain transaction hashes. |
| **Admin Console** | `/admin` | Contract-governed administrator panel with 6 specialized management views: Overview (Metrics & Charts), Campaign Management (Filter & Release), Escrow Vault Breakdown, User Directory, Transaction Audit Trail, and EVM Fast-Forward Time Tool. |
| **Transaction History** | `/transactions` | Immutable blockchain audit explorer parsing smart contract events (`CampaignCreated`, `ContributionReceived`, `FundsLocked`, `FundsReleased`, `RefundClaimed`) with timestamp, amount, and tx hash links. |

---

## 8. Installation & Setup Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.x or v20.x+)
- [MetaMask](https://metamask.io/) extension installed in your browser

### Clone & Install Dependencies
```bash
# 1. Clone or navigate to the project directory
cd FundChain

# 2. Install root hardhat dependencies
npm install

# 3. Install frontend dependencies
cd frontend
npm install
cd ..
```

---

## 9. Running Locally (Fastest & Recommended)

### Option A: One-Click Launcher (Recommended)
Simply double-click or run:
```bat
start.bat
```
*(Or in PowerShell: `.\start.ps1`)*

This single command automatically:
1. Spawns the local Hardhat Ethereum node on port `8545`.
2. Deploys the `Crowdfunding.sol` smart contract.
3. Seeds sample campaigns (including BharatAgri agricultural projects).
4. Launches the React + Vite frontend server.
5. Automatically opens `http://localhost:5173` in your default browser.
6. Displays the MetaMask configuration and private keys ready for import.

---

### Option B: Manual Multi-Terminal Method
In your terminal, start the local node:
```bash
npm run node
```
This starts an Ethereum JSON-RPC node on `http://127.0.0.1:8545` (Chain ID `31337`) with 20 pre-funded test accounts containing 10,000 ETH each.

### Step 2: Deploy & Seed Smart Contract
In a second terminal window, deploy the contract:
```bash
npm run deploy:local
```
*(Optional) Seed sample campaigns including BharatAgri agricultural projects:*
```bash
npm run seed:local
```

### Step 3: Launch Frontend
```bash
npm run frontend:dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Step 4: Configure MetaMask for Localhost
1. Open MetaMask -> Click the network selector dropdown (top left).
2. Choose **Add a custom network**:
   - **Network Name:** Hardhat Localhost
   - **New RPC URL:** `http://127.0.0.1:8545`
   - **Chain ID:** `31337`
   - **Currency Symbol:** `ETH`
3. Import one of Hardhat's test accounts using its private key (e.g., Account #0: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`).

---

## 10. Deployment via Remix IDE (Sepolia Testnet)

If you prefer compiling and deploying via **Remix IDE** to the Ethereum Sepolia Testnet:

1. **Open Remix IDE:** Visit [https://remix.ethereum.org](https://remix.ethereum.org).
2. **Create File:** In the `contracts` directory in Remix, create a file named `Crowdfunding.sol`.
3. **Copy Code:** Copy the entire code from `contracts/Crowdfunding.sol` in this repository and paste it into Remix.
4. **Compile:**
   - Go to the **Solidity Compiler** tab (left sidebar).
   - Select compiler version `0.8.20`.
   - Click **Compile Crowdfunding.sol**.
5. **Deploy:**
   - Go to the **Deploy & Run Transactions** tab.
   - In the **Environment** dropdown, select **Injected Provider - MetaMask**.
   - Make sure your MetaMask is switched to the **Sepolia Testnet** (obtain testnet SepoliaETH from a faucet like `sepoliafaucet.com` or `cloud.google.com/application/faucets/ethereum/sepolia`).
   - Click **Deploy** and confirm the transaction in MetaMask.
6. **Obtain Contract Address & ABI:**
   - Under **Deployed Contracts**, copy the deployed address (e.g., `0x123...abc`).
   - Return to the compiler tab and click **ABI** (bottom) to copy the JSON ABI.
7. **Connect to Frontend:**
   - Open `frontend/src/blockchain/config.js` and set:
     ```javascript
     export const CONTRACT_ADDRESS = "0xYOUR_REMIX_DEPLOYED_ADDRESS";
     export const CHAIN_ID = 11155111;
     export const NETWORK_NAME = "sepolia";
     ```
   - Paste the copied ABI into `frontend/src/blockchain/CrowdfundingABI.json`.
8. **Run the App:** Run `npm run frontend:dev` and test live on Sepolia!

---

## 11. Testing Scenarios & Verification

### Part 1: Automated Unit Tests (Hardhat)
FundChain includes an automated test suite verifying 11 distinct lifecycle and security scenarios:
```bash
npm run test
```
**Test Results:**
- **Contract Deployment:** Sets deployer as admin; initializes platform counters.
- **Scenario A (Successful Campaign & Permissionless Escrow Release):** Campaign creation with distinct beneficiary, funds locked in escrow, permissionless release by any account (`thirdParty`) after deadline passes, verification of beneficiary balance increase and contract escrow balance reset.
- **Scenario B (Failed Campaign & Contributor Refunds):** Goal missed, deadline passes, contributors claim 100% atomic refunds, double refunds prevented.
- **Scenario C (Admin Security & Platform Stats):** Verifies `onlyAdmin` modifier on role transfer; prevents non-admins from admin routines; verifies `getPlatformStats()` and `getAllInteractingUsers()`.
- **Scenario D (Contributor Early Withdrawal):** Contributor withdraws ETH from active campaign before deadline; balances decrement accurately.
- **Scenario E (Account Vault):** Add Money (`depositFunds()`) and withdraw back to wallet.
- **Scenario F (Edge Cases & Rules):** Rejects self-contribution by creator, rejects contributions after deadline, defaults `address(0)` beneficiary to creator.

---

### Part 2: Interactive Manual Testing with 3 MetaMask Accounts

To demonstrate the full escrow lifecycle, designated beneficiary disbursement, contributor refunds, and the admin console to a professor or evaluator, use 3 test accounts from the local Hardhat node:

| Role | Hardhat Account | Wallet Address | Private Key |
| :--- | :--- | :--- | :--- |
| **Admin** | Account #0 | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| **Creator / Beneficiary** | Account #1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| **Contributor / Backer** | Account #2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb2f95410822a034d7434f1f929f1e40c6e5559` |

#### Walkthrough 1: Successful Campaign & Permissionless Escrow Release
1. **Connect Account #1 (Creator):**
   - Navigate to `/create`.
   - Enter Title: *"Solar Drip Irrigation Cooperative"*, Goal: `2.0` ETH, Deadline: `7 Days`.
   - Set Beneficiary Address: (e.g., enter Account #1's address or a dedicated beneficiary).
   - Click **Create Campaign On-Chain**. The campaign is created in `Active` status.
2. **Switch to Account #2 (Contributor):**
   - Click the Profile button -> click **Switch Wallet** to switch to Account #2 in MetaMask.
   - Go to `/campaign/1` and contribute `2.5 ETH`.
   - The campaign reaches its goal (`amountRaised >= goal`), status changes to `Goal Achieved`, and the 2.5 ETH is locked in smart contract escrow.
3. **Simulate Deadline Passing (EVM Fast-Forward Time):**
   - Switch to Account #0 (Admin) -> open the **Admin Console** at `/admin`.
   - Go to the **Settings & Dev Tools** tab -> In the *EVM Time Fast-Forward Tool*, click **Fast-Forward +7 Days (604,800s)**.
   - The local blockchain timestamp advances past the campaign's deadline!
4. **Trigger Permissionless Escrow Release:**
   - Any account can now disburse the funds. From Account #0, Account #1, or Account #2:
   - Navigate to `/campaign/1` or `/dashboard`.
   - The status is now **Awaiting Fund Release** and the button **"Release Escrow Funds to Beneficiary"** is active.
   - Click the release button and confirm the transaction in MetaMask.
   - **Verification:** The beneficiary receives the 2.5 ETH directly, the campaign status updates to **Funds Released**, escrow balance becomes `0.00 ETH`, and the event is logged permanently under `/transactions`.

#### Walkthrough 2: Failed Campaign & Automatic 100% Contributor Refund
1. **Connect Account #1 (Creator):**
   - Create a new campaign with Goal: `5.0 ETH` and Deadline: `7 Days`.
2. **Switch to Account #2 (Contributor):**
   - Go to the new campaign and contribute `1.0 ETH`.
   - The goal is NOT achieved (1.0 / 5.0 ETH).
3. **Simulate Deadline Passing:**
   - From `/admin` (or calling `evm_increaseTime`), fast-forward time by `+7 Days`.
4. **Claim Refund:**
   - On Account #2, visit `/campaign/2` or `/dashboard`.
   - The status is marked **Refund Available**.
   - Click **"Claim 100% Escrow Refund (1.0 ETH)"**.
   - **Verification:** 1.0 ETH is atomically refunded to Account #2's wallet, `refundClaimed` is recorded on-chain, and repeat claim attempts are blocked.

#### Walkthrough 3: Exploring the Admin Console (`/admin`)
- Connect Account #0 (`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`).
- Notice the **Admin Console** link in the navbar navigation.
- Click **Admin Console** to explore:
  - **Overview Tab:** Real-time on-chain platform metrics, total vault balance, and visual breakdown charts.
  - **Campaign Management Tab:** Filter and inspect all platform campaigns, view beneficiary mappings, and trigger releases.
  - **Escrow Vault Tab:** Audit individual campaign escrow balances and verify historical fund releases and refunds.
  - **User Directory Tab:** View all interacting Ethereum addresses, their created campaigns, contributions, and payouts.
  - **Transaction History Tab:** View chronological smart contract logs.
  - **Settings Tab:** Verify admin and contract address, and test EVM time manipulation.
- Switch to Account #1 or #2: Notice that accessing `/admin` displays a secure **Access Denied (403 Unauthorized)** screen, proving on-chain cryptographic role authorization!

---

## 12. Project Folder Structure

```
FundChain/
│
├── contracts/
│   └── Crowdfunding.sol          # Main Solidity smart contract
│
├── scripts/
│   ├── deploy.js                 # Automatic contract deployment script
│   └── seed.js                   # Seeding sample campaigns (BharatAgri use cases)
│
├── test/
│   └── Crowdfunding.test.js      # Hardhat automated test suite (Scenarios A, B, C)
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── blockchain/
│   │   │   ├── config.js         # Network configuration & contract address
│   │   │   ├── contract.js       # Ethers.js integration, providers & handlers
│   │   │   └── CrowdfundingABI.json # Generated contract ABI
│   │   │
│   │   ├── components/
│   │   │   ├── Navbar.jsx        # Navigation bar & wallet connector
│   │   │   ├── Footer.jsx        # Project details & verified contract status
│   │   │   ├── CampaignCard.jsx  # Reusable campaign card with progress bar
│   │   │   ├── ProgressBar.jsx   # Dynamic progress bar component
│   │   │   ├── NetworkBanner.jsx # Network warning banner
│   │   │   └── NotificationModal.jsx # Pending/Success/Error transaction modal
│   │   │
│   │   ├── context/
│   │   │   └── Web3Context.jsx   # Global Web3 React context provider
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.jsx          # Landing page with stats & How It Works
│   │   │   ├── Explore.jsx       # Search, filter, and sort campaigns
│   │   │   ├── CreateCampaign.jsx# Form with validation and live preview
│   │   │   ├── CampaignDetails.jsx # Detailed view, contribute, withdraw, refund
│   │   │   ├── Dashboard.jsx     # User dashboard for created & backed projects
│   │   │   └── Transactions.jsx  # Blockchain audit explorer for contract events
│   │   │
│   │   ├── styles/
│   │   ├── App.jsx               # Route definitions
│   │   ├── index.css             # Tailwind base & custom scrollbar styles
│   │   └── main.jsx              # React DOM mounting
│   │
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── hardhat.config.js             # Hardhat network & compiler configuration
├── package.json                  # Root npm scripts
├── .gitignore
└── README.md                     # Project documentation & academic report
```

---

## 13. Future Enhancements

1. **Decentralized Storage (IPFS / Arweave):** Store high-resolution campaign assets and legal documentation on decentralized storage protocols.
2. **Milestone-Based Escrow (DAO Voting):** Release funds in tranches (e.g., 30% advance for seeds, 70% upon proof of equipment installation) governed by contributor multi-sig votes.
3. **Multi-Token Support (USDC / USDT / DAI):** Enable contributions in USD-pegged stablecoins to mitigate cryptocurrency volatility for rural farmers.
4. **Decentralized Identity (Soulbound Badges):** Issue on-chain verifiable impact credentials to loyal donors and successful creators.

---

