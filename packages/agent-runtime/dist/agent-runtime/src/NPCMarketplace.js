"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NPCMarketplace = void 0;
const ethers_1 = require("ethers");
/**
 * Decentralized NPC Marketplace with community features
 */
class NPCMarketplace {
    constructor(apiBaseUrl = 'https://api.npc-marketplace.com') {
        this.marketplaceContract = null;
        this.listings = new Map();
        this.creators = new Map();
        this.provider = new ethers_1.ethers.JsonRpcProvider(process.env.SOMNIA_TESTNET_RPC_URL);
        this.signer = new ethers_1.ethers.Wallet(process.env.WALLET_PRIVATE_KEY || '', this.provider);
        this.apiBaseUrl = apiBaseUrl;
        this.initializeContract();
        this.loadMarketplaceData();
    }
    /**
     * Initialize NPCMarketplace contract connection
     */
    async initializeContract() {
        try {
            // Load contract addresses
            const addressesPath = require('path').join(__dirname, '../../contracts/addresses.json');
            if (require('fs').existsSync(addressesPath)) {
                const addresses = JSON.parse(require('fs').readFileSync(addressesPath, 'utf8'));
                if (addresses.npcMarketplace && addresses.npcMarketplace !== '0x0000000000000000000000000000000000000000') {
                    // Load contract ABI
                    const npcMarketplaceABI = [
                        "function createListing(string memory npcTemplateHash, uint256 price, address paymentToken, string memory category) external returns (uint256)",
                        "function purchaseNPC(uint256 listingId) external",
                        "function addReview(uint256 listingId, uint256 rating, string memory comment) external",
                        "function getListing(uint256 listingId) external view returns (tuple(uint256,address,string,uint256,address,string,uint256,uint256,uint256,bool,uint256,uint256))",
                        "function getTotalListings() external view returns (uint256)"
                    ];
                    this.marketplaceContract = new ethers_1.ethers.Contract(addresses.npcMarketplace, npcMarketplaceABI, this.signer);
                    console.log('NPCMarketplace: Connected to NPCMarketplace contract at', addresses.npcMarketplace);
                }
                else {
                    console.log('NPCMarketplace: NPCMarketplace contract not deployed yet, using off-chain storage only');
                }
            }
        }
        catch (error) {
            console.error('NPCMarketplace: Failed to initialize contract:', error);
        }
    }
    /**
     * Load marketplace data (in production, this would be from IPFS/decentralized storage)
     */
    async loadMarketplaceData() {
        // Mock data for demonstration
        const mockListings = [
            {
                id: 'npc_001',
                npcTemplate: {
                    id: 'warrior_template_001',
                    name: 'Elite Guardian',
                    archetype: 'warrior',
                    personality: {
                        friendly: 30,
                        aggressive: 85,
                        greedy: 20,
                        cautious: 70,
                        loyal: 95,
                        cunning: 40,
                        honest: 80,
                        mysterious: 25,
                        cheerful: 35
                    },
                    backstory: 'A battle-hardened warrior who has sworn to protect the innocent.',
                    quirks: ['Always polishes armor', 'Speaks in military terms', 'Distrusts magic'],
                    appearance: {
                        description: 'Tall, muscular figure in gleaming plate armor',
                        avatar: 'https://example.com/warrior.png'
                    },
                    capabilities: ['combat', 'protection', 'leadership'],
                    dialogueStyle: 'formal',
                    behaviorRules: [
                        {
                            id: 'rule_001',
                            condition: 'Player in danger',
                            action: 'Rush to defend',
                            priority: 1,
                            isActive: true
                        }
                    ],
                    createdAt: Date.now() - 86400000,
                    updatedAt: Date.now() - 86400000
                },
                seller: '0x742d35Cc6634C0532925a3b8D4B9C05e5b8E4C7d',
                price: '5000000000000000000', // 5 STT
                tokenAddress: '0x6F30b8B34D042eF9f9bcFE0716CD44B607EA7845',
                category: 'premium',
                downloads: 156,
                rating: 4.8,
                reviews: [],
                tags: ['warrior', 'guardian', 'combat', 'protection'],
                isVerified: true,
                createdAt: Date.now() - 86400000,
                updatedAt: Date.now() - 86400000
            }
        ];
        mockListings.forEach(listing => {
            this.listings.set(listing.id, listing);
        });
        console.log('NPCMarketplace: Loaded mock marketplace data');
    }
    /**
     * List an NPC template for sale
     */
    async listNPC(npcTemplate, price, tokenAddress, category = 'premium', tags = []) {
        try {
            const listingId = `listing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const listing = {
                id: listingId,
                npcTemplate,
                seller: this.signer.address,
                price,
                tokenAddress,
                category,
                downloads: 0,
                rating: 0,
                reviews: [],
                tags: [...tags, npcTemplate.archetype, ...npcTemplate.capabilities],
                isVerified: false,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            // Store locally
            this.listings.set(listingId, listing);
            // Create on-chain listing if contract is available
            if (this.marketplaceContract) {
                try {
                    // In production, upload NPC template to IPFS and use hash
                    const npcTemplateHash = `ipfs://QmMock${Date.now()}`;
                    const tx = await this.marketplaceContract.createListing(npcTemplateHash, price, tokenAddress, category);
                    console.log(`NPCMarketplace: Created on-chain listing for "${npcTemplate.name}" - TX: ${tx.hash}`);
                }
                catch (error) {
                    console.warn('NPCMarketplace: Failed to create on-chain listing:', error);
                }
            }
            console.log(`NPCMarketplace: Listed NPC "${npcTemplate.name}" for ${ethers_1.ethers.formatEther(price)} STT`);
            return listingId;
        }
        catch (error) {
            console.error('NPCMarketplace: Error listing NPC:', error);
            throw error;
        }
    }
    /**
     * Purchase an NPC template
     */
    async purchaseNPC(listingId) {
        const listing = this.listings.get(listingId);
        if (!listing) {
            throw new Error('Listing not found');
        }
        try {
            // In production, this would handle payment via smart contract
            console.log(`NPCMarketplace: Simulating purchase of "${listing.npcTemplate.name}" for ${ethers_1.ethers.formatEther(listing.price)} STT`);
            // Update download count
            listing.downloads++;
            listing.updatedAt = Date.now();
            // Return a copy of the NPC template
            const purchasedNPC = {
                ...listing.npcTemplate,
                id: `purchased_${Date.now()}`,
                name: `${listing.npcTemplate.name} (Copy)`,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            return purchasedNPC;
        }
        catch (error) {
            console.error('NPCMarketplace: Error purchasing NPC:', error);
            throw error;
        }
    }
    /**
     * Search marketplace listings
     */
    async searchNPCs(query) {
        let results = Array.from(this.listings.values());
        // Apply filters
        if (query.searchTerm) {
            const term = query.searchTerm.toLowerCase();
            results = results.filter(listing => listing.npcTemplate.name.toLowerCase().includes(term) ||
                listing.npcTemplate.backstory.toLowerCase().includes(term) ||
                listing.tags.some(tag => tag.toLowerCase().includes(term)));
        }
        if (query.category) {
            results = results.filter(listing => listing.category === query.category);
        }
        if (query.archetype) {
            results = results.filter(listing => listing.npcTemplate.archetype === query.archetype);
        }
        if (query.priceRange) {
            const minPrice = BigInt(query.priceRange.min);
            const maxPrice = BigInt(query.priceRange.max);
            results = results.filter(listing => {
                const price = BigInt(listing.price);
                return price >= minPrice && price <= maxPrice;
            });
        }
        if (query.tags && query.tags.length > 0) {
            results = results.filter(listing => query.tags.some(tag => listing.tags.includes(tag)));
        }
        // Apply sorting
        switch (query.sortBy) {
            case 'price':
                results.sort((a, b) => Number(BigInt(a.price) - BigInt(b.price)));
                break;
            case 'rating':
                results.sort((a, b) => b.rating - a.rating);
                break;
            case 'downloads':
                results.sort((a, b) => b.downloads - a.downloads);
                break;
            case 'newest':
            default:
                results.sort((a, b) => b.createdAt - a.createdAt);
                break;
        }
        // Apply limit
        if (query.limit) {
            results = results.slice(0, query.limit);
        }
        return results;
    }
    /**
     * Add a review for an NPC
     */
    async addReview(listingId, rating, comment) {
        const listing = this.listings.get(listingId);
        if (!listing) {
            throw new Error('Listing not found');
        }
        const review = {
            id: `review_${Date.now()}`,
            reviewer: this.signer.address,
            rating: Math.max(1, Math.min(5, rating)), // Clamp to 1-5
            comment,
            createdAt: Date.now(),
            isVerified: true // In production, would verify purchase
        };
        listing.reviews.push(review);
        // Recalculate average rating
        const totalRating = listing.reviews.reduce((sum, r) => sum + r.rating, 0);
        listing.rating = totalRating / listing.reviews.length;
        listing.updatedAt = Date.now();
        console.log(`NPCMarketplace: Added review for "${listing.npcTemplate.name}" - ${rating} stars`);
    }
    /**
     * Get creator profile
     */
    async getCreatorProfile(address) {
        // In production, this would fetch from decentralized storage
        if (this.creators.has(address)) {
            return this.creators.get(address);
        }
        // Create basic profile from on-chain data
        const creatorListings = Array.from(this.listings.values())
            .filter(listing => listing.seller.toLowerCase() === address.toLowerCase());
        if (creatorListings.length === 0) {
            return null;
        }
        const totalSales = creatorListings.reduce((sum, listing) => sum + listing.downloads, 0);
        const totalEarnings = creatorListings.reduce((sum, listing) => {
            return sum + (BigInt(listing.price) * BigInt(listing.downloads));
        }, BigInt(0));
        const avgRating = creatorListings.reduce((sum, listing) => sum + listing.rating, 0) / creatorListings.length;
        const profile = {
            address,
            username: `Creator_${address.slice(-6)}`,
            bio: 'NPC Creator',
            avatar: '',
            totalSales,
            totalEarnings: totalEarnings.toString(),
            rating: avgRating,
            npcCount: creatorListings.length,
            followers: 0,
            isVerified: false,
            specialties: [...new Set(creatorListings.map(l => l.npcTemplate.archetype))],
            joinedAt: Math.min(...creatorListings.map(l => l.createdAt))
        };
        this.creators.set(address, profile);
        return profile;
    }
    /**
     * Get marketplace statistics
     */
    async getMarketplaceStats() {
        const listings = Array.from(this.listings.values());
        const totalSales = listings.reduce((sum, listing) => sum + listing.downloads, 0);
        const totalVolume = listings.reduce((sum, listing) => {
            return sum + (BigInt(listing.price) * BigInt(listing.downloads));
        }, BigInt(0));
        // Category counts
        const categoryMap = new Map();
        listings.forEach(listing => {
            categoryMap.set(listing.category, (categoryMap.get(listing.category) || 0) + 1);
        });
        const topCategories = Array.from(categoryMap.entries())
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count);
        // Trending NPCs (by recent downloads and rating)
        const trendingNPCs = listings
            .filter(listing => listing.downloads > 0)
            .sort((a, b) => {
            const scoreA = a.downloads * a.rating;
            const scoreB = b.downloads * b.rating;
            return scoreB - scoreA;
        })
            .slice(0, 10);
        // Top creators
        const creatorAddresses = [...new Set(listings.map(l => l.seller))];
        const topCreators = [];
        for (const address of creatorAddresses.slice(0, 10)) {
            const profile = await this.getCreatorProfile(address);
            if (profile) {
                topCreators.push(profile);
            }
        }
        topCreators.sort((a, b) => b.totalSales - a.totalSales);
        return {
            totalListings: listings.length,
            totalSales,
            totalVolume: totalVolume.toString(),
            topCategories,
            trendingNPCs,
            topCreators
        };
    }
    /**
     * Get all listings
     */
    async getAllListings() {
        return Array.from(this.listings.values());
    }
    /**
     * Get listing by ID
     */
    async getListing(id) {
        return this.listings.get(id) || null;
    }
}
exports.NPCMarketplace = NPCMarketplace;
