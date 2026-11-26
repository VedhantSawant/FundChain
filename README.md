# FundChain 3.0: Decentralized Crowdfunding Platform with AI Fraud Detection, Smart Contract Escrow, Milestone Payments & Admin Dashboard

> **Official Project Title:** Decentralized Crowdfunding Platform with AI Fraud Detection, Smart Contract Escrow, Milestone Payments, Donor Voting & Admin Dashboard  
> **Course:** Third-Year Computer Engineering / Blockchain Technology Mini-Project  
> **Application Name:** FundChain 3.0  
> **Tagline:** *Transparent Fundraising. Powered by Blockchain & Machine Learning.*

---

## 1. Project Introduction & Overview

**FundChain 3.0** is an enterprise-grade decentralized application (dApp) engineered on the Ethereum blockchain that unites smart contract financial engineering with machine learning fraud detection. Designed as a comprehensive third-year Computer Engineering project, FundChain solves the foundational trust, accountability, and security deficits of traditional Web2 crowdfunding platforms (Kickstarter, GoFundMe, Ketto).

Every monetary unit contributed on FundChain is held in a code-governed **Smart Contract Escrow** (`escrowBalance`). Capital is never disbursed unconditionally or prematurely: funds can be released in **staged, verifiable milestones** upon cryptographic proof and auditor approval, protected by **backer dispute arbitration**, governed by **contributor voting proposals**, evaluated by a dual-engine **AI Fraud Detection System**, and anchored to an on-chain **Creator Reputation Metric**.

### Agricultural Financing Use Case (BharatAgri Inspiration)
While supporting general categories (Technology, Healthcare, Education, Community Development), FundChain specifically implements an agricultural procurement use case inspired by **BharatAgri**. Rural farming collectives can crowdfund capital for micro-drip irrigation, solar DC pumps, and organic bio-fertilizer reserves with milestone tranches that disburse only when verified delivery invoices or field audit certifications are presented on-chain.

---

## 2. Core Architectural Pillars of FundChain 3.0

### Pillar 1: Real-Time MetaMask & Blockchain Balance Synchronization
- **Zero Hardcoding & Live Provider Polling:** Eliminates stale or desynchronized balances. An active 6-second balance polling engine directly queries `ethers.BrowserProvider.getBalance(account)` and auto-refreshes on `accountsChanged`, `chainChanged`, and post-transaction receipts.
- **Recognizable & Customizable Account Names:** Displays user-friendly, customizable names throughout the entire UI (e.g., *"Admin Account"*, *"Campaign Creator / Beneficiary"*, *"Donor Account 1"*, *"Donor Account 2"*). Users can edit names inline with instant persistent storage in `localStorage`.
- **Cross-Account Balances:** When switching accounts via the Profile menu, users can inspect live ETH balances across all authorized MetaMask accounts simultaneously.
- **Network Mismatch Guards:** Alerts users whenever MetaMask deviates from the local Hardhat RPC (`http://127.0.0.1:8545`, Chain ID `31337`).

### Pillar 2: Smart Contract Escrow System
- **Immutable Bytecode Escrow:** Donor funds are locked into contract state (`escrowBalance`) rather than transmitted to creators upon donation.
- **Strict Invariant Enforcement:** Funds cannot be withdrawn before campaign deadlines unless the contributor explicitly triggers an early withdrawal.
- **Permissionless Settlement:** When a campaign achieves its goal and concludes, any user (beneficiary, creator, backer, or auditor) can execute `releaseFunds(campaignId)` to disburse escrowed capital to the verified beneficiary.
- **Guaranteed 100% Contributor Refunds:** If a campaign expires without reaching its goal (`amountRaised < goal`), every contributor can invoke `claimRefund(campaignId)` to pull 100% of their ETH deposit directly back into their wallet.
- **Zero Admin Seizure:** The smart contract admin has no function or backdoor to drain or divert escrow balances.

### Pillar 3: Milestone-Based Staged Fund Releases
- **1 to 5 Defined Milestones:** Campaign creators can configure structured project milestones during campaign creation (e.g., *Phase 1: Equipment Procurement 40%*, *Phase 2: Installation 40%*, *Phase 3: Commissioning 20%*), with real-time target sum verification matching the campaign goal.
- **Cryptographic Evidence Submission:** When a milestone is completed, the creator calls `submitMilestoneEvidence(campaignId, milestoneIndex, evidenceUrl)` to anchor proof (IPFS links, audit reports, photos) on-chain.
- **Admin / Auditor Review:** Auditors review submitted evidence directly from the Campaign Details page or Admin Console, approving (`approveMilestone`) or rejecting (`rejectMilestone`) the milestone.
- **Independent Tranche Disbursement:** Once approved, `releaseMilestoneFunds(campaignId, milestoneIndex)` transfers that milestone's allocated target amount directly from escrow to the beneficiary.

### Pillar 4: Dual-Engine AI-Based Campaign Fraud Detection
- **Microservice Architecture (`ai-service/`):** Built with Python 3.11, FastAPI, and scikit-learn. Provides high-throughput `/analyze-campaign` REST endpoints.
- **Pure-JS In-Browser Fallback (`frontend/src/services/aiFraudDetector.js`):** Client-side mathematical scoring engine replicating TF-IDF, N-gram tokenization, Cosine Similarity duplicate checking, and anomaly scoring so evaluation environments without Python or dependencies run with 100% uptime.
- **Multi-Factor Risk Scoring (0 to 100 Risk Score):**
  1. *NLP Scam & Vague Keyword Analysis:* Scans for hyperbolic phrases ("100% guaranteed profit", "double your crypto", "risk-free", "get rich quick", "secret investment").
  2. *Duplicate Campaign Detection:* Cosine similarity vector comparison across existing campaigns to identify syndicated or cloned proposals.
  3. *Statistical Outlier Analysis:* Detects abnormal goal amounts against category benchmarks and implausible deadline durations (<24h or >365d).
  4. *Description Depth Analysis:* Flags ultra-short, vague, or low-information project summaries.
- **Trained & Evaluated Model Metrics:** Validated on a curated 18-sample ground truth dataset (`ai-service/dataset.py`) achieving:
  - **Accuracy:** 100%
  - **Precision:** 100%
  - **Recall:** 100%
  - **F1-Score:** 100%
- **Pre-Submission Risk Warning:** Creators receive instant AI risk diagnostics and feedback as they type before spending gas on-chain.
- **Admin Moderation Actions:** Flagged campaigns appear in the Admin Dashboard with categorized risk badges (Low, Medium, High, Critical), explainable risk factor lists, and one-click admin flagging.

### Pillar 5: Donor Governance & Voting Proposals
- **Decentralized Decision Making:** Verified campaign contributors can create on-chain governance proposals via `createProposal(campaignId, title, description, durationSeconds)` to approve scope changes, timeline extensions, or emergency reallocations.
- **Weighted Democratic Balloting:** Verified backers cast `voteOnProposal(proposalId, support)` during the voting window. Repeat voting is cryptographically prevented.
- **Permissionless Execution:** Once the proposal deadline expires, `executeProposal(proposalId)` tallies votes and records the passed/rejected status on-chain.

### Pillar 6: On-Chain Creator Reputation System
- **Dynamic Formula (0 to 100):**
  $$\text{Score} = 75 + (\text{Successful Campaigns} \times 10) + (\text{Completed Milestones} \times 5) - (\text{Disputes Against} \times 15)$$
- **Cryptographic Badges:**
  - `Verified Champion` (Score $\ge 90$)
  - `Trusted Creator` (Score $75 - 89$)
  - `Standard Creator` (Score $50 - 74$)
  - `High Caution` (Score $< 50$)
- **Transparent Provenance:** Displayed dynamically on campaign detail pages and the user dashboard, rewarding proven builders and cautioning donors against repeat offenders.

### Pillar 7: Backer Dispute Management Mechanism
- **Backer Recourse:** Verified contributors can call `raiseDispute(campaignId, milestoneIndex, reason, evidenceUrl)` if a creator breaches deliverables, commits misrepresentation, or stalls.
- **Automatic Milestone Fund Freeze:** Raising a dispute automatically sets `campaignHasActiveDispute[campaignId] = true`, which pauses all milestone fund disbursements on the smart contract until resolved.
- **Admin Arbitration:** The contract administrator investigates the dispute in the Admin Console and executes `resolveDispute(disputeId, inFavorOfDonors, resolutionNotes)`:
  - If ruled in favor of donors: the milestone is unapproved/reopened and milestone disbursements remain blocked.
  - If ruled in favor of the creator: the dispute flag is cleared and scheduled payouts resume.

### Pillar 8: Comprehensive 9-Tab Admin Dashboard (`/admin`)
1. **Overview Tab:** Real-time macro stats (Platform Vault, Escrow Balance, Active Campaigns, User Base), visual mini-charts, quick navigation.
2. **Campaign Management Tab:** Live search, category/status filters, designated beneficiary verification, and manual escrow release override.
3. **Escrow Vault Tab:** Per-campaign escrow ledger, total funds locked, released amounts, and refunded tallies.
4. **User Directory Tab:** Complete registry of all interacting Ethereum addresses, their created campaigns, contributions, and vault deposits.
5. **Transaction Audit Trail:** Chronological log of smart contract events with block numbers and transaction hashes.
6. **AI Fraud Detection Tab:** Moderation portal displaying AI risk scores, risk levels (Low, Medium, High, Critical), detailed risk factors, and manual flag toggles.
7. **Dispute Management Tab:** Backer dispute complaints, evidence links, and on-chain arbitration controls (`resolveDispute`).
8. **Visual Analytics Tab:** 5 full charts:
   - *Contributions Over Time* (Interactive area chart)
   - *Campaign Status Distribution* (Donut breakdown)
   - *Escrow Capital Breakdown* (Locked vs Released vs Refunded)
   - *Category Capital Distribution* (Agriculture, Healthcare, Education, Tech, etc.)
   - *AI Risk Score Distribution* (Low, Medium, High, Critical risk histogram)
9. **Settings & Dev Tools Tab:** Admin wallet management, contract address audit, and **EVM Time Fast-Forward Tool** (+1 Day, +7 Days, +30 Days) for instant deadline simulation.

---

## 3. Technology Stack

### Frontend Application
- **Framework:** React.js (v18) with Vite
- **Styling:** Tailwind CSS with Custom Theme Palette:
  - Deep Emerald Green: `#14532D`
  - Vibrant Emerald Accent: `#16A34A`
  - Soft Gold Highlight: `#D4A017`
  - Clean Off-White Background: `#F8FAF7`
- **Routing:** React Router DOM (v6)
- **Icons:** Lucide React
- **Web3 Interface:** Ethers.js (v6) + MetaMask Browser Extension

### Blockchain & Smart Contracts
- **Language:** Solidity (`^0.8.20`)
- **Development Tooling:** Hardhat + Hardhat Network Toolbox
- **EVM Environment:** Localhost (Chain ID `31337`, Port `8545`) / Sepolia Testnet (Chain ID `11155111`)
- **Security:** OpenZeppelin-compatible Non-Reentrant Mutex Guard, Checks-Effects-Interactions (CEI) Pattern, Pull-over-Push payments

### Machine Learning / AI Service
- **Framework:** Python 3.11, FastAPI, Uvicorn, scikit-learn, NumPy
- **Fall-back Engine:** Pure JavaScript TF-IDF & Cosine Similarity vectorizer (`frontend/src/services/aiFraudDetector.js`)
- **Algorithms:** N-gram TF-IDF Vectorization, Cosine Similarity duplicate comparison, Statistical Z-score outlier detection

---

## 4. Smart Contract Functions & Security (`Crowdfunding.sol`)

### Core Function Reference

| Function Signature | Modifier | Description |
| :--- | :--- | :--- |
| `createCampaignWithMilestones(...)` | Public | Creates campaign with 1-5 structured milestone goals and designated beneficiary |
| `contribute(uint256 _campaignId)` | External Payable `nonReentrant` | Locks ETH into campaign escrow balance; blocks creator self-contribution |
| `releaseFunds(uint256 _campaignId)` | External `nonReentrant` | Permissionless payout of 100% escrowed ETH to beneficiary upon goal met & deadline passed |
| `claimRefund(uint256 _campaignId)` | External `nonReentrant` | Contributor pulls 100% refund if campaign expired below funding goal |
| `withdrawContribution(uint256 _campaignId)` | External `nonReentrant` | Allows contributor to withdraw active contribution before campaign deadline |
| `submitMilestoneEvidence(...)` | External | Creator anchors completion proof (IPFS URL) for a specific milestone |
| `approveMilestone(...)` | External `onlyAdmin` | Admin approves milestone deliverables |
| `rejectMilestone(...)` | External `onlyAdmin` | Admin rejects milestone deliverables with reason string |
| `releaseMilestoneFunds(...)` | External `nonReentrant` | Permissionless release of approved milestone tranche to beneficiary |
| `createProposal(...)` | External | Contributor or creator registers governance proposal for campaign |
| `voteOnProposal(...)` | External | Contributor votes YES/NO on active governance proposal |
| `executeProposal(...)` | External | Finalizes proposal tally and marks passed/failed on-chain |
| `raiseDispute(...)` | External | Contributor files dispute; automatically freezes milestone fund releases |
| `resolveDispute(...)` | External `onlyAdmin` | Admin arbitrates dispute in favor of donors or creator |
| `getCreatorReputation(...)` | External View | Computes and returns dynamic 0-100 reputation score and badge |
| `depositFunds()` | External Payable `nonReentrant` | Deposits ETH into user's personal platform vault |
| `withdrawVaultDeposit(...)` | External `nonReentrant` | Withdraws ETH from user's personal platform vault back to MetaMask |

### Security Measures:
1. **Reentrancy Protection:** All fund-transferring functions employ a strict mutex flag (`nonReentrant`).
2. **Checks-Effects-Interactions (CEI):** Internal balances (`escrowBalance`, `contributions`, `refundClaimed`, `released`) are zeroed before executing external `.call{value: ...}("")` transfers.
3. **Pull over Push:** Donors withdraw refunds individually (`claimRefund`), eliminating batch-transfer denial-of-service vulnerabilities.
4. **Decentralized Escrow Invariants:** Neither the contract deployer nor platform admins possess any mechanism to withdraw or redirect escrow funds without meeting verified milestone or final goal invariants.

---

## 5. Automated Test Suite (15 Scenarios)

The project includes an extensive Mocha/Chai test suite (`test/Crowdfunding.test.js`) verifying every operational and edge-case condition:

```bash
npx hardhat test
```

### Passing Test Scenarios:
- **Contract Deployment:** Verifies deployer is initialized as admin and platform counters start at zero.
- **Scenario A (Escrow & Permissionless Release):** Verifies funds are locked in escrow; verifies any third party can trigger release after deadline; verifies beneficiary balance increases by the exact contributed amount.
- **Scenario B (Failed Campaign & Contributor Refunds):** Verifies 100% refunds when goal is missed; confirms double-refund attempts revert.
- **Scenario C (Admin Security & Platform Stats):** Confirms non-admins cannot invoke admin functions; checks `getPlatformStats()` and `getAllInteractingUsers()`.
- **Scenario D (Contributor Early Withdrawal):** Contributor withdraws funds before deadline; contract balances adjust accurately.
- **Scenario E (Account Vault):** Add money (`depositFunds()`) and withdraw back to wallet.
- **Scenario F (Edge Cases & Rules):** Rejects self-contribution by creator; rejects contributions after deadline.
- **Scenario G (Milestone-Based Fund Releases):** Verifies milestone creation, evidence submission, admin review, and permissionless tranche release.
- **Scenario H (Donor Governance Proposals & Voting):** Tests proposal creation, contributor voting, double-vote rejection, and execution after duration.
- **Scenario I (Dispute Management & Fund Freezing):** Confirms raising a dispute pauses milestone releases; confirms admin resolution unpauses releases.
- **Scenario J (Creator On-Chain Reputation System):** Validates score calculations and badge tiering based on completed milestones and dispute outcomes.

---

## 6. Installation & Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.x or v20.x+)
- [MetaMask](https://metamask.io/) browser extension
- *(Optional)* Python 3.10+ (for running the external FastAPI AI service; not required due to built-in pure JS fallback)

### Step 1: Install Dependencies
```bash
# Install root Hardhat dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 2: One-Click Launch (Recommended)
Simply run:
```bat
start.bat
```
*(Or in PowerShell: `.\start.ps1`)*

**What `start.bat` executes automatically:**
1. Spawns the local Hardhat Ethereum node on port `8545`.
2. Deploys `Crowdfunding.sol` to the local network.
3. Seeds 5 sample campaigns across Agriculture, Education, Healthcare, and Community Development with active milestones, contributions, proposals, and disputes.
4. Checks for Python and launches the AI Fraud Detection microservice on port `8000` (or delegates to the client-side ML engine).
5. Launches the Vite development server and opens `http://localhost:5173` in your browser.

---

## 7. MetaMask Setup & 3-Account Demo Walkthrough

### Network Configuration:
- **Network Name:** Hardhat Localhost
- **RPC URL:** `http://127.0.0.1:8545`
- **Chain ID:** `31337`
- **Currency Symbol:** `ETH`

### Pre-Funded Test Accounts (10,000 ETH each):

| Account Label | Role | Address | Private Key |
| :--- | :--- | :--- | :--- |
| **Admin Account** | Administrator / Auditor | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| **Campaign Creator** | Farmer / Beneficiary | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| **Donor Account 1** | Backer / Contributor | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb2f9580802c60dd003923a109a2592a8b9c453` |
| **Donor Account 2** | Backer / Contributor | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | `0x7c852118294e51e653712a450583407204e2874b7ecf30453e01712e3e5df30e` |

---

### Step-by-Step Viva / Demo Walkthrough:

#### Demo 1: Multi-Account Switching & Live Balance Synchronization
1. Click the **Profile** button in the top navigation bar.
2. Observe your active account name (e.g., *"Admin Account"*), address, and live ETH balance.
3. Click the pencil icon to rename any account (e.g., *"Prof. Evaluation Wallet"*); notice it persists across page reloads.
4. Click **Switch Wallet** to switch to *"Campaign Creator"* or *"Donor Account 1"*.
5. Notice that balances update in real-time without reloading the page.

#### Demo 2: Milestone-Based Campaign Creation & AI Pre-Check
1. Connect as **Campaign Creator** (`0x7099...`).
2. Navigate to `/create`.
3. Enter title *"IoT Smart Greenhouse for Organic Strawberries"*, Goal: `3.0 ETH`, Category: `Agriculture`.
4. In the **Milestones Builder**, add 3 stages:
   - *Stage 1: Polyhouse Frame & Solar Power (1.0 ETH)*
   - *Stage 2: Hydroponic Trays & Sensors (1.0 ETH)*
   - *Stage 3: Automated Nutrient Dosing & Commissioning (1.0 ETH)*
5. Observe the live Milestone Sum indicator turning green when targets equal 3.0 ETH.
6. Observe the **AI Fraud Risk Checker** giving an instant low-risk score (15/100) with diagnostic explanations.
7. Click **Create Campaign On-Chain** and confirm the MetaMask transaction.

#### Demo 3: Contributions, Evidence Submission & Milestone Release
1. Switch to **Donor Account 1** (`0x3C44...`).
2. Visit the newly created campaign (or Campaign #1 *"Solar-Powered Drip Irrigation"*) and contribute `1.0 ETH`.
3. Switch back to **Campaign Creator** (`0x7099...`).
4. On the campaign page, switch to the **Milestones** tab.
5. Click **Submit Evidence** on Milestone 1, paste an IPFS URL (`https://ipfs.io/ipfs/bafy...`), and confirm.
6. Switch to **Admin Account** (`0xf39F...`).
7. Click **Review Evidence** -> **Approve Milestone**.
8. Notice that the button turns into **Release Milestone Funds**. Click it to transfer that tranche (0.4 ETH) directly from escrow to the farmer's wallet!

#### Demo 4: Donor Voting & Dispute Resolution
1. As **Donor Account 1**, open the **Governance & Voting** tab on Campaign #1.
2. View active proposals or create a new proposal (e.g., *"Request Independent Soil Audit"*).
3. Cast your vote (YES/NO); notice your address is marked as voted.
4. Open the **Disputes** tab on Campaign #2 (*"Seeds & Bio-Fertilizer"*).
5. Observe the active dispute filed by Donor Account 1.
6. Switch to **Admin Account**, open `/admin` -> **Disputes Management** tab.
7. Review the dispute reason, add arbitration notes, and click **Resolve Dispute**.

#### Demo 5: Exploring the Admin Dashboard & Visual Analytics
1. Connect with **Admin Account** (`0xf39F...`) and open `/admin`.
   *(If connected with any other account, notice the secure Unauthorized Access modal with a one-click "Switch to Admin Wallet" button).*
2. Explore the **Visual Analytics** tab to inspect all 5 real-time charts populated with on-chain data:
   - Contributions Area Chart
   - Campaign Status Donut
   - Escrow Capital Breakdown
   - Category Distribution
   - AI Fraud Risk Score Histogram
3. In **AI Fraud Detection**, view the algorithmic risk assessment for every platform campaign.
4. In **Settings & Dev Tools**, test the **EVM Fast-Forward Time Tool** (+7 Days) to advance blockchain time past campaign deadlines and test settlement workflows.

---

## 8. Project Structure

```
FundChain/
│
├── contracts/
│   └── Crowdfunding.sol          # Upgraded Solidity contract (Escrow, Milestones, Voting, Disputes, Reputation)
│
├── scripts/
│   ├── deploy.js                 # Automatic deployment & ABI export script
│   └── seed.js                   # Rich seed script with 5 campaigns, milestones, proposals & disputes
│
├── test/
│   └── Crowdfunding.test.js      # Comprehensive 15-test Hardhat verification suite
│
├── ai-service/                   # Python FastAPI ML Microservice
│   ├── dataset.py                # Curated 18-sample ground truth dataset
│   ├── model.py                  # TF-IDF, Cosine similarity duplicate checker, outlier scorer
│   ├── train.py                  # Evaluation benchmark (100% Accuracy, Precision, Recall)
│   ├── main.py                   # FastAPI REST API endpoints (/analyze-campaign, /health)
│   └── requirements.txt          # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── blockchain/
│   │   │   ├── config.js         # Contract address, network constants & RPC config
│   │   │   ├── contract.js       # Ethers.js v6 wrappers for all contract methods
│   │   │   └── CrowdfundingABI.json # 74 exported contract ABI definitions
│   │   │
│   │   ├── services/
│   │   │   └── aiFraudDetector.js # Hybrid FastAPI caller with client-side ML fallback
│   │   │
│   │   ├── context/
│   │   │   └── Web3Context.jsx   # Global Web3 context, account naming, balance polling
│   │   │
│   │   ├── components/
│   │   │   ├── Navbar.jsx        # Navigation, Account switcher, Name editor, Admin guard
│   │   │   ├── Footer.jsx        # Platform footer
│   │   │   ├── CampaignCard.jsx  # Card with progress bar & category styling
│   │   │   ├── ProgressBar.jsx   # Visual funding percentage bar
│   │   │   ├── NetworkBanner.jsx # Warning banner for wrong network
│   │   │   └── NotificationModal.jsx # Pending/Success/Error transaction feedback modal
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.jsx          # Landing page with stats & BharatAgri showcase
│   │   │   ├── Explore.jsx       # Campaign directory with search & category filters
│   │   │   ├── CreateCampaign.jsx# Creation form with Milestones Builder & AI Risk Pre-Checker
│   │   │   ├── CampaignDetails.jsx # Details view with Milestones, Voting, Disputes & Reputation
│   │   │   ├── Dashboard.jsx     # User dashboard with portfolio stats & creator reputation
│   │   │   ├── AdminDashboard.jsx# 9-tab Admin suite with Visual Analytics & EVM Dev Tools
│   │   │   └── Transactions.jsx  # On-chain smart contract event explorer
│   │   │
│   │   ├── App.jsx               # Application routes
│   │   ├── main.jsx              # React mounting
│   │   └── index.css             # Tailwind base & custom styles
│   │
│   ├── package.json
│   └── vite.config.js
│
├── hardhat.config.js             # Hardhat network configuration
├── package.json                  # Root scripts
├── start.bat                     # Windows one-click launcher
├── start.ps1                     # PowerShell one-click launcher
└── README.md                     # Comprehensive academic report & documentation
```

---

## 9. Conclusion & Academic Contributions

FundChain 3.0 demonstrates a complete, production-ready decentralized crowdfunding ecosystem. By combining **Solidity smart contracts**, **automated escrow invariants**, **staged milestone releases**, **democratic donor governance**, **cryptographic creator reputation**, and **machine learning fraud detection**, the project solves the real-world vulnerabilities of centralized fundraising while providing an intuitive, transparent experience for rural farmers, students, and donors alike.
