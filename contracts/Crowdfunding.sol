// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Crowdfunding - FundChain Advanced Escrow, Milestones, Governance & Crowdfunding Smart Contract
 * @author FundChain Team
 * @notice Decentralized Crowdfunding Platform featuring a Trustless Smart Contract Escrow System,
 *         Milestone-Based Fund Releases, Decentralized Donor Voting, On-Chain Creator Reputation,
 *         Dispute Resolution Mechanisms, Permissionless Automated Settlement, Contributor Refunds,
 *         User Vault Balances, and On-Chain Admin Transparency.
 * @dev Implements Checks-Effects-Interactions pattern, ReentrancyGuard, strict deadline verification,
 *      separate beneficiary payouts, and dedicated campaign escrow accounting.
 *      Project: FundChain (#6) - Transparent Fundraising. Powered by Blockchain.
 */
contract Crowdfunding {
    // --- REENTRANCY GUARD ---
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    // --- ACCESS CONTROL (ADMIN MONITORING) ---
    address public admin;

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only contract administrator can execute this");
        _;
    }

    // --- ENUMS & STRUCTS ---
    enum CampaignState {
        Active,          // 0: Accepting contributions, before deadline, goal not yet reached
        GoalAchieved,    // 1: Funding target reached, funds securely locked in escrow until deadline
        AwaitingRelease, // 2: Deadline reached, goal achieved, ready for permissionless release to beneficiary
        FundsReleased,   // 3: Escrowed ETH successfully transferred to beneficiary
        RefundAvailable, // 4: Deadline reached, goal NOT met, contributors can claim 100% refund
        Refunded         // 5: All refunded or campaign closed with zero escrow balance
    }

    struct Campaign {
        uint256 id;
        address payable creator;
        address payable beneficiary;
        string title;
        string description;
        uint256 goal;          // In wei
        uint256 amountRaised;  // In wei (cumulative contributions minus early withdrawals)
        uint256 deadline;      // Unix timestamp (seconds)
        string category;       // e.g. Agriculture, Education, Healthcare, Technology, etc.
        string imageUrl;       // Image URL or IPFS hash
        bool withdrawn;        // True if funds have been released/withdrawn
        bool fundsReleased;    // Explicit flag confirming payout to beneficiary
        uint256 escrowBalance; // Current wei held in smart contract escrow for this campaign
        uint256 totalReleased; // Cumulative wei released to beneficiary
        uint256 totalRefunded; // Cumulative wei refunded to contributors
        uint256 createdAt;     // Unix timestamp of campaign creation
    }

    // --- MILESTONE STRUCT ---
    struct Milestone {
        uint256 id;
        string title;
        string description;
        uint256 targetAmount; // In wei
        bool completed;       // Creator submitted evidence
        bool approved;        // Admin/Auditor approved evidence
        bool released;        // Funds disbursed to beneficiary
        string evidenceUrl;   // Link/IPFS hash to deliverables proof
        uint256 submittedAt;  // Timestamp of submission
        uint256 approvedAt;   // Timestamp of approval
    }

    // --- DONOR VOTING GOVERNANCE STRUCT ---
    struct Proposal {
        uint256 id;
        uint256 campaignId;
        string title;
        string description;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 deadline;
        bool executed;
        bool passed;
        address proposer;
    }

    // --- DISPUTE MANAGEMENT STRUCT ---
    struct Dispute {
        uint256 id;
        uint256 campaignId;
        uint256 milestoneIndex;
        address complainant;
        string reason;
        string evidenceUrl;
        uint256 createdAt;
        bool resolved;
        bool inFavorOfDonors;
        string resolutionNotes;
    }

    // --- STATE VARIABLES ---
    uint256 public campaignCount;
    mapping(uint256 => Campaign) public campaigns;

    // campaignId => contributor => amount contributed in wei
    mapping(uint256 => mapping(address => uint256)) public contributions;

    // campaignId => contributor => whether refund was claimed
    mapping(uint256 => mapping(address => bool)) public refundClaimed;

    // campaignId => list of unique contributor addresses
    mapping(uint256 => address[]) private campaignContributors;

    // campaignId => contributor => has contributed flag
    mapping(uint256 => mapping(address => bool)) private hasContributed;

    // Milestones: campaignId => array of Milestones
    mapping(uint256 => Milestone[]) private campaignMilestones;

    // Governance Proposals
    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => uint256[]) private campaignProposals;
    mapping(uint256 => mapping(address => bool)) public hasVotedOnProposal;

    // Disputes
    uint256 public disputeCount;
    mapping(uint256 => Dispute) public disputes;
    mapping(uint256 => uint256[]) private campaignDisputes;
    mapping(uint256 => bool) public campaignHasActiveDispute;

    // Global platform statistics (all-time)
    uint256 public totalContributionsAllTime;
    uint256 public totalReleasedAllTime;
    uint256 public totalRefundedAllTime;

    // Tracking all unique interacting user addresses for Admin Monitoring
    address[] public allInteractingUsers;
    mapping(address => bool) public isInteractingUser;

    // User => deposited balance in FundChain vault in wei
    mapping(address => uint256) public userVaultBalances;

    // --- EVENTS ---
    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        address indexed beneficiary,
        string title,
        uint256 goal,
        uint256 deadline,
        string category,
        string imageUrl
    );

    event ContributionReceived(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 amount
    );

    event FundsLocked(
        uint256 indexed campaignId,
        uint256 amount,
        uint256 totalEscrowBalance
    );

    event FundsReleased(
        uint256 indexed campaignId,
        address indexed beneficiary,
        uint256 amount,
        uint256 timestamp
    );

    event FundsWithdrawn(
        uint256 indexed campaignId,
        address indexed beneficiary,
        uint256 amount
    );

    event RefundClaimed(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 amount,
        uint256 timestamp
    );

    event ContributionWithdrawn(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 amount
    );

    event UserDeposited(
        address indexed user,
        uint256 amount
    );

    event UserWithdrewDeposit(
        address indexed user,
        uint256 amount
    );

    event AdminTransferred(
        address indexed previousAdmin,
        address indexed newAdmin
    );

    // Milestones Events
    event MilestoneEvidenceSubmitted(
        uint256 indexed campaignId,
        uint256 indexed milestoneIndex,
        string evidenceUrl,
        uint256 timestamp
    );

    event MilestoneApproved(
        uint256 indexed campaignId,
        uint256 indexed milestoneIndex,
        uint256 timestamp
    );

    event MilestoneRejected(
        uint256 indexed campaignId,
        uint256 indexed milestoneIndex,
        string reason
    );

    event MilestoneFundsReleased(
        uint256 indexed campaignId,
        uint256 indexed milestoneIndex,
        address indexed beneficiary,
        uint256 amount,
        uint256 timestamp
    );

    // Governance Proposal Events
    event ProposalCreated(
        uint256 indexed proposalId,
        uint256 indexed campaignId,
        address indexed proposer,
        string title,
        uint256 deadline
    );

    event ProposalVoted(
        uint256 indexed proposalId,
        address indexed voter,
        bool support
    );

    event ProposalExecuted(
        uint256 indexed proposalId,
        bool passed,
        uint256 votesFor,
        uint256 votesAgainst
    );

    // Dispute Events
    event DisputeRaised(
        uint256 indexed disputeId,
        uint256 indexed campaignId,
        uint256 indexed milestoneIndex,
        address complainant,
        string reason
    );

    event DisputeResolved(
        uint256 indexed disputeId,
        uint256 indexed campaignId,
        bool inFavorOfDonors,
        string resolutionNotes
    );

    // --- CONSTRUCTOR ---
    constructor() {
        _status = _NOT_ENTERED;
        admin = msg.sender;
        _registerInteractingUser(msg.sender);
    }

    // --- INTERNAL HELPERS ---
    function _registerInteractingUser(address _user) internal {
        if (!isInteractingUser[_user] && _user != address(0)) {
            isInteractingUser[_user] = true;
            allInteractingUsers.push(_user);
        }
    }

    // --- CORE FUNCTIONS ---

    /**
     * @notice Creates a new campaign with optional milestones
     */
    function createCampaignWithMilestones(
        string memory _title,
        string memory _description,
        uint256 _goal,
        uint256 _deadline,
        string memory _category,
        string memory _imageUrl,
        address payable _beneficiary,
        string[] memory _milestoneTitles,
        string[] memory _milestoneDescriptions,
        uint256[] memory _milestoneTargets
    ) public returns (uint256) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(_goal > 0, "Funding goal must be greater than zero");
        require(_deadline > block.timestamp, "Deadline must be in the future");
        require(bytes(_category).length > 0, "Category cannot be empty");

        address payable beneficiaryAddr = _beneficiary;
        if (beneficiaryAddr == address(0)) {
            beneficiaryAddr = payable(msg.sender);
        }

        campaignCount++;
        uint256 newCampaignId = campaignCount;

        Campaign storage newC = campaigns[newCampaignId];
        newC.id = newCampaignId;
        newC.creator = payable(msg.sender);
        newC.beneficiary = beneficiaryAddr;
        newC.title = _title;
        newC.description = _description;
        newC.goal = _goal;
        newC.deadline = _deadline;
        newC.category = _category;
        newC.imageUrl = _imageUrl;
        newC.createdAt = block.timestamp;

        // Initialize milestones if supplied, else initialize single default milestone
        if (_milestoneTitles.length > 0) {
            require(
                _milestoneTitles.length == _milestoneDescriptions.length &&
                _milestoneTitles.length == _milestoneTargets.length,
                "Milestones data length mismatch"
            );
            uint256 sumTargets = 0;
            for (uint256 i = 0; i < _milestoneTitles.length; i++) {
                require(_milestoneTargets[i] > 0, "Milestone target must be > 0");
                sumTargets += _milestoneTargets[i];
                campaignMilestones[newCampaignId].push(
                    Milestone({
                        id: i + 1,
                        title: _milestoneTitles[i],
                        description: _milestoneDescriptions[i],
                        targetAmount: _milestoneTargets[i],
                        completed: false,
                        approved: false,
                        released: false,
                        evidenceUrl: "",
                        submittedAt: 0,
                        approvedAt: 0
                    })
                );
            }
            require(sumTargets <= _goal, "Sum of milestone targets exceeds campaign goal");
        } else {
            // Default 1 milestone
            campaignMilestones[newCampaignId].push(
                Milestone({
                    id: 1,
                    title: "Project Completion & Final Delivery",
                    description: "Full execution and project delivery according to campaign proposal",
                    targetAmount: _goal,
                    completed: false,
                    approved: false,
                    released: false,
                    evidenceUrl: "",
                    submittedAt: 0,
                    approvedAt: 0
                })
            );
        }

        _registerInteractingUser(msg.sender);
        _registerInteractingUser(beneficiaryAddr);

        emit CampaignCreated(
            newCampaignId,
            msg.sender,
            beneficiaryAddr,
            _title,
            _goal,
            _deadline,
            _category,
            _imageUrl
        );

        return newCampaignId;
    }

    /**
     * @notice Creates a new fundraising campaign with a designated beneficiary address (backward compatible)
     */
    function createCampaign(
        string memory _title,
        string memory _description,
        uint256 _goal,
        uint256 _deadline,
        string memory _category,
        string memory _imageUrl,
        address payable _beneficiary
    ) public returns (uint256) {
        string[] memory emptyS = new string[](0);
        uint256[] memory emptyU = new uint256[](0);
        return createCampaignWithMilestones(
            _title,
            _description,
            _goal,
            _deadline,
            _category,
            _imageUrl,
            _beneficiary,
            emptyS,
            emptyS,
            emptyU
        );
    }

    /**
     * @notice Overloaded createCampaign maintaining backward compatibility (beneficiary = msg.sender)
     */
    function createCampaign(
        string memory _title,
        string memory _description,
        uint256 _goal,
        uint256 _deadline,
        string memory _category,
        string memory _imageUrl
    ) external returns (uint256) {
        return createCampaign(
            _title,
            _description,
            _goal,
            _deadline,
            _category,
            _imageUrl,
            payable(msg.sender)
        );
    }

    /**
     * @notice Contributes ETH to an active campaign. ETH is locked into the smart contract escrow.
     */
    function contribute(uint256 _campaignId) external payable nonReentrant {
        require(_campaignId > 0 && _campaignId <= campaignCount, "Campaign does not exist");
        Campaign storage campaign = campaigns[_campaignId];

        require(block.timestamp < campaign.deadline, "Campaign deadline has passed");
        require(msg.value > 0, "Contribution must be greater than zero");
        require(msg.sender != campaign.creator, "Campaign creator cannot contribute to own campaign");

        // Escrow accounting
        campaign.amountRaised += msg.value;
        campaign.escrowBalance += msg.value;
        contributions[_campaignId][msg.sender] += msg.value;
        totalContributionsAllTime += msg.value;

        if (!hasContributed[_campaignId][msg.sender]) {
            hasContributed[_campaignId][msg.sender] = true;
            campaignContributors[_campaignId].push(msg.sender);
        }

        _registerInteractingUser(msg.sender);

        emit ContributionReceived(_campaignId, msg.sender, msg.value);
        emit FundsLocked(_campaignId, msg.value, campaign.escrowBalance);
    }

    // --- MILESTONE MANAGEMENT FUNCTIONS ---

    /**
     * @notice Campaign creator submits proof/evidence of milestone completion
     */
    function submitMilestoneEvidence(
        uint256 _campaignId,
        uint256 _milestoneIndex,
        string calldata _evidenceUrl
    ) external {
        require(_campaignId > 0 && _campaignId <= campaignCount, "Campaign does not exist");
        Campaign storage campaign = campaigns[_campaignId];
        require(msg.sender == campaign.creator, "Only campaign creator can submit evidence");
        require(_milestoneIndex < campaignMilestones[_campaignId].length, "Invalid milestone index");
        require(bytes(_evidenceUrl).length > 0, "Evidence URL cannot be empty");

        Milestone storage m = campaignMilestones[_campaignId][_milestoneIndex];
        require(!m.released, "Milestone funds already released");

        m.completed = true;
        m.evidenceUrl = _evidenceUrl;
        m.submittedAt = block.timestamp;

        emit MilestoneEvidenceSubmitted(_campaignId, _milestoneIndex, _evidenceUrl, block.timestamp);
    }

    /**
     * @notice Admin / Auditor approves a submitted milestone
     */
    function approveMilestone(uint256 _campaignId, uint256 _milestoneIndex) external onlyAdmin {
        require(_campaignId > 0 && _campaignId <= campaignCount, "Campaign does not exist");
        require(_milestoneIndex < campaignMilestones[_campaignId].length, "Invalid milestone index");

        Milestone storage m = campaignMilestones[_campaignId][_milestoneIndex];
        require(m.completed, "Milestone evidence has not been submitted yet");
        require(!m.approved, "Milestone is already approved");
        require(!m.released, "Milestone funds already released");

        m.approved = true;
        m.approvedAt = block.timestamp;

        emit MilestoneApproved(_campaignId, _milestoneIndex, block.timestamp);
    }

    /**
     * @notice Admin / Auditor rejects a submitted milestone with a reason
     */
    function rejectMilestone(
        uint256 _campaignId,
        uint256 _milestoneIndex,
        string calldata _reason
    ) external onlyAdmin {
        require(_campaignId > 0 && _campaignId <= campaignCount, "Campaign does not exist");
        require(_milestoneIndex < campaignMilestones[_campaignId].length, "Invalid milestone index");

        Milestone storage m = campaignMilestones[_campaignId][_milestoneIndex];
        require(!m.released, "Milestone funds already released");

        m.completed = false;
        m.approved = false;

        emit MilestoneRejected(_campaignId, _milestoneIndex, _reason);
    }

    /**
     * @notice Releases funds for an approved milestone to the campaign beneficiary.
     *         Permissionless call: can be executed once milestone is approved and campaign conditions are satisfied.
     */
    function releaseMilestoneFunds(uint256 _campaignId, uint256 _milestoneIndex) external nonReentrant {
        require(_campaignId > 0 && _campaignId <= campaignCount, "Campaign does not exist");
        require(!campaignHasActiveDispute[_campaignId], "Fund release paused: Campaign has an active unresolved dispute");

        Campaign storage campaign = campaigns[_campaignId];
        require(_milestoneIndex < campaignMilestones[_campaignId].length, "Invalid milestone index");

        Milestone storage m = campaignMilestones[_campaignId][_milestoneIndex];
        require(m.approved, "Milestone is not approved yet");
        require(!m.released, "Milestone funds have already been released");

        uint256 releaseAmount = m.targetAmount;
        if (releaseAmount > campaign.escrowBalance) {
            releaseAmount = campaign.escrowBalance;
        }
        require(releaseAmount > 0, "No escrow funds available for this milestone release");

        // Checks-Effects-Interactions
        m.released = true;
        campaign.escrowBalance -= releaseAmount;
        campaign.totalReleased += releaseAmount;
        totalReleasedAllTime += releaseAmount;

        // If all escrow is released or goal was met and escrow reached 0, mark campaign as released
        if (campaign.escrowBalance == 0) {
            campaign.fundsReleased = true;
            campaign.withdrawn = true;
        }

        (bool success, ) = campaign.beneficiary.call{value: releaseAmount}("");
        require(success, "Failed to send Ether to beneficiary");

        emit MilestoneFundsReleased(_campaignId, _milestoneIndex, campaign.beneficiary, releaseAmount, block.timestamp);
        emit FundsReleased(_campaignId, campaign.beneficiary, releaseAmount, block.timestamp);
    }

    /**
     * @notice Internal logic for releasing remaining escrowed funds to campaign beneficiary
     */
    function _releaseFunds(uint256 _campaignId) internal {
        require(_campaignId > 0 && _campaignId <= campaignCount, "Campaign does not exist");
        require(!campaignHasActiveDispute[_campaignId], "Cannot release funds: Active dispute pending");

        Campaign storage campaign = campaigns[_campaignId];

        require(block.timestamp >= campaign.deadline, "Cannot release funds before campaign deadline");
        require(campaign.amountRaised >= campaign.goal, "Funding goal has not been reached");
        require(!campaign.fundsReleased && !campaign.withdrawn, "Funds have already been released");
        require(campaign.escrowBalance > 0, "No funds in escrow to release");

        // Checks-Effects-Interactions
        campaign.withdrawn = true;
        campaign.fundsReleased = true;
        uint256 payoutAmount = campaign.escrowBalance;
        campaign.escrowBalance = 0;
        campaign.totalReleased += payoutAmount;
        totalReleasedAllTime += payoutAmount;

        // Mark all milestones as released
        for (uint256 i = 0; i < campaignMilestones[_campaignId].length; i++) {
            campaignMilestones[_campaignId][i].approved = true;
            campaignMilestones[_campaignId][i].released = true;
        }

        // Secure transfer to designated beneficiary
        (bool success, ) = campaign.beneficiary.call{value: payoutAmount}("");
        require(success, "Failed to send Ether to campaign beneficiary");

        emit FundsReleased(_campaignId, campaign.beneficiary, payoutAmount, block.timestamp);
        emit FundsWithdrawn(_campaignId, campaign.beneficiary, payoutAmount);
    }

    /**
     * @notice Permissionless release of escrowed funds to campaign beneficiary.
     */
    function releaseFunds(uint256 _campaignId) external nonReentrant {
        _releaseFunds(_campaignId);
    }

    /**
     * @notice Backward compatible withdrawFunds wrapper (calls _releaseFunds)
     */
    function withdrawFunds(uint256 _campaignId) external nonReentrant {
        _releaseFunds(_campaignId);
    }

    /**
     * @notice Internal logic for claiming refund
     */
    function _claimRefund(uint256 _campaignId, address _contributor) internal {
        require(_campaignId > 0 && _campaignId <= campaignCount, "Campaign does not exist");
        Campaign storage campaign = campaigns[_campaignId];

        require(block.timestamp >= campaign.deadline, "Cannot claim refund before campaign deadline");
        require(campaign.amountRaised < campaign.goal, "Funding goal was reached; refunds not available");
        require(!refundClaimed[_campaignId][_contributor], "Refund has already been claimed");

        uint256 contributedAmount = contributions[_campaignId][_contributor];
        require(contributedAmount > 0, "No contribution found for this address");

        // Checks-Effects-Interactions
        refundClaimed[_campaignId][_contributor] = true;
        contributions[_campaignId][_contributor] = 0;

        if (campaign.escrowBalance >= contributedAmount) {
            campaign.escrowBalance -= contributedAmount;
        } else {
            campaign.escrowBalance = 0;
        }

        campaign.totalRefunded += contributedAmount;
        totalRefundedAllTime += contributedAmount;

        // Secure transfer to contributor
        (bool success, ) = payable(_contributor).call{value: contributedAmount}("");
        require(success, "Failed to send refund Ether");

        emit RefundClaimed(_campaignId, _contributor, contributedAmount, block.timestamp);
    }

    /**
     * @notice Contributor claims 100% refund if campaign failed to reach goal by deadline.
     */
    function claimRefund(uint256 _campaignId) external nonReentrant {
        _claimRefund(_campaignId, msg.sender);
    }

    /**
     * @notice Allows a contributor to withdraw their contribution from an active campaign before the deadline,
     *         or claims refund if deadline passed and goal was not met.
     */
    function withdrawContribution(uint256 _campaignId) external nonReentrant {
        require(_campaignId > 0 && _campaignId <= campaignCount, "Campaign does not exist");
        Campaign storage campaign = campaigns[_campaignId];
        require(!campaign.fundsReleased && !campaign.withdrawn, "Funds have already been released to beneficiary");

        if (block.timestamp < campaign.deadline) {
            // Early withdrawal while campaign is still active
            uint256 contributedAmount = contributions[_campaignId][msg.sender];
            require(contributedAmount > 0, "No contribution found for this address");

            contributions[_campaignId][msg.sender] = 0;
            campaign.amountRaised -= contributedAmount;

            if (campaign.escrowBalance >= contributedAmount) {
                campaign.escrowBalance -= contributedAmount;
            } else {
                campaign.escrowBalance = 0;
            }

            if (totalContributionsAllTime >= contributedAmount) {
                totalContributionsAllTime -= contributedAmount;
            }

            (bool success, ) = payable(msg.sender).call{value: contributedAmount}("");
            require(success, "Failed to send refund Ether");

            emit ContributionWithdrawn(_campaignId, msg.sender, contributedAmount);
        } else {
            // After deadline withdrawal (claim refund on failed campaign)
            _claimRefund(_campaignId, msg.sender);
        }
    }

    // --- DONOR VOTING GOVERNANCE ---

    /**
     * @notice Create a governance proposal for a campaign (e.g. modify milestone, extend timeline)
     */
    function createProposal(
        uint256 _campaignId,
        string calldata _title,
        string calldata _description,
        uint256 _durationSeconds
    ) external returns (uint256) {
        require(_campaignId > 0 && _campaignId <= campaignCount, "Campaign does not exist");
        Campaign storage campaign = campaigns[_campaignId];
        require(
            msg.sender == campaign.creator || contributions[_campaignId][msg.sender] > 0,
            "Only campaign creator or verified contributors can create proposals"
        );
        require(bytes(_title).length > 0, "Proposal title cannot be empty");
        require(_durationSeconds >= 60, "Proposal duration must be at least 60 seconds");

        proposalCount++;
        uint256 newPropId = proposalCount;

        Proposal storage p = proposals[newPropId];
        p.id = newPropId;
        p.campaignId = _campaignId;
        p.title = _title;
        p.description = _description;
        p.deadline = block.timestamp + _durationSeconds;
        p.proposer = msg.sender;
        p.executed = false;
        p.passed = false;

        campaignProposals[_campaignId].push(newPropId);
        _registerInteractingUser(msg.sender);

        emit ProposalCreated(newPropId, _campaignId, msg.sender, _title, p.deadline);
        return newPropId;
    }

    /**
     * @notice Vote on a proposal (Only contributors to the campaign can vote)
     */
    function voteOnProposal(uint256 _proposalId, bool _support) external {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Proposal does not exist");
        Proposal storage p = proposals[_proposalId];
        require(block.timestamp < p.deadline, "Voting period has ended");
        require(!p.executed, "Proposal has already been executed");
        require(contributions[p.campaignId][msg.sender] > 0, "Only contributors to this campaign can vote");
        require(!hasVotedOnProposal[_proposalId][msg.sender], "Already voted on this proposal");

        hasVotedOnProposal[_proposalId][msg.sender] = true;
        if (_support) {
            p.votesFor += 1;
        } else {
            p.votesAgainst += 1;
        }

        emit ProposalVoted(_proposalId, msg.sender, _support);
    }

    /**
     * @notice Finalize proposal results after voting deadline
     */
    function executeProposal(uint256 _proposalId) external {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Proposal does not exist");
        Proposal storage p = proposals[_proposalId];
        require(block.timestamp >= p.deadline, "Voting period has not ended yet");
        require(!p.executed, "Proposal already executed");

        p.executed = true;
        p.passed = (p.votesFor > p.votesAgainst);

        emit ProposalExecuted(_proposalId, p.passed, p.votesFor, p.votesAgainst);
    }

    // --- DISPUTE RESOLUTION MECHANISM ---

    /**
     * @notice Backer raises a dispute against a campaign or milestone
     */
    function raiseDispute(
        uint256 _campaignId,
        uint256 _milestoneIndex,
        string calldata _reason,
        string calldata _evidenceUrl
    ) external returns (uint256) {
        require(_campaignId > 0 && _campaignId <= campaignCount, "Campaign does not exist");
        require(contributions[_campaignId][msg.sender] > 0, "Only contributors can raise disputes");
        require(bytes(_reason).length > 0, "Dispute reason cannot be empty");

        disputeCount++;
        uint256 newDispId = disputeCount;

        Dispute storage d = disputes[newDispId];
        d.id = newDispId;
        d.campaignId = _campaignId;
        d.milestoneIndex = _milestoneIndex;
        d.complainant = msg.sender;
        d.reason = _reason;
        d.evidenceUrl = _evidenceUrl;
        d.createdAt = block.timestamp;
        d.resolved = false;
        d.inFavorOfDonors = false;
        d.resolutionNotes = "";

        campaignDisputes[_campaignId].push(newDispId);
        campaignHasActiveDispute[_campaignId] = true;

        emit DisputeRaised(newDispId, _campaignId, _milestoneIndex, msg.sender, _reason);
        return newDispId;
    }

    /**
     * @notice Admin / Arbiter resolves a dispute
     */
    function resolveDispute(
        uint256 _disputeId,
        bool _inFavorOfDonors,
        string calldata _resolutionNotes
    ) external onlyAdmin {
        require(_disputeId > 0 && _disputeId <= disputeCount, "Dispute does not exist");
        Dispute storage d = disputes[_disputeId];
        require(!d.resolved, "Dispute already resolved");

        d.resolved = true;
        d.inFavorOfDonors = _inFavorOfDonors;
        d.resolutionNotes = _resolutionNotes;

        // Check if there are other unresolved disputes for this campaign
        bool stillHasActive = false;
        uint256[] storage cDisps = campaignDisputes[d.campaignId];
        for (uint256 i = 0; i < cDisps.length; i++) {
            if (!disputes[cDisps[i]].resolved) {
                stillHasActive = true;
                break;
            }
        }
        campaignHasActiveDispute[d.campaignId] = stillHasActive;

        emit DisputeResolved(_disputeId, d.campaignId, _inFavorOfDonors, _resolutionNotes);
    }

    // --- CREATOR ON-CHAIN REPUTATION SYSTEM ---

    /**
     * @notice Verifiable, transparent on-chain creator reputation score formula
     */
    function getCreatorReputation(address _creator)
        external
        view
        returns (
            uint256 score,
            uint256 totalCreated,
            uint256 successfulCampaigns,
            uint256 milestonesCompleted,
            uint256 disputesAgainst,
            string memory badge
        )
    {
        totalCreated = 0;
        successfulCampaigns = 0;
        milestonesCompleted = 0;
        disputesAgainst = 0;

        for (uint256 i = 1; i <= campaignCount; i++) {
            if (campaigns[i].creator == _creator) {
                totalCreated++;
                if (campaigns[i].amountRaised >= campaigns[i].goal) {
                    successfulCampaigns++;
                }
                // Check milestones
                for (uint256 m = 0; m < campaignMilestones[i].length; m++) {
                    if (campaignMilestones[i][m].approved) {
                        milestonesCompleted++;
                    }
                }
                // Check disputes
                uint256[] storage cDisps = campaignDisputes[i];
                for (uint256 d = 0; d < cDisps.length; d++) {
                    if (disputes[cDisps[d]].resolved && disputes[cDisps[d]].inFavorOfDonors) {
                        disputesAgainst++;
                    }
                }
            }
        }

        if (totalCreated == 0) {
            return (75, 0, 0, 0, 0, "New Creator");
        }

        int256 rawScore = 50 + int256(successfulCampaigns * 15) + int256(milestonesCompleted * 5) - int256(disputesAgainst * 20);
        uint256 failedCampaigns = totalCreated > successfulCampaigns ? totalCreated - successfulCampaigns : 0;
        rawScore -= int256(failedCampaigns * 10);

        if (rawScore > 100) rawScore = 100;
        if (rawScore < 10) rawScore = 10;

        score = uint256(rawScore);

        if (score >= 85) {
            badge = "Verified Champion";
        } else if (score >= 70) {
            badge = "Trusted Creator";
        } else if (score >= 50) {
            badge = "Standard";
        } else {
            badge = "High Caution";
        }

        return (score, totalCreated, successfulCampaigns, milestonesCompleted, disputesAgainst, badge);
    }

    // --- ACCOUNT VAULT (ADD MONEY / DEPOSIT / WITHDRAW) ---

    /**
     * @notice Deposit ETH into FundChain user vault balance
     */
    function depositFunds() external payable nonReentrant {
        require(msg.value > 0, "Deposit amount must be greater than zero");
        userVaultBalances[msg.sender] += msg.value;
        _registerInteractingUser(msg.sender);
        emit UserDeposited(msg.sender, msg.value);
    }

    /**
     * @notice Withdraw deposited ETH from FundChain user vault back to user's wallet
     */
    function withdrawVaultDeposit(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Amount must be greater than zero");
        require(userVaultBalances[msg.sender] >= _amount, "Insufficient vault deposit balance");

        userVaultBalances[msg.sender] -= _amount;

        (bool success, ) = payable(msg.sender).call{value: _amount}("");
        require(success, "Failed to send Ether from vault");

        emit UserWithdrewDeposit(msg.sender, _amount);
    }

    /**
     * @notice Returns user's deposited vault balance
     */
    function getVaultBalance(address _user) external view returns (uint256) {
        return userVaultBalances[_user];
    }

    // --- ADMIN MANAGEMENT ---

    /**
     * @notice Allows current admin to transfer administrative role to a new address
     */
    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "New admin cannot be zero address");
        address oldAdmin = admin;
        admin = _newAdmin;
        _registerInteractingUser(_newAdmin);
        emit AdminTransferred(oldAdmin, _newAdmin);
    }

    // --- VIEW / GETTER FUNCTIONS ---

    /**
     * @notice Returns milestones for a campaign
     */
    function getCampaignMilestones(uint256 _campaignId) external view returns (Milestone[] memory) {
        require(_campaignId > 0 && _campaignId <= campaignCount, "Campaign does not exist");
        return campaignMilestones[_campaignId];
    }

    /**
     * @notice Returns proposals for a campaign
     */
    function getCampaignProposals(uint256 _campaignId) external view returns (Proposal[] memory) {
        require(_campaignId > 0 && _campaignId <= campaignCount, "Campaign does not exist");
        uint256[] storage pIds = campaignProposals[_campaignId];
        Proposal[] memory result = new Proposal[](pIds.length);
        for (uint256 i = 0; i < pIds.length; i++) {
            result[i] = proposals[pIds[i]];
        }
        return result;
    }

    /**
     * @notice Returns disputes for a campaign
     */
    function getCampaignDisputes(uint256 _campaignId) external view returns (Dispute[] memory) {
        require(_campaignId > 0 && _campaignId <= campaignCount, "Campaign does not exist");
        uint256[] storage dIds = campaignDisputes[_campaignId];
        Dispute[] memory result = new Dispute[](dIds.length);
        for (uint256 i = 0; i < dIds.length; i++) {
            result[i] = disputes[dIds[i]];
        }
        return result;
    }

    /**
     * @notice Returns all disputes on the platform for admin oversight
     */
    function getAllDisputes() external view returns (Dispute[] memory) {
        Dispute[] memory allDisp = new Dispute[](disputeCount);
        for (uint256 i = 0; i < disputeCount; i++) {
            allDisp[i] = disputes[i + 1];
        }
        return allDisp;
    }

    /**
     * @notice Returns current state enum for a campaign
     */
    function getCampaignState(uint256 _campaignId) public view returns (CampaignState) {
        require(_campaignId > 0 && _campaignId <= campaignCount, "Campaign does not exist");
        Campaign storage c = campaigns[_campaignId];

        if (c.fundsReleased || c.withdrawn) {
            return CampaignState.FundsReleased;
        }

        if (block.timestamp < c.deadline) {
            if (c.amountRaised >= c.goal) {
                return CampaignState.GoalAchieved;
            }
            return CampaignState.Active;
        } else {
            if (c.amountRaised >= c.goal) {
                return CampaignState.AwaitingRelease;
            } else {
                if (c.escrowBalance == 0) {
                    return CampaignState.Refunded;
                }
                return CampaignState.RefundAvailable;
            }
        }
    }

    /**
     * @notice Retrieves full details of a specific campaign
     */
    function getCampaign(uint256 _campaignId) external view returns (Campaign memory) {
        require(_campaignId > 0 && _campaignId <= campaignCount, "Campaign does not exist");
        return campaigns[_campaignId];
    }

    /**
     * @notice Retrieves all campaigns stored in the contract
     */
    function getAllCampaigns() external view returns (Campaign[] memory) {
        Campaign[] memory allCampaigns = new Campaign[](campaignCount);
        for (uint256 i = 0; i < campaignCount; i++) {
            allCampaigns[i] = campaigns[i + 1];
        }
        return allCampaigns;
    }

    /**
     * @notice Returns total number of campaigns created
     */
    function getCampaignCount() external view returns (uint256) {
        return campaignCount;
    }

    /**
     * @notice Returns the amount contributed by a specific address to a campaign
     */
    function getContribution(uint256 _campaignId, address _contributor) external view returns (uint256) {
        return contributions[_campaignId][_contributor];
    }

    /**
     * @notice Returns comprehensive contribution, escrow, and refund status for an address
     */
    function getContributionStatus(uint256 _campaignId, address _contributor)
        external
        view
        returns (
            uint256 contributedAmount,
            bool hasClaimed,
            bool isEligibleForRefund,
            bool canWithdrawNow,
            bool isAwaitingRelease,
            bool isFundsReleased
        )
    {
        if (_campaignId == 0 || _campaignId > campaignCount) {
            return (0, false, false, false, false, false);
        }

        Campaign storage campaign = campaigns[_campaignId];
        contributedAmount = contributions[_campaignId][_contributor];
        hasClaimed = refundClaimed[_campaignId][_contributor];

        isFundsReleased = campaign.fundsReleased || campaign.withdrawn;

        isEligibleForRefund = (
            block.timestamp >= campaign.deadline &&
            campaign.amountRaised < campaign.goal &&
            contributedAmount > 0 &&
            !hasClaimed
        );

        canWithdrawNow = (
            (block.timestamp < campaign.deadline && !isFundsReleased && contributedAmount > 0) ||
            isEligibleForRefund
        );

        isAwaitingRelease = (
            block.timestamp >= campaign.deadline &&
            campaign.amountRaised >= campaign.goal &&
            !isFundsReleased
        );

        return (
            contributedAmount,
            hasClaimed,
            isEligibleForRefund,
            canWithdrawNow,
            isAwaitingRelease,
            isFundsReleased
        );
    }

    /**
     * @notice Returns the count of unique contributors for a campaign
     */
    function getContributorsCount(uint256 _campaignId) external view returns (uint256) {
        require(_campaignId > 0 && _campaignId <= campaignCount, "Campaign does not exist");
        return campaignContributors[_campaignId].length;
    }

    /**
     * @notice Returns the list of unique contributor addresses for a campaign
     */
    function getContributors(uint256 _campaignId) external view returns (address[] memory) {
        require(_campaignId > 0 && _campaignId <= campaignCount, "Campaign does not exist");
        return campaignContributors[_campaignId];
    }

    /**
     * @notice Returns list of all interacting user addresses
     */
    function getAllInteractingUsers() external view returns (address[] memory) {
        return allInteractingUsers;
    }

    /**
     * @notice Returns total number of interacting user addresses
     */
    function getInteractingUsersCount() external view returns (uint256) {
        return allInteractingUsers.length;
    }

    /**
     * @notice Comprehensive platform escrow and activity summary for Admin Dashboard
     */
    function getPlatformStats()
        external
        view
        returns (
            uint256 totalCampaigns,
            uint256 totalEscrowLocked,
            uint256 totalContributions,
            uint256 totalReleased,
            uint256 totalRefunded,
            uint256 totalUsers,
            uint256 contractBalance
        )
    {
        uint256 locked = 0;
        for (uint256 i = 1; i <= campaignCount; i++) {
            locked += campaigns[i].escrowBalance;
        }

        return (
            campaignCount,
            locked,
            totalContributionsAllTime,
            totalReleasedAllTime,
            totalRefundedAllTime,
            allInteractingUsers.length,
            address(this).balance
        );
    }
}
