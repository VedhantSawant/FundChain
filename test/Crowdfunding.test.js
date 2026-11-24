import { expect } from "chai";
import hre from "hardhat";
import helpers from "@nomicfoundation/hardhat-network-helpers";

const { ethers } = hre;
const { time } = helpers;

describe("FundChain Crowdfunding Smart Contract", function () {
  let crowdfunding;
  let owner, walletA, walletB, walletC, walletD;

  beforeEach(async function () {
    [owner, walletA, walletB, walletC, walletD] = await ethers.getSigners();
    const Crowdfunding = await ethers.getContractFactory("Crowdfunding");
    crowdfunding = await Crowdfunding.deploy();
    await crowdfunding.waitForDeployment();
  });

  describe("Contract Deployment & Initial State", function () {
    it("Should start with 0 campaigns", async function () {
      expect(await crowdfunding.getCampaignCount()).to.equal(0);
      const all = await crowdfunding.getAllCampaigns();
      expect(all.length).to.equal(0);
    });
  });

  describe("Scenario A: Successful Campaign", function () {
    it("Executes full lifecycle: creation, goal met, deadline passes, creator withdraws funds", async function () {
      const currentTime = await time.latest();
      const deadline = currentTime + 3600; // 1 hour in future
      const goal = ethers.parseEther("1.0");

      // 1. Wallet A creates campaign with 1 ETH goal
      const tx = await crowdfunding.connect(walletA).createCampaign(
        "Solar Irrigation Pump for Farmers",
        "Empowering 50 smallholder farmers with solar-powered irrigation pumps.",
        goal,
        deadline,
        "Agriculture",
        "https://images.unsplash.com/photo-1592982537447-7440770cbfc9"
      );

      await expect(tx)
        .to.emit(crowdfunding, "CampaignCreated")
        .withArgs(
          1,
          walletA.address,
          "Solar Irrigation Pump for Farmers",
          goal,
          deadline,
          "Agriculture",
          "https://images.unsplash.com/photo-1592982537447-7440770cbfc9"
        );

      expect(await crowdfunding.getCampaignCount()).to.equal(1);
      const campaign = await crowdfunding.getCampaign(1);
      expect(campaign.creator).to.equal(walletA.address);
      expect(campaign.goal).to.equal(goal);
      expect(campaign.amountRaised).to.equal(0);
      expect(campaign.withdrawn).to.equal(false);

      // 2. Wallet B contributes 0.4 ETH
      const contribB = ethers.parseEther("0.4");
      await expect(
        crowdfunding.connect(walletB).contribute(1, { value: contribB })
      )
        .to.emit(crowdfunding, "ContributionReceived")
        .withArgs(1, walletB.address, contribB);

      // 3. Wallet C contributes 0.7 ETH (total: 1.1 ETH >= 1.0 ETH goal)
      const contribC = ethers.parseEther("0.7");
      await expect(
        crowdfunding.connect(walletC).contribute(1, { value: contribC })
      )
        .to.emit(crowdfunding, "ContributionReceived")
        .withArgs(1, walletC.address, contribC);

      const updatedCampaign = await crowdfunding.getCampaign(1);
      expect(updatedCampaign.amountRaised).to.equal(ethers.parseEther("1.1"));
      expect(await crowdfunding.getContribution(1, walletB.address)).to.equal(contribB);
      expect(await crowdfunding.getContribution(1, walletC.address)).to.equal(contribC);
      expect(await crowdfunding.getContributorsCount(1)).to.equal(2);

      // Verify cannot withdraw before deadline
      await expect(
        crowdfunding.connect(walletA).withdrawFunds(1)
      ).to.be.revertedWith("Cannot withdraw before campaign deadline");

      // 4. Deadline passes
      await time.increaseTo(deadline + 10);

      // Verify contributor cannot refund when goal was achieved
      await expect(
        crowdfunding.connect(walletB).claimRefund(1)
      ).to.be.revertedWith("Funding goal was reached; refunds not available");

      // 5. Wallet A withdraws the funds
      const initialBalanceA = await ethers.provider.getBalance(walletA.address);
      const withdrawTx = await crowdfunding.connect(walletA).withdrawFunds(1);
      const receipt = await withdrawTx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      await expect(withdrawTx)
        .to.emit(crowdfunding, "FundsWithdrawn")
        .withArgs(1, walletA.address, ethers.parseEther("1.1"));

      const finalBalanceA = await ethers.provider.getBalance(walletA.address);
      expect(finalBalanceA + gasUsed - initialBalanceA).to.equal(ethers.parseEther("1.1"));

      // Verify campaign status updated
      const finalCampaign = await crowdfunding.getCampaign(1);
      expect(finalCampaign.withdrawn).to.equal(true);

      // Cannot withdraw a second time
      await expect(
        crowdfunding.connect(walletA).withdrawFunds(1)
      ).to.be.revertedWith("Funds have already been withdrawn");
    });
  });

  describe("Scenario B: Failed Campaign and Automatic Refunds", function () {
    it("Executes failed campaign flow: goal not met, deadline passes, contributors claim refunds", async function () {
      const currentTime = await time.latest();
      const deadline = currentTime + 3600;
      const goal = ethers.parseEther("2.0");

      // 1. Wallet A creates campaign with 2 ETH goal
      await crowdfunding.connect(walletA).createCampaign(
        "Organic Fertilizer Subsidy for Vidarbha Farmers",
        "Providing organic compost and soil bio-fertilizers.",
        goal,
        deadline,
        "Agriculture",
        ""
      );

      // 2. Wallet B contributes 0.5 ETH
      const contribB = ethers.parseEther("0.5");
      await crowdfunding.connect(walletB).contribute(1, { value: contribB });

      // 3. Wallet C contributes 0.3 ETH (Total: 0.8 ETH < 2.0 ETH goal)
      const contribC = ethers.parseEther("0.3");
      await crowdfunding.connect(walletC).contribute(1, { value: contribC });

      // Verify cannot claim refund before deadline
      await expect(
        crowdfunding.connect(walletB).claimRefund(1)
      ).to.be.revertedWith("Cannot claim refund before campaign deadline");

      // 4. Deadline passes
      await time.increaseTo(deadline + 60);

      // Verify creator CANNOT withdraw since goal was not met
      await expect(
        crowdfunding.connect(walletA).withdrawFunds(1)
      ).to.be.revertedWith("Funding goal has not been reached");

      // Check contribution status
      const statusB = await crowdfunding.getContributionStatus(1, walletB.address);
      expect(statusB.contributedAmount).to.equal(contribB);
      expect(statusB.hasClaimed).to.equal(false);
      expect(statusB.isEligibleForRefund).to.equal(true);

      // 5. Wallet B claims refund of 0.5 ETH
      const initialBalB = await ethers.provider.getBalance(walletB.address);
      const refundTxB = await crowdfunding.connect(walletB).claimRefund(1);
      const receiptB = await refundTxB.wait();
      const gasB = receiptB.gasUsed * receiptB.gasPrice;

      await expect(refundTxB)
        .to.emit(crowdfunding, "RefundClaimed")
        .withArgs(1, walletB.address, contribB);

      const finalBalB = await ethers.provider.getBalance(walletB.address);
      expect(finalBalB + gasB - initialBalB).to.equal(contribB);

      // 6. Wallet C claims refund of 0.3 ETH
      const initialBalC = await ethers.provider.getBalance(walletC.address);
      const refundTxC = await crowdfunding.connect(walletC).claimRefund(1);
      const receiptC = await refundTxC.wait();
      const gasC = receiptC.gasUsed * receiptC.gasPrice;

      await expect(refundTxC)
        .to.emit(crowdfunding, "RefundClaimed")
        .withArgs(1, walletC.address, contribC);

      const finalBalC = await ethers.provider.getBalance(walletC.address);
      expect(finalBalC + gasC - initialBalC).to.equal(contribC);

      // Verify Wallet B cannot claim refund a second time
      await expect(
        crowdfunding.connect(walletB).claimRefund(1)
      ).to.be.revertedWith("Refund has already been claimed");

      // Verify Wallet D (who never contributed) cannot claim refund
      await expect(
        crowdfunding.connect(walletD).claimRefund(1)
      ).to.be.revertedWith("No contribution found for this address");

      const finalStatusB = await crowdfunding.getContributionStatus(1, walletB.address);
      expect(finalStatusB.hasClaimed).to.equal(true);
      expect(finalStatusB.isEligibleForRefund).to.equal(false);
    });
  });

  describe("Scenario C: Invalid Transactions & Edge Cases", function () {
    let deadline;
    const goal = ethers.parseEther("1.0");

    beforeEach(async function () {
      const currentTime = await time.latest();
      deadline = currentTime + 3600;
      await crowdfunding.connect(walletA).createCampaign(
        "Community Water Filtration Plant",
        "Clean drinking water for 2 rural villages.",
        goal,
        deadline,
        "Community Development",
        ""
      );
    });

    it("Rejects creation with empty title", async function () {
      await expect(
        crowdfunding.createCampaign("", "Desc", goal, deadline, "Tech", "")
      ).to.be.revertedWith("Title cannot be empty");
    });

    it("Rejects creation with empty description", async function () {
      await expect(
        crowdfunding.createCampaign("Title", "", goal, deadline, "Tech", "")
      ).to.be.revertedWith("Description cannot be empty");
    });

    it("Rejects creation with zero or invalid funding goal", async function () {
      await expect(
        crowdfunding.createCampaign("Title", "Desc", 0, deadline, "Tech", "")
      ).to.be.revertedWith("Funding goal must be greater than zero");
    });

    it("Rejects creation with campaign deadline in the past or now", async function () {
      const pastTime = (await time.latest()) - 10;
      await expect(
        crowdfunding.createCampaign("Title", "Desc", goal, pastTime, "Tech", "")
      ).to.be.revertedWith("Deadline must be in the future");
    });

    it("Rejects creation with empty category", async function () {
      await expect(
        crowdfunding.createCampaign("Title", "Desc", goal, deadline, "", "")
      ).to.be.revertedWith("Category cannot be empty");
    });

    it("Rejects zero ETH contribution", async function () {
      await expect(
        crowdfunding.connect(walletB).contribute(1, { value: 0 })
      ).to.be.revertedWith("Contribution must be greater than zero");
    });

    it("Rejects campaign creator attempting to contribute to their own campaign", async function () {
      await expect(
        crowdfunding.connect(walletA).contribute(1, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWith("Campaign creator cannot contribute to own campaign");
    });

    it("Rejects contribution to non-existent campaign", async function () {
      await expect(
        crowdfunding.connect(walletB).contribute(999, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWith("Campaign does not exist");
    });

    it("Rejects contribution after campaign deadline has passed", async function () {
      await time.increaseTo(deadline + 10);
      await expect(
        crowdfunding.connect(walletB).contribute(1, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWith("Campaign deadline has passed");
    });

    it("Rejects non-creator attempting to withdraw funds", async function () {
      await crowdfunding.connect(walletB).contribute(1, { value: ethers.parseEther("1.0") });
      await time.increaseTo(deadline + 10);
      await expect(
        crowdfunding.connect(walletB).withdrawFunds(1)
      ).to.be.revertedWith("Only the campaign creator can withdraw funds");
    });

    it("Rejects withdrawal before deadline even if goal is met early", async function () {
      // Goal is reached early
      await crowdfunding.connect(walletB).contribute(1, { value: ethers.parseEther("1.5") });
      // But deadline has NOT passed yet
      await expect(
        crowdfunding.connect(walletA).withdrawFunds(1)
      ).to.be.revertedWith("Cannot withdraw before campaign deadline");
    });

    it("Rejects refund claim if goal was reached", async function () {
      await crowdfunding.connect(walletB).contribute(1, { value: ethers.parseEther("1.0") });
      await time.increaseTo(deadline + 10);
      await expect(
        crowdfunding.connect(walletB).claimRefund(1)
      ).to.be.revertedWith("Funding goal was reached; refunds not available");
    });
  });
});
