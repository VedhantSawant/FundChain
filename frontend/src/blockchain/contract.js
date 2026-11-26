import { ethers } from "ethers";
import CrowdfundingABI from "./CrowdfundingABI.json";
import { CONTRACT_ADDRESS, ADMIN_ADDRESS, CHAIN_ID, SUPPORTED_NETWORKS } from "./config";

/**
 * Returns a fallback Read-Only Provider (JSON-RPC) when MetaMask is not connected
 */
export function getReadOnlyProvider() {
  const currentNetwork = SUPPORTED_NETWORKS[CHAIN_ID] || SUPPORTED_NETWORKS[31337];
  return new ethers.JsonRpcProvider(currentNetwork.rpcUrl);
}

/**
 * Returns BrowserProvider (MetaMask) if available
 */
export function getBrowserProvider() {
  if (typeof window !== "undefined" && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return null;
}

/**
 * Get read-only or signer contract instance
 */
export async function getContract(signerOrProvider = null) {
  if (!signerOrProvider) {
    const browserProvider = getBrowserProvider();
    if (browserProvider) {
      signerOrProvider = browserProvider;
    } else {
      signerOrProvider = getReadOnlyProvider();
    }
  }
  return new ethers.Contract(CONTRACT_ADDRESS, CrowdfundingABI, signerOrProvider);
}

/**
 * Format address to 0x1234...5678
 */
export function shortenAddress(address) {
  if (!address) return "";
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Format wei to ETH string
 */
export function formatEther(wei) {
  if (!wei) return "0.0";
  try {
    return ethers.formatEther(wei);
  } catch {
    return "0.0";
  }
}

/**
 * Parse ETH string to wei
 */
export function parseEther(ethString) {
  try {
    return ethers.parseEther(ethString.toString());
  } catch (err) {
    throw new Error("Invalid ETH value");
  }
}

/**
 * Connect to MetaMask using eth_requestAccounts and return signer + address + available accounts
 */
export async function connectMetaMask() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask is not installed. Please install MetaMask to interact with FundChain.");
  }

  // Explicitly request accounts access via eth_requestAccounts
  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });

  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts found. Please unlock your MetaMask wallet.");
  }

  // Check if user previously had an active account stored in localStorage that is still authorized
  const storedAccount = typeof localStorage !== "undefined" ? localStorage.getItem("fundchain_active_account") : null;
  let activeAccount = accounts[0];
  if (storedAccount && accounts.some((a) => a.toLowerCase() === storedAccount.toLowerCase())) {
    activeAccount = accounts.find((a) => a.toLowerCase() === storedAccount.toLowerCase());
  }

  if (typeof localStorage !== "undefined") {
    localStorage.setItem("fundchain_active_account", activeAccount);
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner(activeAccount);
  const network = await provider.getNetwork();

  return {
    provider,
    signer,
    account: activeAccount,
    availableAccounts: accounts,
    chainId: Number(network.chainId),
  };
}

/**
 * Request MetaMask account selection modal so users can choose or switch between any available accounts
 */
export async function switchMetaMaskAccount(currentAccount = "") {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask is not installed.");
  }

  let selectedFromPermissions = [];

  try {
    // Triggers MetaMask account chooser permission popup
    const permissions = await window.ethereum.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    });

    const accountsPerm = permissions?.find((p) => p.parentCapability === "eth_accounts");
    if (accountsPerm && accountsPerm.caveats) {
      const caveat = accountsPerm.caveats.find(
        (c) => c.type === "filterResponse" || c.type === "restrictReturnedAccounts"
      );
      if (caveat && Array.isArray(caveat.value) && caveat.value.length > 0) {
        selectedFromPermissions = caveat.value.map((a) => a.toLowerCase());
      }
    }
  } catch (err) {
    if (err.code === 4001) {
      throw new Error("Account switch request canceled in MetaMask.");
    }
    console.warn("wallet_requestPermissions fallback to eth_requestAccounts:", err);
  }

  // Request all authorized accounts
  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });

  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts found in MetaMask.");
  }

  // Determine the new active account:
  // 1. If user checked an account in the permission prompt that is different from current, use it
  let targetAccount = accounts[0];
  if (selectedFromPermissions.length > 0) {
    const newlyChosen = selectedFromPermissions.find(
      (a) => a.toLowerCase() !== (currentAccount || "").toLowerCase()
    );
    if (newlyChosen) {
      const matched = accounts.find((a) => a.toLowerCase() === newlyChosen);
      if (matched) targetAccount = matched;
    } else {
      const matched = accounts.find((a) => a.toLowerCase() === selectedFromPermissions[0]);
      if (matched) targetAccount = matched;
    }
  } else if (currentAccount && accounts.length > 1) {
    // If multiple accounts are connected and current is accounts[0], pick an alternative
    const other = accounts.find((a) => a.toLowerCase() !== currentAccount.toLowerCase());
    if (other) targetAccount = other;
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner(targetAccount);
  const network = await provider.getNetwork();

  if (typeof localStorage !== "undefined") {
    localStorage.setItem("fundchain_active_account", targetAccount);
  }

  return {
    provider,
    signer,
    account: targetAccount,
    availableAccounts: accounts,
    chainId: Number(network.chainId),
  };
}

/**
 * Fetch all currently authorized accounts from MetaMask
 */
export async function getAuthorizedAccounts() {
  if (typeof window === "undefined" || !window.ethereum) return [];
  try {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    return accounts || [];
  } catch {
    return [];
  }
}

/**
 * Request network switch to target chainId
 */
export async function switchNetwork(targetChainId = CHAIN_ID) {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask is not installed.");
  }

  const hexChainId = "0x" + targetChainId.toString(16);
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexChainId }],
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      const net = SUPPORTED_NETWORKS[targetChainId];
      if (!net) throw new Error("Network configuration not found");
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: hexChainId,
            chainName: net.name,
            rpcUrls: [net.rpcUrl],
            nativeCurrency: {
              name: net.currencySymbol,
              symbol: net.currencySymbol,
              decimals: 18,
            },
            blockExplorerUrls: net.blockExplorer ? [net.blockExplorer] : null,
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
}

/**
 * Helper to fetch the current on-chain block timestamp (supports EVM fast-forward)
 */
export async function getLatestChainTimestamp(contract = null) {
  try {
    if (CHAIN_ID === 31337) {
      const localBlock = await getReadOnlyProvider().getBlock("latest");
      if (localBlock && localBlock.timestamp) return Number(localBlock.timestamp);
    }
    const prov = contract?.runner?.provider || getReadOnlyProvider();
    const block = await prov.getBlock("latest");
    if (block && block.timestamp) return Number(block.timestamp);
  } catch {
    // Fallback to browser clock
  }
  return Math.floor(Date.now() / 1000);
}

/**
 * Fetch exact live ETH balance for any address directly from the active blockchain node
 */
export async function getAddressBalance(address) {
  if (!address) return "0.000000";
  const prov = CHAIN_ID === 31337 ? getReadOnlyProvider() : (getBrowserProvider() || getReadOnlyProvider());
  const balWei = await prov.getBalance(address);
  return ethers.formatEther(balWei);
}

/**
 * Read function: Fetch all campaigns
 */
export async function getAllCampaigns(provider = null) {
  try {
    const contract = await getContract(provider);
    const [campaigns, chainNow] = await Promise.all([
      contract.getAllCampaigns(),
      getLatestChainTimestamp(contract),
    ]);
    return campaigns.map((c) => formatCampaignData(c, chainNow));
  } catch (error) {
    console.warn("Could not fetch campaigns from contract:", error.message);
    return [];
  }
}

/**
 * Read function: Fetch single campaign by ID
 */
export async function getCampaignById(campaignId, provider = null) {
  const contract = await getContract(provider);
  const [campaign, chainNow] = await Promise.all([
    contract.getCampaign(campaignId),
    getLatestChainTimestamp(contract),
  ]);
  return formatCampaignData(campaign, chainNow);
}

/**
 * Read function: Get contribution status for an address
 */
export async function getContributionStatus(campaignId, contributorAddress, provider = null) {
  if (!contributorAddress) {
    return {
      contributedAmount: "0",
      hasClaimed: false,
      isEligibleForRefund: false,
      canWithdrawNow: false,
      isAwaitingRelease: false,
      isFundsReleased: false,
    };
  }
  const contract = await getContract(provider);
  const res = await contract.getContributionStatus(campaignId, contributorAddress);
  
  return {
    contributedAmount: ethers.formatEther(res[0]),
    hasClaimed: res[1],
    isEligibleForRefund: res[2],
    canWithdrawNow: Boolean(res[3]),
    isAwaitingRelease: Boolean(res[4]),
    isFundsReleased: Boolean(res[5]),
  };
}

/**
 * Read function: Get user's deposited vault balance
 */
export async function getUserVaultBalance(userAddress, provider = null) {
  if (!userAddress) return "0.0";
  try {
    const contract = await getContract(provider);
    const bal = await contract.getVaultBalance(userAddress);
    return ethers.formatEther(bal);
  } catch (err) {
    console.warn("Could not get vault balance:", err.message);
    return "0.0";
  }
}

/**
 * Read function: Get contract administrator address
 */
export async function getAdminAddress(provider = null) {
  try {
    const contract = await getContract(provider);
    return await contract.admin();
  } catch (err) {
    console.warn("Could not fetch admin address from contract, fallback to config:", err);
    return ADMIN_ADDRESS;
  }
}

/**
 * Read function: Get comprehensive platform escrow & user stats for Admin Dashboard
 */
export async function getPlatformStats(provider = null) {
  try {
    const contract = await getContract(provider);
    const stats = await contract.getPlatformStats();
    return {
      totalCampaigns: Number(stats[0]),
      totalEscrowLocked: ethers.formatEther(stats[1]),
      totalContributions: ethers.formatEther(stats[2]),
      totalReleased: ethers.formatEther(stats[3]),
      totalRefunded: ethers.formatEther(stats[4]),
      totalUsers: Number(stats[5]),
      contractBalance: ethers.formatEther(stats[6]),
    };
  } catch (err) {
    console.warn("Could not fetch platform stats:", err);
    return {
      totalCampaigns: 0,
      totalEscrowLocked: "0.0",
      totalContributions: "0.0",
      totalReleased: "0.0",
      totalRefunded: "0.0",
      totalUsers: 0,
      contractBalance: "0.0",
    };
  }
}

/**
 * Read function: Get list of all interacting user addresses
 */
export async function getAllInteractingUsers(provider = null) {
  try {
    const contract = await getContract(provider);
    return await contract.getAllInteractingUsers();
  } catch (err) {
    console.warn("Could not fetch interacting users:", err);
    return [];
  }
}

/**
 * Fast-forward local EVM blockchain time (for testing campaign deadlines)
 * Sends Hardhat JSON-RPC commands directly to local node since MetaMask blocks evm_* methods.
 */
export async function fastForwardTime(seconds) {
  const secs = Math.round(Number(seconds));
  if (!Number.isFinite(secs) || secs <= 0) {
    throw new Error("Invalid time increment specified.");
  }
  const localRpc = getReadOnlyProvider();
  try {
    await localRpc.send("evm_increaseTime", [secs]);
    await localRpc.send("evm_mine", []);
    return true;
  } catch (err) {
    console.warn("Failed fast forwarding EVM time:", err);
    throw new Error(
      err?.code === "NETWORK_ERROR" || err?.message?.includes("fetch")
        ? "Cannot reach local Hardhat node at http://127.0.0.1:8545."
        : err?.reason || err?.message || "EVM time fast-forward is only supported on a local Hardhat node."
    );
  }
}

/**
 * Write function: Create a new campaign with optional milestones and designated beneficiary
 */
export async function createCampaignOnChain(signer, campaignData) {
  if (!signer) throw new Error("Wallet not connected");
  const contract = await getContract(signer);
  const goalWei = ethers.parseEther(campaignData.goalEth || campaignData.goal || "0");
  const deadlineTimestamp = typeof campaignData.deadlineTimestamp === "number"
    ? campaignData.deadlineTimestamp
    : Math.floor(new Date(campaignData.deadline).getTime() / 1000);

  const signerAddress = await signer.getAddress();
  const beneficiaryAddr = campaignData.beneficiary && ethers.isAddress(campaignData.beneficiary)
    ? campaignData.beneficiary.trim()
    : signerAddress;

  let tx;
  if (campaignData.milestones && campaignData.milestones.length > 0) {
    const titles = campaignData.milestones.map((m) => m.title);
    const descriptions = campaignData.milestones.map((m) => m.description || m.title);
    const targets = campaignData.milestones.map((m) => ethers.parseEther(m.targetAmount || "0"));

    tx = await contract.createCampaignWithMilestones(
      campaignData.title,
      campaignData.description,
      goalWei,
      deadlineTimestamp,
      campaignData.category,
      campaignData.imageUrl || "",
      beneficiaryAddr,
      titles,
      descriptions,
      targets
    );
  } else {
    tx = await contract["createCampaign(string,string,uint256,uint256,string,string,address)"](
      campaignData.title,
      campaignData.description,
      goalWei,
      deadlineTimestamp,
      campaignData.category,
      campaignData.imageUrl || "",
      beneficiaryAddr
    );
  }

  const receipt = await tx.wait();

  let newCampaignId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed && parsed.name === "CampaignCreated") {
        newCampaignId = Number(parsed.args.campaignId);
        break;
      }
    } catch {
      // ignore other logs
    }
  }

  return { receipt, txHash: receipt.hash, campaignId: newCampaignId };
}

/**
 * Write function: Contribute ETH to a campaign (stored in escrow)
 */
export async function contributeOnChain(signer, campaignId, ethAmount) {
  if (!signer) throw new Error("Wallet not connected");
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CrowdfundingABI, signer);
  const valueInWei = ethers.parseEther(ethAmount.toString());

  const tx = await contract.contribute(campaignId, { value: valueInWei });
  const receipt = await tx.wait();
  return { receipt, txHash: receipt.hash };
}

/**
 * Write function: Permissionless release of escrowed funds to beneficiary
 */
export async function releaseFundsOnChain(signer, campaignId) {
  if (!signer) throw new Error("Wallet not connected");
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CrowdfundingABI, signer);

  const tx = await contract.releaseFunds(campaignId);
  const receipt = await tx.wait();
  return { receipt, txHash: receipt.hash };
}

/**
 * Write function: Contributor withdraws their contribution (early or refund)
 */
export async function withdrawContributionOnChain(signer, campaignId) {
  if (!signer) throw new Error("Wallet not connected");
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CrowdfundingABI, signer);

  const tx = await contract.withdrawContribution(campaignId);
  const receipt = await tx.wait();
  return { receipt, txHash: receipt.hash };
}

/**
 * Write function: Withdraw funds (backward compatible)
 */
export async function withdrawFundsOnChain(signer, campaignId) {
  return releaseFundsOnChain(signer, campaignId);
}

/**
 * Write function: Claim refund (for contributors of failed campaigns)
 */
export async function claimRefundOnChain(signer, campaignId) {
  if (!signer) throw new Error("Wallet not connected");
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CrowdfundingABI, signer);

  const tx = await contract.claimRefund(campaignId);
  const receipt = await tx.wait();
  return { receipt, txHash: receipt.hash };
}

/**
 * Write function: Deposit ETH into FundChain user vault
 */
export async function depositFundsOnChain(signer, ethAmount) {
  if (!signer) throw new Error("Wallet not connected");
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CrowdfundingABI, signer);
  const valWei = ethers.parseEther(ethAmount.toString());

  const tx = await contract.depositFunds({ value: valWei });
  const receipt = await tx.wait();
  return { receipt, txHash: receipt.hash };
}

/**
 * Write function: Withdraw deposited ETH from FundChain user vault
 */
export async function withdrawVaultDepositOnChain(signer, ethAmount) {
  if (!signer) throw new Error("Wallet not connected");
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CrowdfundingABI, signer);
  const valWei = ethers.parseEther(ethAmount.toString());

  const tx = await contract.withdrawVaultDeposit(valWei);
  const receipt = await tx.wait();
  return { receipt, txHash: receipt.hash };
}

/**
 * Request test ETH on localhost network (funds user with 1.0 ETH from local Hardhat node)
 */
export async function requestLocalFaucet(toAddress) {
  if (!toAddress) throw new Error("Recipient address required");
  const localProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  
  // Default Hardhat Account #0
  const deployer = await localProvider.getSigner(0);
  const tx = await deployer.sendTransaction({
    to: toAddress,
    value: ethers.parseEther("1.0"),
  });
  const receipt = await tx.wait();
  return { receipt, txHash: receipt.hash };
}

/**
 * Query all contract events for Transaction History and Admin Monitoring
 */
export async function getAllContractEvents(provider = null) {
  try {
    const contract = await getContract(provider);
    
    const [
      creationEvents,
      contributionEvents,
      contributionWithdrawnEvents,
      fundsReleasedEvents,
      withdrawalEvents,
      refundEvents,
      depositEvents,
      vaultWithdrawEvents,
    ] = await Promise.all([
      contract.queryFilter(contract.filters.CampaignCreated(), 0, "latest").catch(() => []),
      contract.queryFilter(contract.filters.ContributionReceived(), 0, "latest").catch(() => []),
      contract.queryFilter(contract.filters.ContributionWithdrawn(), 0, "latest").catch(() => []),
      contract.queryFilter(contract.filters.FundsReleased(), 0, "latest").catch(() => []),
      contract.queryFilter(contract.filters.FundsWithdrawn(), 0, "latest").catch(() => []),
      contract.queryFilter(contract.filters.RefundClaimed(), 0, "latest").catch(() => []),
      contract.queryFilter(contract.filters.UserDeposited(), 0, "latest").catch(() => []),
      contract.queryFilter(contract.filters.UserWithdrewDeposit(), 0, "latest").catch(() => []),
    ]);

    const formattedEvents = [];

    for (const event of creationEvents) {
      const block = await event.getBlock().catch(() => null);
      formattedEvents.push({
        type: "CampaignCreated",
        campaignId: Number(event.args.campaignId),
        address: event.args.creator,
        from: event.args.creator,
        to: event.args.beneficiary || event.args.creator,
        beneficiary: event.args.beneficiary || event.args.creator,
        title: event.args.title,
        amount: ethers.formatEther(event.args.goal),
        category: event.args.category,
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: block ? block.timestamp * 1000 : Date.now(),
        status: "Confirmed",
      });
    }

    for (const event of contributionEvents) {
      const block = await event.getBlock().catch(() => null);
      formattedEvents.push({
        type: "ContributionReceived",
        campaignId: Number(event.args.campaignId),
        address: event.args.contributor,
        from: event.args.contributor,
        to: CONTRACT_ADDRESS,
        amount: ethers.formatEther(event.args.amount),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: block ? block.timestamp * 1000 : Date.now(),
        status: "Confirmed",
      });
    }

    for (const event of contributionWithdrawnEvents) {
      const block = await event.getBlock().catch(() => null);
      formattedEvents.push({
        type: "ContributionWithdrawn",
        campaignId: Number(event.args.campaignId),
        address: event.args.contributor,
        from: CONTRACT_ADDRESS,
        to: event.args.contributor,
        amount: ethers.formatEther(event.args.amount),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: block ? block.timestamp * 1000 : Date.now(),
        status: "Confirmed",
      });
    }

    // Dedup FundsReleased vs FundsWithdrawn (FundsReleased is preferred)
    const seenReleaseTxs = new Set();
    for (const event of fundsReleasedEvents) {
      seenReleaseTxs.add(event.transactionHash);
      const block = await event.getBlock().catch(() => null);
      formattedEvents.push({
        type: "FundsReleased",
        campaignId: Number(event.args.campaignId),
        address: event.args.beneficiary,
        from: CONTRACT_ADDRESS,
        to: event.args.beneficiary,
        amount: ethers.formatEther(event.args.amount),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: block ? block.timestamp * 1000 : Date.now(),
        status: "Confirmed",
      });
    }

    for (const event of withdrawalEvents) {
      if (!seenReleaseTxs.has(event.transactionHash)) {
        const block = await event.getBlock().catch(() => null);
        formattedEvents.push({
          type: "FundsReleased",
          campaignId: Number(event.args.campaignId),
          address: event.args.beneficiary || event.args.creator,
          from: CONTRACT_ADDRESS,
          to: event.args.beneficiary || event.args.creator,
          amount: ethers.formatEther(event.args.amount),
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: block ? block.timestamp * 1000 : Date.now(),
          status: "Confirmed",
        });
      }
    }

    for (const event of refundEvents) {
      const block = await event.getBlock().catch(() => null);
      formattedEvents.push({
        type: "RefundClaimed",
        campaignId: Number(event.args.campaignId),
        address: event.args.contributor,
        from: CONTRACT_ADDRESS,
        to: event.args.contributor,
        amount: ethers.formatEther(event.args.amount),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: block ? block.timestamp * 1000 : Date.now(),
        status: "Confirmed",
      });
    }

    for (const event of depositEvents) {
      const block = await event.getBlock().catch(() => null);
      formattedEvents.push({
        type: "UserDeposited",
        campaignId: "-",
        address: event.args.user,
        from: event.args.user,
        to: CONTRACT_ADDRESS,
        amount: ethers.formatEther(event.args.amount),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: block ? block.timestamp * 1000 : Date.now(),
        status: "Confirmed",
      });
    }

    for (const event of vaultWithdrawEvents) {
      const block = await event.getBlock().catch(() => null);
      formattedEvents.push({
        type: "UserWithdrewDeposit",
        campaignId: "-",
        address: event.args.user,
        from: CONTRACT_ADDRESS,
        to: event.args.user,
        amount: ethers.formatEther(event.args.amount),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: block ? block.timestamp * 1000 : Date.now(),
        status: "Confirmed",
      });
    }

    return formattedEvents.sort((a, b) => b.timestamp - a.timestamp);
  } catch (err) {
    console.warn("Could not retrieve contract events:", err);
    return [];
  }
}

/**
 * Query contributions for a single campaign
 */
export async function getCampaignContributions(campaignId, provider = null) {
  try {
    const contract = await getContract(provider);
    const filter = contract.filters.ContributionReceived(campaignId);
    const events = await contract.queryFilter(filter, 0, "latest");
    
    const contributionsList = [];
    for (const event of events) {
      const block = await event.getBlock().catch(() => null);
      contributionsList.push({
        contributor: event.args.contributor,
        amount: ethers.formatEther(event.args.amount),
        txHash: event.transactionHash,
        timestamp: block ? block.timestamp * 1000 : Date.now(),
      });
    }
    return contributionsList.reverse();
  } catch (err) {
    console.warn("Could not query campaign contributions:", err);
    return [];
  }
}


/**
 * Fetch milestones for a campaign
 */
export async function getCampaignMilestones(campaignId, provider = null) {
  try {
    const contract = await getContract(provider);
    const raw = await contract.getCampaignMilestones(campaignId);
    return raw.map((m) => ({
      id: Number(m.id),
      title: m.title,
      description: m.description,
      targetAmount: ethers.formatEther(m.targetAmount),
      completed: Boolean(m.completed),
      approved: Boolean(m.approved),
      released: Boolean(m.released),
      evidenceUrl: m.evidenceUrl || "",
      submittedAt: Number(m.submittedAt),
      approvedAt: Number(m.approvedAt),
    }));
  } catch (err) {
    console.warn("Could not query milestones:", err);
    return [];
  }
}

/**
 * Submit milestone evidence by creator
 */
export async function submitMilestoneEvidenceOnChain(signer, campaignId, milestoneIndex, evidenceUrl) {
  const contract = await getContract(signer);
  const tx = await contract.submitMilestoneEvidence(campaignId, milestoneIndex, evidenceUrl);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, receipt };
}

/**
 * Admin approves milestone
 */
export async function approveMilestoneOnChain(signer, campaignId, milestoneIndex) {
  const contract = await getContract(signer);
  const tx = await contract.approveMilestone(campaignId, milestoneIndex);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, receipt };
}

/**
 * Admin rejects milestone
 */
export async function rejectMilestoneOnChain(signer, campaignId, milestoneIndex, reason) {
  const contract = await getContract(signer);
  const tx = await contract.rejectMilestone(campaignId, milestoneIndex, reason);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, receipt };
}

/**
 * Release approved milestone funds to beneficiary
 */
export async function releaseMilestoneFundsOnChain(signer, campaignId, milestoneIndex) {
  const contract = await getContract(signer);
  const tx = await contract.releaseMilestoneFunds(campaignId, milestoneIndex);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, receipt };
}

/**
 * Create donor voting proposal
 */
export async function createProposalOnChain(signer, campaignId, title, description, durationSeconds = 86400 * 3) {
  const contract = await getContract(signer);
  const tx = await contract.createProposal(campaignId, title, description, durationSeconds);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, receipt };
}

/**
 * Vote on a proposal
 */
export async function voteOnProposalOnChain(signer, proposalId, support) {
  const contract = await getContract(signer);
  const tx = await contract.voteOnProposal(proposalId, support);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, receipt };
}

/**
 * Execute proposal after deadline
 */
export async function executeProposalOnChain(signer, proposalId) {
  const contract = await getContract(signer);
  const tx = await contract.executeProposal(proposalId);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, receipt };
}

/**
 * Get proposals for a campaign
 */
export async function getCampaignProposals(campaignId, provider = null) {
  try {
    const contract = await getContract(provider);
    const [raw, chainNow] = await Promise.all([
      contract.getCampaignProposals(campaignId),
      getLatestChainTimestamp(contract),
    ]);
    return raw.map((p) => ({
      id: Number(p.id),
      campaignId: Number(p.campaignId),
      title: p.title,
      description: p.description,
      votesFor: Number(p.votesFor),
      votesAgainst: Number(p.votesAgainst),
      deadline: Number(p.deadline),
      executed: Boolean(p.executed),
      passed: Boolean(p.passed),
      proposer: p.proposer,
      isExpired: chainNow >= Number(p.deadline),
    }));
  } catch (err) {
    console.warn("Could not query proposals:", err);
    return [];
  }
}

/**
 * Raise a dispute
 */
export async function raiseDisputeOnChain(signer, campaignId, milestoneIndex, reason, evidenceUrl = "") {
  const contract = await getContract(signer);
  const tx = await contract.raiseDispute(campaignId, milestoneIndex, reason, evidenceUrl);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, receipt };
}

/**
 * Resolve a dispute (Admin only)
 */
export async function resolveDisputeOnChain(signer, disputeId, inFavorOfDonors, resolutionNotes) {
  const contract = await getContract(signer);
  const tx = await contract.resolveDispute(disputeId, inFavorOfDonors, resolutionNotes);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, receipt };
}

/**
 * Get disputes for a campaign
 */
export async function getCampaignDisputes(campaignId, provider = null) {
  try {
    const contract = await getContract(provider);
    const raw = await contract.getCampaignDisputes(campaignId);
    return raw.map((d) => ({
      id: Number(d.id),
      campaignId: Number(d.campaignId),
      milestoneIndex: Number(d.milestoneIndex),
      complainant: d.complainant,
      reason: d.reason,
      evidenceUrl: d.evidenceUrl,
      createdAt: Number(d.createdAt),
      resolved: Boolean(d.resolved),
      inFavorOfDonors: Boolean(d.inFavorOfDonors),
      resolutionNotes: d.resolutionNotes || "",
    }));
  } catch (err) {
    console.warn("Could not query campaign disputes:", err);
    return [];
  }
}

/**
 * Get all disputes across platform
 */
export async function getAllDisputes(provider = null) {
  try {
    const contract = await getContract(provider);
    const raw = await contract.getAllDisputes();
    return raw.map((d) => ({
      id: Number(d.id),
      campaignId: Number(d.campaignId),
      milestoneIndex: Number(d.milestoneIndex),
      complainant: d.complainant,
      reason: d.reason,
      evidenceUrl: d.evidenceUrl,
      createdAt: Number(d.createdAt),
      resolved: Boolean(d.resolved),
      inFavorOfDonors: Boolean(d.inFavorOfDonors),
      resolutionNotes: d.resolutionNotes || "",
    }));
  } catch (err) {
    console.warn("Could not query all disputes:", err);
    return [];
  }
}

/**
 * Query verifiable on-chain reputation for a creator address
 */
export async function getCreatorReputation(creatorAddress, provider = null) {
  try {
    const contract = await getContract(provider);
    const raw = await contract.getCreatorReputation(creatorAddress);
    return {
      score: Number(raw[0]),
      totalCreated: Number(raw[1]),
      successfulCampaigns: Number(raw[2]),
      milestonesCompleted: Number(raw[3]),
      disputesAgainst: Number(raw[4]),
      badge: raw[5] || "New Creator",
    };
  } catch (err) {
    console.warn("Could not query creator reputation:", err);
    return {
      score: 75,
      totalCreated: 0,
      successfulCampaigns: 0,
      milestonesCompleted: 0,
      disputesAgainst: 0,
      badge: "New Creator",
    };
  }
}

/**
 * Helper to structure Campaign struct into clean JavaScript object with accurate Escrow statuses
 */
export function formatCampaignData(c, chainTimestamp = null) {
  const goalEth = ethers.formatEther(c.goal || 0);
  const raisedEth = ethers.formatEther(c.amountRaised || 0);
  const escrowEth = ethers.formatEther(c.escrowBalance || 0);
  const releasedEth = ethers.formatEther(c.totalReleased || 0);
  const refundedEth = ethers.formatEther(c.totalRefunded || 0);

  const deadlineNum = Number(c.deadline);
  const now = chainTimestamp || Math.floor(Date.now() / 1000);

  const goalFloat = parseFloat(goalEth);
  const raisedFloat = parseFloat(raisedEth);
  const progressPercent = goalFloat > 0 ? Math.min(100, Math.round((raisedFloat / goalFloat) * 100)) : 0;

  const isExpired = now >= deadlineNum;
  const isGoalReached = raisedFloat >= goalFloat;
  const isReleased = Boolean(c.fundsReleased || c.withdrawn);

  let status = "Active";
  let statusBadge = "Funds Locked in Escrow";

  if (isReleased) {
    status = "Funds Released";
    statusBadge = "Funds Released to Beneficiary";
  } else if (!isExpired) {
    if (isGoalReached) {
      status = "Goal Achieved";
      statusBadge = "Goal Reached (Funds Locked in Escrow)";
    } else {
      status = "Active";
      statusBadge = "Active (Funds in Escrow)";
    }
  } else {
    // Expired
    if (isGoalReached) {
      status = "Awaiting Release";
      statusBadge = "Awaiting Release to Beneficiary";
    } else {
      if (parseFloat(escrowEth) > 0) {
        status = "Refund Available";
        statusBadge = "Refund Available";
      } else {
        status = "Refunded";
        statusBadge = "All Funds Refunded";
      }
    }
  }

  return {
    id: Number(c.id),
    creator: c.creator,
    beneficiary: c.beneficiary || c.creator,
    title: c.title,
    description: c.description,
    goal: goalEth,
    amountRaised: raisedEth,
    escrowBalance: escrowEth,
    totalReleased: releasedEth,
    totalRefunded: refundedEth,
    deadline: deadlineNum,
    chainTimestamp: now,
    createdAt: Number(c.createdAt || (deadlineNum - 86400 * 14)),
    category: c.category || "General",
    imageUrl: c.imageUrl || "",
    withdrawn: Boolean(c.withdrawn),
    fundsReleased: isReleased,
    progressPercent,
    status,
    statusBadge,
    isExpired,
    isGoalReached,
    canReleaseFunds: isExpired && isGoalReached && !isReleased,
  };
}
