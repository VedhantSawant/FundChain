// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Crowdfunding - FundChain Smart Contract
 * @author FundChain Team
 * @notice Decentralized Crowdfunding Platform with an Automated Refund Mechanism.
 * @dev Implements checks-effects-interactions, re-entrancy protection, and secure ETH transfers.
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

    // --- STRUCTS ---
    struct Campaign {
        uint256 id;
        address payable creator;
        string title;
        string description;
        uint256 goal;          // In wei
        uint256 amountRaised;  // In wei
        uint256 deadline;      // Unix timestamp (seconds)
        string category;       // e.g. Agriculture, Education, Healthcare, Technology, etc.
        string imageUrl;       // Image URL or IPFS hash
        bool withdrawn;        // True if creator has successfully withdrawn funds
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

    // campaignId => contributor => has contributed flag for unique contributor tracking
    mapping(uint256 => mapping(address => bool)) private hasContributed;

    // --- EVENTS ---
    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
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

    event FundsWithdrawn(
        uint256 indexed campaignId,
        address indexed creator,
        uint256 amount
    );

    event RefundClaimed(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 amount
    );

    // --- CONSTRUCTOR ---
    constructor() {
        _status = _NOT_ENTERED;
    }

    // --- CORE FUNCTIONS ---

    /**
     * @notice Creates a new fundraising campaign
     * @param _title Title of the campaign
     * @param _description Detailed description of the campaign
     * @param _goal Funding goal in wei (must be > 0)
     * @param _deadline Unix timestamp when the campaign ends (must be in the future)
     * @param _category Category identifier (e.g., Agriculture, Healthcare)
     * @param _imageUrl Optional image URL or IPFS link
     * @return campaignId The unique ID of the created campaign
     */
    function createCampaign(
        string memory _title,
        string memory _description,
        uint256 _goal,
        uint256 _deadline,
        string memory _category,
        string memory _imageUrl
    ) external returns (uint256) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(_goal > 0, "Funding goal must be greater than zero");
        require(_deadline > block.timestamp, "Deadline must be in the future");
        require(bytes(_category).length > 0, "Category cannot be empty");

        campaignCount++;
        uint256 newCampaignId = campaignCount;

        campaigns[newCampaignId] = Campaign({
            id: newCampaignId,
            creator: payable(msg.sender),
            title: _title,
            description: _description,
            goal: _goal,
            amountRaised: 0,
            deadline: _deadline,
            category: _category,
            imageUrl: _imageUrl,
            withdrawn: false
        });

        emit CampaignCreated(
            newCampaignId,
            msg.sender,
            _title,
            _goal,
            _deadline,
            _category,
            _imageUrl
        );

        return newCampaignId;
    }

    /**
     * @notice Allows users to contribute ETH to an active campaign
     * @param _campaignId ID of the campaign to contribute to
     */
    function contribute(uint256 _campaignId) external payable nonReentrant {
        require(_campaignId > 0 && _campaignId <= campaignCount, "Campaign does not exist");
        Campaign storage campaign = campaigns[_campaignId];

        require(block.timestamp < campaign.deadline, "Campaign deadline has passed");
        require(msg.value > 0, "Contribution must be greater than zero");
        require(msg.sender != campaign.creator, "Campaign creator cannot contribute to own campaign");

        // Update campaign totals and contributor records
        campaign.amountRaised += msg.value;
        contributions[_campaignId][msg.sender] += msg.value;

        if (!hasContributed[_campaignId][msg.sender]) {
            hasContributed[_campaignId][msg.sender] = true;
            campaignContributors[_campaignId].push(msg.sender);
        }

        emit ContributionReceived(_campaignId, msg.sender, msg.value);
    }

    /**
     * @notice Allows the campaign creator to withdraw funds if goal is achieved and deadline has passed
     * @param _campaignId ID of the campaign to withdraw from
     */
    function withdrawFunds(uint256 _campaignId) external nonReentrant {
        require(_campaignId > 0 && _campaignId <= campaignCount, "Campaign does not exist");
        Campaign storage campaign = campaigns[_campaignId];

        require(msg.sender == campaign.creator, "Only the campaign creator can withdraw funds");
        require(block.timestamp >= campaign.deadline, "Cannot withdraw before campaign deadline");
        require(campaign.amountRaised >= campaign.goal, "Funding goal has not been reached");
        require(!campaign.withdrawn, "Funds have already been withdrawn");

        // State update prior to external transfer (Checks-Effects-Interactions)
        campaign.withdrawn = true;
        uint256 amountToTransfer = campaign.amountRaised;

        // Secure Ether transfer
        (bool success, ) = campaign.creator.call{value: amountToTransfer}("");
        require(success, "Failed to send Ether to campaign creator");

        emit FundsWithdrawn(_campaignId, campaign.creator, amountToTransfer);
    }

    /**
     * @notice Allows contributors to claim a 100% refund if the campaign failed to reach its goal by deadline
     * @param _campaignId ID of the failed campaign
     */
    function claimRefund(uint256 _campaignId) external nonReentrant {
        require(_campaignId > 0 && _campaignId <= campaignCount, "Campaign does not exist");
        Campaign storage campaign = campaigns[_campaignId];

        require(block.timestamp >= campaign.deadline, "Cannot claim refund before campaign deadline");
        require(campaign.amountRaised < campaign.goal, "Funding goal was reached; refunds not available");

        uint256 contributedAmount = contributions[_campaignId][msg.sender];
        require(contributedAmount > 0, "No contribution found for this address");
        require(!refundClaimed[_campaignId][msg.sender], "Refund has already been claimed");

        // State update prior to external transfer (Checks-Effects-Interactions)
        refundClaimed[_campaignId][msg.sender] = true;

        // Secure Ether transfer
        (bool success, ) = payable(msg.sender).call{value: contributedAmount}("");
        require(success, "Failed to send refund Ether");

        emit RefundClaimed(_campaignId, msg.sender, contributedAmount);
    }

    // --- VIEW / GETTER FUNCTIONS ---

    /**
     * @notice Retrieves full details of a specific campaign
     * @param _campaignId ID of the campaign
     */
    function getCampaign(uint256 _campaignId) external view returns (Campaign memory) {
        require(_campaignId > 0 && _campaignId <= campaignCount, "Campaign does not exist");
        return campaigns[_campaignId];
    }

    /**
     * @notice Retrieves all campaigns stored in the contract
     * @return An array of all Campaign structs
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
     * @param _campaignId ID of the campaign
     * @param _contributor Address of the contributor
     */
    function getContribution(uint256 _campaignId, address _contributor) external view returns (uint256) {
        return contributions[_campaignId][_contributor];
    }

    /**
     * @notice Returns comprehensive contribution and refund status for an address
     * @param _campaignId ID of the campaign
     * @param _contributor Address of the contributor
     * @return contributedAmount Total wei contributed by address
     * @param hasClaimed True if the refund was already claimed
     * @param isEligibleForRefund True if the contributor can currently claim a refund
     */
    function getContributionStatus(uint256 _campaignId, address _contributor)
        external
        view
        returns (
            uint256 contributedAmount,
            bool hasClaimed,
            bool isEligibleForRefund
        )
    {
        if (_campaignId == 0 || _campaignId > campaignCount) {
            return (0, false, false);
        }

        Campaign storage campaign = campaigns[_campaignId];
        contributedAmount = contributions[_campaignId][_contributor];
        hasClaimed = refundClaimed[_campaignId][_contributor];

        isEligibleForRefund = (
            block.timestamp >= campaign.deadline &&
            campaign.amountRaised < campaign.goal &&
            contributedAmount > 0 &&
            !hasClaimed
        );

        return (contributedAmount, hasClaimed, isEligibleForRefund);
    }

    /**
     * @notice Returns the count of unique contributors for a campaign
     * @param _campaignId ID of the campaign
     */
    function getContributorsCount(uint256 _campaignId) external view returns (uint256) {
        require(_campaignId > 0 && _campaignId <= campaignCount, "Campaign does not exist");
        return campaignContributors[_campaignId].length;
    }

    /**
     * @notice Returns the list of unique contributor addresses for a campaign
     * @param _campaignId ID of the campaign
     */
    function getContributors(uint256 _campaignId) external view returns (address[] memory) {
        require(_campaignId > 0 && _campaignId <= campaignCount, "Campaign does not exist");
        return campaignContributors[_campaignId];
    }
}
