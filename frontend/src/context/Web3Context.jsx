import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import {
  connectMetaMask,
  switchMetaMaskAccount,
  switchNetwork as switchNetworkUtil,
  getAllCampaigns,
  getCampaignById,
  getContributionStatus,
  createCampaignOnChain,
  contributeOnChain,
  withdrawContributionOnChain,
  withdrawFundsOnChain,
  releaseFundsOnChain,
  claimRefundOnChain,
  depositFundsOnChain,
  withdrawVaultDepositOnChain,
  getUserVaultBalance,
  getAdminAddress,
  getPlatformStats,
  getAllInteractingUsers,
  fastForwardTime,
  requestLocalFaucet,
  getAllContractEvents,
  getCampaignContributions,
  getReadOnlyProvider,
  getBrowserProvider,
} from "../blockchain/contract";
import { CHAIN_ID, CONTRACT_ADDRESS, ADMIN_ADDRESS, SUPPORTED_NETWORKS } from "../blockchain/config";

const Web3Context = createContext(null);

export function Web3Provider({ children }) {
  const [account, setAccount] = useState("");
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [chainId, setChainId] = useState(null);
  const [balance, setBalance] = useState("0");
  const [vaultBalance, setVaultBalance] = useState("0");
  const [isConnecting, setIsConnecting] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [contractAvailable, setContractAvailable] = useState(true);
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
  const [adminAddress, setAdminAddress] = useState(ADMIN_ADDRESS || "");

  const isAdmin = Boolean(
    account && adminAddress && account.toLowerCase() === adminAddress.toLowerCase()
  );

  // Fetch admin address on mount
  useEffect(() => {
    async function loadAdmin() {
      try {
        const addr = await getAdminAddress();
        if (addr) setAdminAddress(addr);
      } catch (err) {
        console.warn("Could not query admin:", err);
      }
    }
    loadAdmin();
  }, []);

  // Transaction feedback state
  const [txState, setTxState] = useState({
    loading: false,
    hash: null,
    message: "",
    error: null,
  });

  const isCorrectNetwork = chainId ? chainId === CHAIN_ID : true;

  // Update user balance (both wallet ETH and vault deposit)
  const updateBalance = useCallback(async (userAddress, provider) => {
    if (!userAddress || !provider) return;
    try {
      const bal = await provider.getBalance(userAddress);
      setBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));
      
      const vBal = await getUserVaultBalance(userAddress, provider);
      setVaultBalance(parseFloat(vBal).toFixed(4));
    } catch (err) {
      console.warn("Failed to update balance:", err);
    }
  }, []);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    setTxState((prev) => ({ ...prev, error: null }));
    try {
      const { account: connectedAccount, chainId: connectedChain, provider, availableAccounts: accs } = await connectMetaMask();
      setAccount(connectedAccount);
      setAvailableAccounts(accs || [connectedAccount]);
      setChainId(connectedChain);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("fundchain_active_account", connectedAccount);
      }
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

  // Switch MetaMask Account
  const switchWallet = useCallback(async () => {
    setIsConnecting(true);
    setTxState((prev) => ({ ...prev, error: null }));
    try {
      const { account: newAccount, chainId: newChain, provider, availableAccounts: accs } = await switchMetaMaskAccount(account);
      setAccount(newAccount);
      setAvailableAccounts(accs || [newAccount]);
      setChainId(newChain);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("fundchain_active_account", newAccount);
      }
      await updateBalance(newAccount, provider);
      return newAccount;
    } catch (error) {
      console.error("Switch account error:", error);
      setTxState((prev) => ({ ...prev, error: error.message }));
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [account, updateBalance]);

  // Switch active account directly from available authorized accounts
  const selectAccount = useCallback(async (targetAccount) => {
    if (!targetAccount) return;
    try {
      setAccount(targetAccount);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("fundchain_active_account", targetAccount);
      }
      const browserProvider = getBrowserProvider();
      if (browserProvider) {
        await updateBalance(targetAccount, browserProvider);
      }
    } catch (err) {
      console.warn("Failed switching active account:", err);
    }
  }, [updateBalance]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setAccount("");
    setAvailableAccounts([]);
    setBalance("0");
    setVaultBalance("0");
    setChainId(null);
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("fundchain_active_account");
    }
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
        if (accounts && accounts.length > 0) {
          setAvailableAccounts(accounts);
          const storedAccount = typeof localStorage !== "undefined" ? localStorage.getItem("fundchain_active_account") : null;
          let active = accounts[0];
          if (storedAccount && accounts.some((a) => a.toLowerCase() === storedAccount.toLowerCase())) {
            active = accounts.find((a) => a.toLowerCase() === storedAccount.toLowerCase());
          } else {
            if (typeof localStorage !== "undefined") {
              localStorage.setItem("fundchain_active_account", active);
            }
          }
          setAccount(active);
          const provider = new ethers.BrowserProvider(window.ethereum);
          await updateBalance(active, provider);
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
            setAvailableAccounts(accounts);
            const storedAccount = typeof localStorage !== "undefined" ? localStorage.getItem("fundchain_active_account") : null;
            let active = accounts[0];
            if (storedAccount && accounts.some((a) => a.toLowerCase() === storedAccount.toLowerCase())) {
              active = accounts.find((a) => a.toLowerCase() === storedAccount.toLowerCase());
            } else {
              if (typeof localStorage !== "undefined") {
                localStorage.setItem("fundchain_active_account", active);
              }
            }
            setAccount(active);
            const network = await provider.getNetwork();
            setChainId(Number(network.chainId));
            await updateBalance(active, provider);
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
    return browserProvider.getSigner(account);
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

  // Contributor Withdraws Contribution (early or refund)
  const withdrawContribution = async (campaignId) => {
    setTxState({ loading: true, hash: null, message: "Processing contribution withdrawal...", error: null });
    try {
      const signer = await getSigner();
      const result = await withdrawContributionOnChain(signer, campaignId);
      setTxState({
        loading: false,
        hash: result.txHash,
        message: `Successfully withdrew your contribution from campaign #${campaignId}!`,
        error: null,
      });
      await refreshCampaigns();
      const browserProvider = getBrowserProvider();
      if (account && browserProvider) await updateBalance(account, browserProvider);
      return result;
    } catch (err) {
      const msg = err.reason || err.data?.message || err.message || "Contribution withdrawal failed";
      setTxState({ loading: false, hash: null, message: "", error: msg });
      throw err;
    }
  };

  // Permissionless Release of Escrowed Funds to Beneficiary
  const releaseFunds = async (campaignId) => {
    setTxState({ loading: true, hash: null, message: "Releasing escrowed funds to beneficiary...", error: null });
    try {
      const signer = await getSigner();
      const result = await releaseFundsOnChain(signer, campaignId);
      setTxState({
        loading: false,
        hash: result.txHash,
        message: `Successfully released escrowed funds for campaign #${campaignId} to the beneficiary!`,
        error: null,
      });
      await refreshCampaigns();
      const browserProvider = getBrowserProvider();
      if (account && browserProvider) await updateBalance(account, browserProvider);
      return result;
    } catch (err) {
      const msg = err.reason || err.data?.message || err.message || "Release transaction failed";
      setTxState({ loading: false, hash: null, message: "", error: msg });
      throw err;
    }
  };

  // Creator Withdraws Collected Funds (calls releaseFunds)
  const withdrawFunds = async (campaignId) => {
    return releaseFunds(campaignId);
  };

  // Fast-forward local EVM time for deadline testing
  const fastForward = async (seconds) => {
    try {
      await fastForwardTime(seconds);
      await refreshCampaigns();
      const browserProvider = getBrowserProvider();
      if (account && browserProvider) await updateBalance(account, browserProvider);
      return true;
    } catch (err) {
      console.warn("Fast-forward time failed:", err);
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

  // Deposit funds into Vault
  const depositFunds = async (ethAmount) => {
    setTxState({ loading: true, hash: null, message: "Depositing ETH into FundChain Vault...", error: null });
    try {
      const signer = await getSigner();
      const result = await depositFundsOnChain(signer, ethAmount);
      setTxState({
        loading: false,
        hash: result.txHash,
        message: `Successfully deposited ${ethAmount} ETH into your FundChain Vault!`,
        error: null,
      });
      const browserProvider = getBrowserProvider();
      if (account && browserProvider) await updateBalance(account, browserProvider);
      return result;
    } catch (err) {
      const msg = err.reason || err.data?.message || err.message || "Deposit transaction failed";
      setTxState({ loading: false, hash: null, message: "", error: msg });
      throw err;
    }
  };

  // Withdraw funds from Vault
  const withdrawVaultDeposit = async (ethAmount) => {
    setTxState({ loading: true, hash: null, message: "Withdrawing ETH from FundChain Vault...", error: null });
    try {
      const signer = await getSigner();
      const result = await withdrawVaultDepositOnChain(signer, ethAmount);
      setTxState({
        loading: false,
        hash: result.txHash,
        message: `Successfully withdrew ${ethAmount} ETH from Vault to your MetaMask wallet!`,
        error: null,
      });
      const browserProvider = getBrowserProvider();
      if (account && browserProvider) await updateBalance(account, browserProvider);
      return result;
    } catch (err) {
      const msg = err.reason || err.data?.message || err.message || "Vault withdrawal failed";
      setTxState({ loading: false, hash: null, message: "", error: msg });
      throw err;
    }
  };

  // Request Localhost Faucet
  const requestFaucet = async () => {
    setTxState({ loading: true, hash: null, message: "Requesting 1.0 test ETH from local node...", error: null });
    try {
      const result = await requestLocalFaucet(account);
      setTxState({
        loading: false,
        hash: result.txHash,
        message: "Successfully received 1.0 test ETH from local faucet!",
        error: null,
      });
      const browserProvider = getBrowserProvider();
      if (account && browserProvider) await updateBalance(account, browserProvider);
      return result;
    } catch (err) {
      const msg = err.message || "Failed to request test ETH from local node";
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
        availableAccounts,
        selectAccount,
        adminAddress,
        isAdmin,
        chainId,
        balance,
        vaultBalance,
        isConnecting,
        isConnected: Boolean(account),
        isCorrectNetwork,
        contractAvailable,
        campaigns,
        loadingCampaigns,
        txState,
        clearTxStatus,
        connectWallet,
        switchWallet,
        disconnectWallet,
        switchNetwork: handleSwitchNetwork,
        refreshCampaigns,
        createCampaign,
        contribute,
        withdrawContribution,
        withdrawFunds,
        releaseFunds,
        claimRefund,
        depositFunds,
        withdrawVaultDeposit,
        requestFaucet,
        fastForward,
        getCampaignById,
        getContributionStatus,
        getUserVaultBalance,
        getPlatformStats,
        getAllInteractingUsers,
        getAllContractEvents,
        getCampaignContributions,
        isAddMoneyOpen,
        openAddMoneyModal: () => setIsAddMoneyOpen(true),
        closeAddMoneyModal: () => setIsAddMoneyOpen(false),
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
