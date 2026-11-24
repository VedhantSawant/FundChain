import { ethers } from "ethers";
import CrowdfundingABI from "./CrowdfundingABI.json";
import { CONTRACT_ADDRESS, CHAIN_ID, SUPPORTED_NETWORKS } from "./config";

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
 * Connect to MetaMask and return signer + address
 */
export async function connectMetaMask() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask is not installed. Please install MetaMask to interact with FundChain.");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts found. Please unlock your MetaMask wallet.");
  }

  const signer = await provider.getSigner();
  const network = await provider.getNetwork();

  return {
    provider,
    signer,
    account: accounts[0],
    chainId: Number(network.chainId),
  };
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
    // Error code 4902 indicates that the network is not added to MetaMask
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
 * Read function: Fetch all campaigns
 */
export async function getAllCampaigns(provider = null) {
  try {
    const contract = await getContract(provider);
    const campaigns = await contract.getAllCampaigns();
    return campaigns.map(formatCampaignData);
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
  const campaign = await contract.getCampaign(campaignId);
  return formatCampaignData(campaign);
}

/**
 * Read function: Get contribution status for an address
 */
export async function getContributionStatus(campaignId, contributorAddress, provider = null) {
  if (!contributorAddress) {
    return { contributedAmount: "0", hasClaimed: false, isEligibleForRefund: false };
  }
  const contract = await getContract(provider);
  const [contributedAmount, hasClaimed, isEligibleForRefund] = await contract.getContributionStatus(
    campaignId,
    contributorAddress
  );
  return {
    contributedAmount: ethers.formatEther(contributedAmount),
    hasClaimed,
    isEligibleForRefund,
  };
}

/**
 * Write function: Create a new campaign
 */
export async function createCampaignOnChain(signer, { title, description, goalEth, deadlineTimestamp, category, imageUrl }) {
  if (!signer) throw new Error("Wallet not connected");
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CrowdfundingABI, signer);
  const goalInWei = ethers.parseEther(goalEth.toString());
  
  const tx = await contract.createCampaign(
    title,
    description,
    goalInWei,
    deadlineTimestamp,
    category,
    imageUrl || ""
  );
  const receipt = await tx.wait();
  
  // Find CampaignCreated event to retrieve ID
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
 * Write function: Contribute ETH to a campaign
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
 * Write function: Withdraw funds (for creator)
 */
export async function withdrawFundsOnChain(signer, campaignId) {
  if (!signer) throw new Error("Wallet not connected");
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CrowdfundingABI, signer);

  const tx = await contract.withdrawFunds(campaignId);
  const receipt = await tx.wait();
  return { receipt, txHash: receipt.hash };
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
 * Query all contract events for the Transaction History page
 */
export async function getAllContractEvents(provider = null) {
  try {
    const contract = await getContract(provider);
    
    // Query each event type from genesis to latest
    const [creationEvents, contributionEvents, withdrawalEvents, refundEvents] = await Promise.all([
      contract.queryFilter(contract.filters.CampaignCreated(), 0, "latest").catch(() => []),
      contract.queryFilter(contract.filters.ContributionReceived(), 0, "latest").catch(() => []),
      contract.queryFilter(contract.filters.FundsWithdrawn(), 0, "latest").catch(() => []),
      contract.queryFilter(contract.filters.RefundClaimed(), 0, "latest").catch(() => []),
    ]);

    const formattedEvents = [];

    for (const event of creationEvents) {
      const block = await event.getBlock().catch(() => null);
      formattedEvents.push({
        type: "CampaignCreated",
        campaignId: Number(event.args.campaignId),
        address: event.args.creator,
        title: event.args.title,
        amount: ethers.formatEther(event.args.goal),
        category: event.args.category,
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: block ? block.timestamp * 1000 : Date.now(),
      });
    }

    for (const event of contributionEvents) {
      const block = await event.getBlock().catch(() => null);
      formattedEvents.push({
        type: "ContributionReceived",
        campaignId: Number(event.args.campaignId),
        address: event.args.contributor,
        amount: ethers.formatEther(event.args.amount),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: block ? block.timestamp * 1000 : Date.now(),
      });
    }

    for (const event of withdrawalEvents) {
      const block = await event.getBlock().catch(() => null);
      formattedEvents.push({
        type: "FundsWithdrawn",
        campaignId: Number(event.args.campaignId),
        address: event.args.creator,
        amount: ethers.formatEther(event.args.amount),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: block ? block.timestamp * 1000 : Date.now(),
      });
    }

    for (const event of refundEvents) {
      const block = await event.getBlock().catch(() => null);
      formattedEvents.push({
        type: "RefundClaimed",
        campaignId: Number(event.args.campaignId),
        address: event.args.contributor,
        amount: ethers.formatEther(event.args.amount),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: block ? block.timestamp * 1000 : Date.now(),
      });
    }

    // Sort descending by timestamp / blockNumber
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
 * Helper to structure Campaign struct into clean JavaScript object
 */
export function formatCampaignData(c) {
  const goalEth = ethers.formatEther(c.goal || 0);
  const raisedEth = ethers.formatEther(c.amountRaised || 0);
  const deadlineNum = Number(c.deadline);
  const now = Math.floor(Date.now() / 1000);

  const goalFloat = parseFloat(goalEth);
  const raisedFloat = parseFloat(raisedEth);
  const progressPercent = goalFloat > 0 ? Math.min(100, Math.round((raisedFloat / goalFloat) * 100)) : 0;

  const isExpired = now >= deadlineNum;
  const isGoalReached = raisedFloat >= goalFloat;

  let status = "Active";
  if (c.withdrawn) {
    status = "Withdrawn";
  } else if (isExpired && isGoalReached) {
    status = "Successful";
  } else if (isExpired && !isGoalReached) {
    status = "Failed";
  } else if (!isExpired && isGoalReached) {
    status = "Funded";
  }

  return {
    id: Number(c.id),
    creator: c.creator,
    title: c.title,
    description: c.description,
    goal: goalEth,
    amountRaised: raisedEth,
    deadline: deadlineNum,
    category: c.category || "General",
    imageUrl: c.imageUrl || "",
    withdrawn: Boolean(c.withdrawn),
    progressPercent,
    status,
    isExpired,
    isGoalReached,
  };
}
