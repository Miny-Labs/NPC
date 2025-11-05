// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title NPCMarketplace
 * @dev Decentralized marketplace for NPC templates with ratings and royalties
 */
contract NPCMarketplace is ReentrancyGuard, Ownable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _listingIds;
    
    // Marketplace fee (in basis points, e.g., 250 = 2.5%)
    uint256 public marketplaceFee = 250;
    uint256 public constant MAX_FEE = 1000; // 10% max
    
    struct Listing {
        uint256 id;
        address seller;
        string npcTemplateHash; // IPFS hash of NPC template
        uint256 price;
        address paymentToken;
        string category; // "free", "premium", "exclusive"
        uint256 downloads;
        uint256 totalRating;
        uint256 reviewCount;
        bool isActive;
        uint256 createdAt;
        uint256 updatedAt;
    }
    
    struct Review {
        address reviewer;
        uint256 rating; // 1-5 stars
        string comment;
        uint256 timestamp;
        bool isVerified; // Verified purchase
    }
    
    struct CreatorStats {
        uint256 totalSales;
        uint256 totalEarnings;
        uint256 npcCount;
        uint256 averageRating;
        bool isVerified;
    }
    
    // Mappings
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Review[]) public listingReviews;
    mapping(address => CreatorStats) public creatorStats;
    mapping(address => mapping(uint256 => bool)) public hasPurchased;
    mapping(address => uint256[]) public creatorListings;
    
    // Events
    event ListingCreated(
        uint256 indexed listingId,
        address indexed seller,
        string npcTemplateHash,
        uint256 price,
        address paymentToken,
        string category
    );
    
    event NPCPurchased(
        uint256 indexed listingId,
        address indexed buyer,
        address indexed seller,
        uint256 price,
        uint256 marketplaceFeeAmount
    );
    
    event ReviewAdded(
        uint256 indexed listingId,
        address indexed reviewer,
        uint256 rating,
        string comment
    );
    
    event ListingUpdated(
        uint256 indexed listingId,
        uint256 newPrice,
        bool isActive
    );
    
    event CreatorVerified(address indexed creator);
    
    constructor() {}
    
    /**
     * @dev Create a new NPC listing
     */
    function createListing(
        string memory npcTemplateHash,
        uint256 price,
        address paymentToken,
        string memory category
    ) external returns (uint256) {
        require(bytes(npcTemplateHash).length > 0, "Invalid template hash");
        require(price > 0, "Price must be greater than 0");
        require(paymentToken != address(0), "Invalid payment token");
        
        _listingIds.increment();
        uint256 listingId = _listingIds.current();
        
        listings[listingId] = Listing({
            id: listingId,
            seller: msg.sender,
            npcTemplateHash: npcTemplateHash,
            price: price,
            paymentToken: paymentToken,
            category: category,
            downloads: 0,
            totalRating: 0,
            reviewCount: 0,
            isActive: true,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });
        
        creatorListings[msg.sender].push(listingId);
        creatorStats[msg.sender].npcCount++;
        
        emit ListingCreated(
            listingId,
            msg.sender,
            npcTemplateHash,
            price,
            paymentToken,
            category
        );
        
        return listingId;
    }
    
    /**
     * @dev Purchase an NPC template
     */
    function purchaseNPC(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.isActive, "Listing not active");
        require(listing.seller != msg.sender, "Cannot buy own listing");
        require(!hasPurchased[msg.sender][listingId], "Already purchased");
        
        IERC20 paymentToken = IERC20(listing.paymentToken);
        uint256 marketplaceFeeAmount = (listing.price * marketplaceFee) / 10000;
        uint256 sellerAmount = listing.price - marketplaceFeeAmount;
        
        // Transfer payment
        require(
            paymentToken.transferFrom(msg.sender, listing.seller, sellerAmount),
            "Payment to seller failed"
        );
        
        if (marketplaceFeeAmount > 0) {
            require(
                paymentToken.transferFrom(msg.sender, owner(), marketplaceFeeAmount),
                "Marketplace fee transfer failed"
            );
        }
        
        // Update stats
        listing.downloads++;
        listing.updatedAt = block.timestamp;
        hasPurchased[msg.sender][listingId] = true;
        
        creatorStats[listing.seller].totalSales++;
        creatorStats[listing.seller].totalEarnings += sellerAmount;
        
        emit NPCPurchased(
            listingId,
            msg.sender,
            listing.seller,
            listing.price,
            marketplaceFeeAmount
        );
    }
    
    /**
     * @dev Add a review for an NPC
     */
    function addReview(
        uint256 listingId,
        uint256 rating,
        string memory comment
    ) external {
        require(rating >= 1 && rating <= 5, "Rating must be 1-5");
        require(hasPurchased[msg.sender][listingId], "Must purchase to review");
        
        Listing storage listing = listings[listingId];
        
        // Check if user already reviewed
        Review[] storage reviews = listingReviews[listingId];
        for (uint256 i = 0; i < reviews.length; i++) {
            require(reviews[i].reviewer != msg.sender, "Already reviewed");
        }
        
        reviews.push(Review({
            reviewer: msg.sender,
            rating: rating,
            comment: comment,
            timestamp: block.timestamp,
            isVerified: true
        }));
        
        // Update listing rating
        listing.totalRating += rating;
        listing.reviewCount++;
        listing.updatedAt = block.timestamp;
        
        // Update creator average rating
        CreatorStats storage stats = creatorStats[listing.seller];
        uint256 totalCreatorRating = 0;
        uint256 totalCreatorReviews = 0;
        
        uint256[] memory creatorListingIds = creatorListings[listing.seller];
        for (uint256 i = 0; i < creatorListingIds.length; i++) {
            Listing memory creatorListing = listings[creatorListingIds[i]];
            totalCreatorRating += creatorListing.totalRating;
            totalCreatorReviews += creatorListing.reviewCount;
        }
        
        if (totalCreatorReviews > 0) {
            stats.averageRating = (totalCreatorRating * 100) / totalCreatorReviews; // Store as percentage
        }
        
        emit ReviewAdded(listingId, msg.sender, rating, comment);
    }
    
    /**
     * @dev Update listing price and status
     */
    function updateListing(
        uint256 listingId,
        uint256 newPrice,
        bool isActive
    ) external {
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "Not listing owner");
        
        if (newPrice > 0) {
            listing.price = newPrice;
        }
        listing.isActive = isActive;
        listing.updatedAt = block.timestamp;
        
        emit ListingUpdated(listingId, newPrice, isActive);
    }
    
    /**
     * @dev Verify a creator (only owner)
     */
    function verifyCreator(address creator) external onlyOwner {
        creatorStats[creator].isVerified = true;
        emit CreatorVerified(creator);
    }
    
    /**
     * @dev Set marketplace fee (only owner)
     */
    function setMarketplaceFee(uint256 newFee) external onlyOwner {
        require(newFee <= MAX_FEE, "Fee too high");
        marketplaceFee = newFee;
    }
    
    /**
     * @dev Get listing details
     */
    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }
    
    /**
     * @dev Get listing reviews
     */
    function getListingReviews(uint256 listingId) external view returns (Review[] memory) {
        return listingReviews[listingId];
    }
    
    /**
     * @dev Get creator's listings
     */
    function getCreatorListings(address creator) external view returns (uint256[] memory) {
        return creatorListings[creator];
    }
    
    /**
     * @dev Get listing average rating
     */
    function getListingRating(uint256 listingId) external view returns (uint256) {
        Listing memory listing = listings[listingId];
        if (listing.reviewCount == 0) return 0;
        return (listing.totalRating * 100) / listing.reviewCount; // Return as percentage (e.g., 450 = 4.5 stars)
    }
    
    /**
     * @dev Get total number of listings
     */
    function getTotalListings() external view returns (uint256) {
        return _listingIds.current();
    }
    
    /**
     * @dev Check if user has purchased a listing
     */
    function hasUserPurchased(address user, uint256 listingId) external view returns (bool) {
        return hasPurchased[user][listingId];
    }
}