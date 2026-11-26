import { expect } from "chai";
import hre from "hardhat";
import helpers from "@nomicfoundation/hardhat-network-helpers";

const { ethers } = hre;
const { time } = helpers;

describe("FundChain Advanced Escrow & Crowdfunding Smart Contract", function () {
  let crowdfunding;
  let admin, creator, beneficiary, donor1, donor2, thirdParty;

  beforeEach(async function () {
    [admin, creator, beneficiary, donor1, donor2, thirdParty] = await ethers.getSigners();
    const Crowdfunding = await ethers.getContractFactory("Crowdfunding");
    crowdfunding = await Crowdfunding.deploy();
    await crowdfunding.waitForDeployment();
  });

  describe("Contract Deployment & Initial State", function () {
    it("Should set deployer as the admin", async function () {
      expect(await crowdfunding.admin()).to.equal(admin.address);
    });

    it("Should start with 0 campaigns and empty interacting users list except admin", async function () {
      expect(await crowdfunding.getCampaignCount()).to.equal(0);
      const all = await crowdfunding.getAllCampaigns();
      expect(all.length).to.equal(0);
      expect(await crowdfunding.getInteractingUsersCount()).to.equal(1); // admin registered
    });
  });

  describe("Scenario A: Successful Campaign & Permissionless Escrow Release", function () {
    it("Executes full lifecycle: creation with beneficiary, funds locked in escrow, permissionless release by thirdParty after deadline", async function () {
      const currentTime = await time.latest();
      const deadline = currentTime + 3600; // 1 hour in future
      const goal = ethers.parseEther("1.0");

      // 1. Creator creates campaign with Beneficiary designated
      const tx = await crowdfunding.connect(creator)["createCampaign(string,string,uint256,uint256,string,string,address)"](
        "Solar Irrigation Pump for Farmers",
        "Empowering 50 smallholder farmers with solar-powered irrigation pumps.",
        goal,
        deadline,
        "Agriculture",
        "https://images.unsplash.com/photo-1592982537447-7440770cbfc9",
        beneficiary.address
      );

      await expect(tx)
        .to.emit(crowdfunding, "CampaignCreated");

      expect(await crowdfunding.getCampaignCount()).to.equal(1);
      const campaign = await crowdfunding.getCampaign(1);
      expect(campaign.creator).to.equal(creator.address);
      expect(campaign.beneficiary).to.equal(beneficiary.address);
      expect(campaign.goal).to.equal(goal);
      expect(campaign.amountRaised).to.equal(0);
      expect(campaign.escrowBalance).to.equal(0);
      expect(campaign.fundsReleased).to.equal(false);
      expect(await crowdfunding.getCampaignState(1)).to.equal(0); // Active

      // 2. Donor 1 contributes 0.4 ETH
      const contrib1 = ethers.parseEther("0.4");
      await expect(
        crowdfunding.connect(donor1).contribute(1, { value: contrib1 })
      )
        .to.emit(crowdfunding, "ContributionReceived")
        .withArgs(1, donor1.address, contrib1)
        .and.to.emit(crowdfunding, "FundsLocked")
        .withArgs(1, contrib1, contrib1);

      // Verify funds are in the contract address (escrow), NOT the creator or beneficiary
      expect(await ethers.provider.getBalance(await crowdfunding.getAddress())).to.equal(contrib1);

      // 3. Donor 2 contributes 0.7 ETH (total: 1.1 ETH >= 1.0 ETH goal)
      const contrib2 = ethers.parseEther("0.7");
      await crowdfunding.connect(donor2).contribute(1, { value: contrib2 });

      const updatedCampaign = await crowdfunding.getCampaign(1);
      expect(updatedCampaign.amountRaised).to.equal(ethers.parseEther("1.1"));
      expect(updatedCampaign.escrowBalance).to.equal(ethers.parseEther("1.1"));
      expect(await crowdfunding.getContribution(1, donor1.address)).to.equal(contrib1);
      expect(await crowdfunding.getContribution(1, donor2.address)).to.equal(contrib2);
      expect(await crowdfunding.getContributorsCount(1)).to.equal(2);

      // Status should now be GoalAchieved (1)
      expect(await crowdfunding.getCampaignState(1)).to.equal(1); // GoalAchieved

      // Verify cannot release funds before deadline
      await expect(
        crowdfunding.connect(thirdParty).releaseFunds(1)
      ).to.be.revertedWith("Cannot release funds before campaign deadline");

      // 4. Advance time beyond deadline
      await time.increaseTo(deadline + 10);

      // Status should now be AwaitingRelease (2)
      expect(await crowdfunding.getCampaignState(1)).to.equal(2); // AwaitingRelease

      // Verify contributor cannot refund when goal was achieved
      await expect(
        crowdfunding.connect(donor1).claimRefund(1)
      ).to.be.revertedWith("Funding goal was reached; refunds not available");

      // 5. ANY account (thirdParty/keeper) triggers permissionless releaseFunds!
      const initialBeneficiaryBalance = await ethers.provider.getBalance(beneficiary.address);
      const releaseTx = await crowdfunding.connect(thirdParty).releaseFunds(1);

      await expect(releaseTx)
        .to.emit(crowdfunding, "FundsReleased")
        .withArgs(1, beneficiary.address, ethers.parseEther("1.1"), await time.latest());

      // Beneficiary received the full 1.1 ETH
      const finalBeneficiaryBalance = await ethers.provider.getBalance(beneficiary.address);
      expect(finalBeneficiaryBalance - initialBeneficiaryBalance).to.equal(ethers.parseEther("1.1"));

      // Campaign escrow balance is now 0, status is FundsReleased (3)
      const finalCampaign = await crowdfunding.getCampaign(1);
      expect(finalCampaign.escrowBalance).to.equal(0);
      expect(finalCampaign.fundsReleased).to.equal(true);
      expect(finalCampaign.withdrawn).to.equal(true);
      expect(await crowdfunding.getCampaignState(1)).to.equal(3); // FundsReleased

      // Cannot release a second time
      await expect(
        crowdfunding.connect(creator).releaseFunds(1)
      ).to.be.revertedWith("Funds have already been released");
    });
  });

  describe("Scenario B: Failed Campaign and Contributor Escrow Refunds", function () {
    it("Executes failed campaign flow: goal not met, deadline passes, contributors claim refunds, double refunds prevented", async function () {
      const currentTime = await time.latest();
      const deadline = currentTime + 3600;
      const goal = ethers.parseEther("2.0");

      // 1. Creator creates campaign
      await crowdfunding.connect(creator)["createCampaign(string,string,uint256,uint256,string,string)"](
        "Organic Fertilizer Subsidy",
        "Providing organic compost and soil bio-fertilizers.",
        goal,
        deadline,
        "Agriculture",
        ""
      );

      // 2. Donor 1 contributes 0.5 ETH
      const contrib1 = ethers.parseEther("0.5");
      await crowdfunding.connect(donor1).contribute(1, { value: contrib1 });

      // 3. Donor 2 contributes 0.3 ETH (Total: 0.8 ETH < 2.0 ETH goal)
      const contrib2 = ethers.parseEther("0.3");
      await crowdfunding.connect(donor2).contribute(1, { value: contrib2 });

      // Cannot claim refund before deadline
      await expect(
        crowdfunding.connect(donor1).claimRefund(1)
      ).to.be.revertedWith("Cannot claim refund before campaign deadline");

      // 4. Advance time beyond deadline
      await time.increaseTo(deadline + 10);

      // State is RefundAvailable (4)
      expect(await crowdfunding.getCampaignState(1)).to.equal(4);

      // Release should fail because goal was not reached
      await expect(
        crowdfunding.connect(creator).releaseFunds(1)
      ).to.be.revertedWith("Funding goal has not been reached");

      // 5. Donor 1 claims refund
      const initialBalance1 = await ethers.provider.getBalance(donor1.address);
      const refundTx1 = await crowdfunding.connect(donor1).claimRefund(1);
      const receipt1 = await refundTx1.wait();
      const gasUsed1 = receipt1.gasUsed * receipt1.gasPrice;

      await expect(refundTx1)
        .to.emit(crowdfunding, "RefundClaimed");

      const finalBalance1 = await ethers.provider.getBalance(donor1.address);
      expect(finalBalance1 + gasUsed1 - initialBalance1).to.equal(contrib1);

      // Verify Donor 1 cannot claim refund again (double refund protection)
      await expect(
        crowdfunding.connect(donor1).claimRefund(1)
      ).to.be.revertedWith("Refund has already been claimed");

      // 6. Donor 2 claims refund via withdrawContribution
      const initialBalance2 = await ethers.provider.getBalance(donor2.address);
      const refundTx2 = await crowdfunding.connect(donor2).withdrawContribution(1);
      const receipt2 = await refundTx2.wait();
      const gasUsed2 = receipt2.gasUsed * receipt2.gasPrice;

      const finalBalance2 = await ethers.provider.getBalance(donor2.address);
      expect(finalBalance2 + gasUsed2 - initialBalance2).to.equal(contrib2);

      // Both contributors refunded; escrow balance is 0, state is Refunded (5)
      const c = await crowdfunding.getCampaign(1);
      expect(c.escrowBalance).to.equal(0);
      expect(await crowdfunding.getCampaignState(1)).to.equal(5); // Refunded
    });
  });

  describe("Scenario C: Admin Security & Access Control", function () {
    it("Allows admin to transfer admin role, but prevents unauthorized accounts from calling admin functions", async function () {
      expect(await crowdfunding.admin()).to.equal(admin.address);

      // Non-admin cannot transfer admin
      await expect(
        crowdfunding.connect(creator).transferAdmin(creator.address)
      ).to.be.revertedWith("Only contract administrator can execute this");

      // Admin transfers role to thirdParty
      await expect(
        crowdfunding.connect(admin).transferAdmin(thirdParty.address)
      )
        .to.emit(crowdfunding, "AdminTransferred")
        .withArgs(admin.address, thirdParty.address);

      expect(await crowdfunding.admin()).to.equal(thirdParty.address);
    });

    it("Verifies platform statistics accurate for admin monitoring", async function () {
      const stats = await crowdfunding.getPlatformStats();
      expect(stats.totalCampaigns).to.equal(0);
      expect(stats.totalEscrowLocked).to.equal(0);
      expect(stats.totalContributions).to.equal(0);
      expect(stats.totalReleased).to.equal(0);
      expect(stats.totalRefunded).to.equal(0);
      expect(stats.totalUsers).to.be.greaterThanOrEqual(1);
    });
  });

  describe("Scenario D: Contributor Early Withdrawal", function () {
    it("Allows contributor to withdraw contribution before deadline and updates totals", async function () {
      const currentTime = await time.latest();
      const deadline = currentTime + 3600;
      const goal = ethers.parseEther("1.0");

      await crowdfunding.connect(creator)["createCampaign(string,string,uint256,uint256,string,string)"](
        "Early Withdrawal Test",
        "Testing contributor withdrawal before deadline.",
        goal,
        deadline,
        "Technology",
        ""
      );

      await crowdfunding.connect(donor1).contribute(1, { value: ethers.parseEther("0.4") });
      expect((await crowdfunding.getCampaign(1)).escrowBalance).to.equal(ethers.parseEther("0.4"));

      // Donor 1 withdraws early
      await expect(
        crowdfunding.connect(donor1).withdrawContribution(1)
      )
        .to.emit(crowdfunding, "ContributionWithdrawn")
        .withArgs(1, donor1.address, ethers.parseEther("0.4"));

      const c = await crowdfunding.getCampaign(1);
      expect(c.amountRaised).to.equal(0);
      expect(c.escrowBalance).to.equal(0);
    });
  });

  describe("Scenario E: Account Vault (Deposit & Withdraw)", function () {
    it("Allows users to deposit ETH into vault and withdraw it back to wallet", async function () {
      const depositAmount = ethers.parseEther("0.25");

      await expect(
        crowdfunding.connect(donor1).depositFunds({ value: depositAmount })
      )
        .to.emit(crowdfunding, "UserDeposited")
        .withArgs(donor1.address, depositAmount);

      expect(await crowdfunding.getVaultBalance(donor1.address)).to.equal(depositAmount);

      // Withdraw partial
      const withdrawAmount = ethers.parseEther("0.1");
      await expect(
        crowdfunding.connect(donor1).withdrawVaultDeposit(withdrawAmount)
      )
        .to.emit(crowdfunding, "UserWithdrewDeposit")
        .withArgs(donor1.address, withdrawAmount);

      expect(await crowdfunding.getVaultBalance(donor1.address)).to.equal(depositAmount - withdrawAmount);
    });
  });

  describe("Scenario F: Edge Cases & Validation Rules", function () {
    it("Rejects creator contributing to their own campaign", async function () {
      const deadline = (await time.latest()) + 3600;
      await crowdfunding.connect(creator)["createCampaign(string,string,uint256,uint256,string,string)"](
        "Self-Contribution Test",
        "Should not allow creator to contribute.",
        ethers.parseEther("1.0"),
        deadline,
        "Education",
        ""
      );

      await expect(
        crowdfunding.connect(creator).contribute(1, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWith("Campaign creator cannot contribute to own campaign");
    });

    it("Rejects contribution after deadline", async function () {
      const deadline = (await time.latest()) + 3600;
      await crowdfunding.connect(creator)["createCampaign(string,string,uint256,uint256,string,string)"](
        "Deadline Test",
        "Should reject contribution after deadline.",
        ethers.parseEther("1.0"),
        deadline,
        "Education",
        ""
      );

      await time.increaseTo(deadline + 10);

      await expect(
        crowdfunding.connect(donor1).contribute(1, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWith("Campaign deadline has passed");
    });

    it("Defaults beneficiary to creator when beneficiary is address(0)", async function () {
      const deadline = (await time.latest()) + 3600;
      await crowdfunding.connect(creator)["createCampaign(string,string,uint256,uint256,string,string,address)"](
        "Default Beneficiary Test",
        "Testing default beneficiary.",
        ethers.parseEther("1.0"),
        deadline,
        "Healthcare",
        "",
        ethers.ZeroAddress
      );

      const c = await crowdfunding.getCampaign(1);
      expect(c.beneficiary).to.equal(creator.address);
    });
  });

  describe("Scenario G: Milestone-Based Fund Release", function () {
    it("Allows creator to define milestones, submit evidence, admin to approve, and release milestone funds", async function () {
      const deadline = (await time.latest()) + 7200;
      const mTitles = ["Milestone 1: Prototype", "Milestone 2: Final Delivery"];
      const mDescs = ["Hardware schematics & board", "Assembled and tested unit"];
      const mTargets = [ethers.parseEther("0.4"), ethers.parseEther("0.6")];
      const goal = ethers.parseEther("1.0");

      await crowdfunding.connect(creator).createCampaignWithMilestones(
        "Smart IoT Soil Sensors",
        "Deploying smart soil moisture sensors across farms",
        goal,
        deadline,
        "Agriculture",
        "https://images.unsplash.com/photo-example",
        beneficiary.address,
        mTitles,
        mDescs,
        mTargets
      );

      const milestones = await crowdfunding.getCampaignMilestones(1);
      expect(milestones.length).to.equal(2);
      expect(milestones[0].title).to.equal("Milestone 1: Prototype");
      expect(milestones[0].targetAmount).to.equal(mTargets[0]);
      expect(milestones[0].completed).to.equal(false);
      expect(milestones[0].approved).to.equal(false);

      // Backer contributes 1.0 ETH
      await crowdfunding.connect(donor1).contribute(1, { value: goal });

      // Creator submits milestone evidence
      await crowdfunding.connect(creator).submitMilestoneEvidence(1, 0, "https://ipfs.io/ipfs/QmPrototypeEvidence");
      const mUpdated = await crowdfunding.getCampaignMilestones(1);
      expect(mUpdated[0].completed).to.equal(true);
      expect(mUpdated[0].evidenceUrl).to.equal("https://ipfs.io/ipfs/QmPrototypeEvidence");

      // Non-admin cannot approve milestone
      await expect(
        crowdfunding.connect(donor1).approveMilestone(1, 0)
      ).to.be.revertedWith("Only contract administrator can execute this");

      // Admin approves milestone 1
      await crowdfunding.connect(admin).approveMilestone(1, 0);
      const mApproved = await crowdfunding.getCampaignMilestones(1);
      expect(mApproved[0].approved).to.equal(true);

      // Release milestone 1 funds
      const beneficiaryBalanceBefore = await ethers.provider.getBalance(beneficiary.address);
      await crowdfunding.connect(thirdParty).releaseMilestoneFunds(1, 0);
      const beneficiaryBalanceAfter = await ethers.provider.getBalance(beneficiary.address);

      expect(beneficiaryBalanceAfter - beneficiaryBalanceBefore).to.equal(mTargets[0]);

      const campaignAfterM1 = await crowdfunding.getCampaign(1);
      expect(campaignAfterM1.escrowBalance).to.equal(goal - mTargets[0]);
      expect(campaignAfterM1.totalReleased).to.equal(mTargets[0]);

      // Cannot double release milestone 1
      await expect(
        crowdfunding.connect(thirdParty).releaseMilestoneFunds(1, 0)
      ).to.be.revertedWith("Milestone funds have already been released");
    });
  });

  describe("Scenario H: Donor Voting Governance", function () {
    it("Allows campaign contributors to vote on proposals and prevents duplicate or non-contributor voting", async function () {
      const deadline = (await time.latest()) + 3600;
      await crowdfunding.connect(creator)["createCampaign(string,string,uint256,uint256,string,string)"](
        "Community Agro-Forestry",
        "Planting 10,000 native trees",
        ethers.parseEther("1.0"),
        deadline,
        "Environment",
        ""
      );

      // Donor1 contributes
      await crowdfunding.connect(donor1).contribute(1, { value: ethers.parseEther("0.5") });

      // Donor1 creates proposal
      await crowdfunding.connect(donor1).createProposal(
        1,
        "Extend Planting Window by 2 Weeks",
        "Due to unseasonal monsoon rainfall, request postponing deadline.",
        300 // 5 minutes voting
      );

      expect(await crowdfunding.proposalCount()).to.equal(1);
      const proposals = await crowdfunding.getCampaignProposals(1);
      expect(proposals.length).to.equal(1);
      expect(proposals[0].title).to.equal("Extend Planting Window by 2 Weeks");

      // Non-contributor (donor2) cannot vote
      await expect(
        crowdfunding.connect(donor2).voteOnProposal(1, true)
      ).to.be.revertedWith("Only contributors to this campaign can vote");

      // Donor1 votes FOR
      await crowdfunding.connect(donor1).voteOnProposal(1, true);

      // Cannot vote twice
      await expect(
        crowdfunding.connect(donor1).voteOnProposal(1, false)
      ).to.be.revertedWith("Already voted on this proposal");

      // Advance time to after proposal deadline and execute
      await time.increase(310);
      await crowdfunding.executeProposal(1);

      const propFinal = (await crowdfunding.getCampaignProposals(1))[0];
      expect(propFinal.executed).to.equal(true);
      expect(propFinal.passed).to.equal(true);
      expect(propFinal.votesFor).to.equal(1);
    });
  });

  describe("Scenario I: Dispute Management", function () {
    it("Pauses milestone fund releases when a dispute is active, and resumes once resolved", async function () {
      const deadline = (await time.latest()) + 7200;
      await crowdfunding.connect(creator).createCampaignWithMilestones(
        "Organic Fertilizer Plant",
        "Commercial processing unit",
        ethers.parseEther("1.0"),
        deadline,
        "Agriculture",
        "",
        beneficiary.address,
        ["Stage 1 Construction"],
        ["Foundation and mixing tanks"],
        [ethers.parseEther("1.0")]
      );

      await crowdfunding.connect(donor1).contribute(1, { value: ethers.parseEther("1.0") });
      await crowdfunding.connect(creator).submitMilestoneEvidence(1, 0, "https://proof-fake-site.com");
      await crowdfunding.connect(admin).approveMilestone(1, 0);

      // Donor1 raises dispute on suspicious evidence
      await crowdfunding.connect(donor1).raiseDispute(1, 0, "Evidence pictures appear to be stock photos", "https://reverse-image-search.com");
      expect(await crowdfunding.campaignHasActiveDispute(1)).to.equal(true);

      // Milestone fund release MUST be blocked while dispute is active
      await expect(
        crowdfunding.connect(thirdParty).releaseMilestoneFunds(1, 0)
      ).to.be.revertedWith("Fund release paused: Campaign has an active unresolved dispute");

      // Admin resolves dispute in favor of creator after verification
      await crowdfunding.connect(admin).resolveDispute(1, false, "Verified via local agricultural cooperative on-site inspection");
      expect(await crowdfunding.campaignHasActiveDispute(1)).to.equal(false);

      // Now release succeeds
      await expect(crowdfunding.connect(thirdParty).releaseMilestoneFunds(1, 0)).to.not.be.reverted;
    });
  });

  describe("Scenario J: Creator On-Chain Reputation", function () {
    it("Calculates reputation transparently based on successful campaigns and milestones", async function () {
      // New creator before any campaign
      const repNew = await crowdfunding.getCreatorReputation(thirdParty.address);
      expect(repNew.totalCreated).to.equal(0);
      expect(repNew.badge).to.equal("New Creator");

      // Creator creates a campaign and reaches goal
      const deadline = (await time.latest()) + 3600;
      await crowdfunding.connect(creator)["createCampaign(string,string,uint256,uint256,string,string)"](
        "Reputation Test Campaign",
        "Empowering organic farmers",
        ethers.parseEther("0.5"),
        deadline,
        "Agriculture",
        ""
      );
      await crowdfunding.connect(donor1).contribute(1, { value: ethers.parseEther("0.5") });

      const rep = await crowdfunding.getCreatorReputation(creator.address);
      expect(rep.totalCreated).to.equal(1);
      expect(rep.successfulCampaigns).to.equal(1);
      expect(rep.score).to.be.gte(50);
      expect(rep.score).to.be.lte(100);
    });
  });
});
