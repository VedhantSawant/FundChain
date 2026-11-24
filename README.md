# FundChain: Decentralized Crowdfunding Platform with Refund Mechanism

> **Official Project Title:** Decentralized Crowdfunding Platform with Refund Mechanism  
> **Project Number:** 6  
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

## 3. Proposed Solution

FundChain replaces centralized intermediaries with an immutable, audited **Solidity smart contract (`Crowdfunding.sol`)**:
- **Trustless Escrow:** Ether contributions are held directly within the smart contract bytecode.
- **Automated All-or-Nothing Rule:**
  - **Success:** If `amountRaised >= goal` and `block.timestamp >= deadline`, the campaign creator can withdraw the collected funds.
  - **Failure:** If `amountRaised < goal` and `block.timestamp >= deadline`, each contributor is contractually entitled to execute a 100% refund in a single atomic transaction.
- **Zero Creator Self-Funding:** Creators cannot contribute to their own campaigns to manipulate metrics.
- **Permanent Public Record:** Every event (`CampaignCreated`, `ContributionReceived`, `FundsWithdrawn`, `RefundClaimed`) is permanently recorded on the blockchain ledger.

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
1. `createCampaign(string _title, string _description, uint256 _goal, uint256 _deadline, string _category, string _imageUrl)`:
   - Validates that title and description are non-empty.
   - Requires `_goal > 0` and `_deadline > block.timestamp`.
   - Stores campaign struct and emits `CampaignCreated`.

2. `contribute(uint256 _campaignId) external payable nonReentrant`:
   - Checks that the campaign exists and `block.timestamp < campaign.deadline`.
   - Requires `msg.value > 0`.
   - Restricts creators: `require(msg.sender != campaign.creator)`.
   - Updates `campaign.amountRaised` and `contributions[_campaignId][msg.sender]`.
   - Emits `ContributionReceived`.

3. `withdrawFunds(uint256 _campaignId) external nonReentrant`:
   - Restricted to `msg.sender == campaign.creator`.
   - Requires `block.timestamp >= campaign.deadline`.
   - Requires `campaign.amountRaised >= campaign.goal`.
   - Prevents double withdrawal: `require(!campaign.withdrawn)`.
   - Updates state first (`campaign.withdrawn = true`), then transfers ETH via call.
   - Emits `FundsWithdrawn`.

4. `claimRefund(uint256 _campaignId) external nonReentrant`:
   - Requires `block.timestamp >= campaign.deadline` and `campaign.amountRaised < campaign.goal`.
   - Requires `contributions[_campaignId][msg.sender] > 0`.
   - Requires `!refundClaimed[_campaignId][msg.sender]`.
   - Updates state first (`refundClaimed[_campaignId][msg.sender] = true`), then transfers refund ETH.
   - Emits `RefundClaimed`.

5. `getContributionStatus(uint256 _campaignId, address _contributor)`:
   - Returns contributed amount in wei, whether refund was claimed, and real-time boolean eligibility for refunds.

### Security Highlights:
- **Reentrancy Protection:** Mutex status lock preventing recursive calling.
- **Checks-Effects-Interactions Pattern:** All state mappings are modified before ETH is transferred.
- **Safe Transfers:** Utilizes `.call{value: ...}("")` with explicit boolean success assertion.

---

## 7. Website Pages & Features

| Page | Route | Description |
| :--- | :--- | :--- |
| **Home Page** | `/` | Hero section, live on-chain stats (Campaigns, Total ETH Raised, Successes), BharatAgri Agriculture highlight, "How It Works" 4-step workflow, "Why Blockchain" value propositions. |
| **Explore Campaigns** | `/explore` | Real-time campaign directory with search by keyword, category filter (Agriculture, Education, Healthcare, etc.), status filter (Active, Funded, Successful, Failed, Withdrawn), and sorting options. |
| **Campaign Details** | `/campaign/:id` | Dedicated campaign view with status badges, countdown timer, creator card, progress bar, interactive ETH contribution form with presets, creator withdrawal button, and donor refund button. |
| **Create Campaign** | `/create` | Interactive campaign creation form with deadline selector (+7d, +14d, +30d), demo category image presets, input validation, and real-time live card preview before submitting on-chain. |
| **My Dashboard** | `/dashboard` | User portfolio tracking campaigns created by the user (with Withdraw button when eligible) and campaigns supported (with Claim Refund button when eligible). |
| **Transaction History** | `/transactions` | Immutable blockchain audit explorer parsing smart contract events (`CampaignCreated`, `ContributionReceived`, `FundsWithdrawn`, `RefundClaimed`) with timestamp, amount, and tx hash links. |

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

### Step 1: Start Hardhat Local Blockchain Node
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

FundChain includes an automated test suite verifying all required academic testing scenarios.

Run tests using:
```bash
npm run test
```

### Scenario A: Successful Campaign Lifecycle
- **Step 1:** Wallet A creates campaign with Goal = 1.0 ETH, Deadline = 1 hour.
- **Step 2:** Wallet B contributes 0.4 ETH.
- **Step 3:** Wallet C contributes 0.7 ETH (Total = 1.1 ETH >= 1.0 ETH).
- **Step 4:** Time advances past deadline.
- **Step 5:** Wallet A calls `withdrawFunds(1)`.
- **Assertion:** Contract verifies goal achieved, marks `withdrawn = true`, and transfers 1.1 ETH to Wallet A. Contributor refund attempts are rejected.

### Scenario B: Failed Campaign & Automatic Refunds
- **Step 1:** Wallet A creates campaign with Goal = 2.0 ETH, Deadline = 1 hour.
- **Step 2:** Wallet B contributes 0.5 ETH.
- **Step 3:** Wallet C contributes 0.3 ETH (Total = 0.8 ETH < 2.0 ETH).
- **Step 4:** Time advances past deadline.
- **Step 5:** Creator attempt to withdraw is rejected (`Funding goal has not been reached`).
- **Step 6:** Wallet B calls `claimRefund(1)` -> receives 0.5 ETH refund.
- **Step 7:** Wallet C calls `claimRefund(1)` -> receives 0.3 ETH refund.
- **Assertion:** Re-claiming refund is blocked (`Refund has already been claimed`). Non-contributors are blocked (`No contribution found for this address`).

### Scenario C: Security & Edge Case Validations
- Zero ETH contribution rejected.
- Creator contributing to own campaign rejected.
- Negative or zero funding goal rejected.
- Past deadline creation rejected.
- Withdrawal before deadline rejected (even if goal reached early).
- Contributions after deadline rejected.

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

## 14. Academic Declaration

This project was developed for **College Blockchain Technology Mini-Project #6**.  
*All rights reserved.*
