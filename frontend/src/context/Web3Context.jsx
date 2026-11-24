import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import {
  connectMetaMask,
  switchNetwork as switchNetworkUtil,
  getAllCampaigns,
  getCampaignById,
  getContributionStatus,
  createCampaignOnChain,
  contributeOnChain,
  withdrawFundsOnChain,
  claimRefundOnChain,
  getAllContractEvents,
  getCampaignContributions,
  getReadOnlyProvider,
  getBrowserProvider,
} from "../blockchain/contract";
import { CHAIN_ID, CONTRACT_ADDRESS, SUPPORTED_NETWORKS } from "../blockchain/config";

const Web3Context = createContext(null);

export function Web3Provider({ children }) {
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(null);
  const [balance, setBalance] = useState("0");
  const [isConnecting, setIsConnecting] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [contractAvailable, setContractAvailable] = useState(true);

  // Transaction feedback state
  const [txState, setTxState] = useState({
    loading: false,
    hash: null,
    message: "",
    error: null,
  });

  const isCorrectNetwork = chainId ? chainId === CHAIN_ID : true;

  // Update user balance
  const updateBalance = useCallback(async (userAddress, provider) => {
    if (!userAddress || !provider) return;
    try {
      const bal = await provider.getBalance(userAddress);
      setBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));
    } catch (err) {
      console.warn("Failed to update balance:", err);
    }
  }, []);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    setTxState((prev) => ({ ...prev, error: null }));
    try {
      const { account: connectedAccount, chainId: connectedChain, provider } = await connectMetaMask();
      setAccount(connectedAccount);
      setChainId(connectedChain);
      await updateBalance(connectedAccount, provider);
      return connectedAccount;
    } catch (error) {
      console.error("Connection error:", error);
      setTxState((prev) => ({ ...prev, error: error.message }));
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [updateBalance]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setAccount("");
    setBalance("0");
    setChainId(null);
  }, []);

  // Switch network
  const handleSwitchNetwork = useCallback(async (targetChainId = CHAIN_ID) => {
    try {
      await switchNetworkUtil(targetChainId);
      setChainId(targetChainId);
    } catch (error) {
      console.error("Network switch error:", error);
      setTxState((prev) => ({ ...prev, error: error.message }));
      throw error;
    }
  }, []);

  // Fetch all campaigns
  const refreshCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    try {
      const data = await getAllCampaigns();
      setCampaigns(data);
      setContractAvailable(true);
    } catch (err) {
      console.warn("Could not fetch campaigns from contract:", err);
      setContractAvailable(false);
    } finally {
      setLoadingCampaigns(false);
    }
  }, []);

  // Listen to MetaMask account and chain changes
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = async (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          const provider = new ethers.BrowserProvider(window.ethereum);
          await updateBalance(accounts[0], provider);
        } else {
          disconnectWallet();
        }
      };

      const handleChainChanged = (newChainHex) => {
        const newChainId = parseInt(newChainHex, 16);
        setChainId(newChainId);
        window.location.reload();
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      // Check if already authorized
      const checkAuthorizedAccount = async () => {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.send("eth_accounts", []);
          if (accounts && accounts.length > 0) {
            setAccount(accounts[0]);
            const network = await provider.getNetwork();
            setChainId(Number(network.chainId));
            await updateBalance(accounts[0], provider);
          }
        } catch (err) {
          console.warn("Failed checking authorized accounts:", err);
        }
      };

      checkAuthorizedAccount();

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
          window.ethereum.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, [disconnectWallet, updateBalance]);

  // Initial fetch of campaigns
  useEffect(() => {
    refreshCampaigns();
  }, [refreshCampaigns]);

  // Helper to obtain a signer from MetaMask
  const getSigner = async () => {
    if (!account) {
      await connectWallet();
    }
    const browserProvider = getBrowserProvider();
    if (!browserProvider) throw new Error("MetaMask is not installed.");
    return browserProvider.getSigner();
  };

  // Create Campaign
  const createCampaign = async (campaignData) => {
    setTxState({ loading: true, hash: null, message: "Creating campaign on blockchain...", error: null });
    try {
      const signer = await getSigner();
      const result = await createCampaignOnChain(signer, campaignData);
      setTxState({
        loading: false,
        hash: result.txHash,
        message: "Campaign successfully created on the blockchain!",
        error: null,
      });
      await refreshCampaigns();
      return result;
    } catch (err) {
      const msg = err.reason || err.data?.message || err.message || "Failed to create campaign";
      setTxState({ loading: false, hash: null, message: "", error: msg });
      throw err;
    }
  };

  // Contribute
  const contribute = async (campaignId, ethAmount) => {
    setTxState({ loading: true, hash: null, message: "Processing contribution...", error: null });
    try {
      const signer = await getSigner();
      const result = await contributeOnChain(signer, campaignId, ethAmount);
      setTxState({
        loading: false,
        hash: result.txHash,
        message: `Successfully contributed ${ethAmount} ETH to campaign #${campaignId}!`,
        error: null,
      });
      await refreshCampaigns();
      const browserProvider = getBrowserProvider();
      if (account && browserProvider) await updateBalance(account, browserProvider);
      return result;
    } catch (err) {
      const msg = err.reason || err.data?.message || err.message || "Contribution transaction failed";
      setTxState({ loading: false, hash: null, message: "", error: msg });
      throw err;
    }
  };

  // Withdraw Funds
  const withdrawFunds = async (campaignId) => {
    setTxState({ loading: true, hash: null, message: "Withdrawing funds from smart contract...", error: null });
    try {
      const signer = await getSigner();
      const result = await withdrawFundsOnChain(signer, campaignId);
      setTxState({
        loading: false,
        hash: result.txHash,
        message: `Successfully withdrawn funds for campaign #${campaignId}!`,
        error: null,
      });
      await refreshCampaigns();
      const browserProvider = getBrowserProvider();
      if (account && browserProvider) await updateBalance(account, browserProvider);
      return result;
    } catch (err) {
      const msg = err.reason || err.data?.message || err.message || "Withdrawal failed";
      setTxState({ loading: false, hash: null, message: "", error: msg });
      throw err;
    }
  };

  // Claim Refund
  const claimRefund = async (campaignId) => {
    setTxState({ loading: true, hash: null, message: "Claiming refund from smart contract...", error: null });
    try {
      const signer = await getSigner();
      const result = await claimRefundOnChain(signer, campaignId);
      setTxState({
        loading: false,
        hash: result.txHash,
        message: `Refund claimed successfully for campaign #${campaignId}!`,
        error: null,
      });
      await refreshCampaigns();
      const browserProvider = getBrowserProvider();
      if (account && browserProvider) await updateBalance(account, browserProvider);
      return result;
    } catch (err) {
      const msg = err.reason || err.data?.message || err.message || "Refund claim failed";
      setTxState({ loading: false, hash: null, message: "", error: msg });
      throw err;
    }
  };

  const clearTxStatus = () => {
    setTxState({ loading: false, hash: null, message: "", error: null });
  };

  return (
    <Web3Context.Provider
      value={{
        account,
        chainId,
        balance,
        isConnecting,
        isConnected: Boolean(account),
        isCorrectNetwork,
        contractAvailable,
        campaigns,
        loadingCampaigns,
        txState,
        clearTxStatus,
        connectWallet,
        disconnectWallet,
        switchNetwork: handleSwitchNetwork,
        refreshCampaigns,
        createCampaign,
        contribute,
        withdrawFunds,
        claimRefund,
        getCampaignById,
        getContributionStatus,
        getAllContractEvents,
        getCampaignContributions,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
}
