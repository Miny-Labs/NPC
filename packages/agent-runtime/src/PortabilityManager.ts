import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

export interface NPCIdentity {
    tokenId: number;
    name: string;
    archetype: string;
    level: number;
    experience: number;
    reputation: number;
    gameHistory: string[];
    createdAt: number;
    lastActive: number;
    stats: Record<string, number>;
    achievements: string[];
}

export interface GameProfile {
    gameName: string;
    gameContract: string;
    isActive: boolean;
    registeredAt: number;
    npcCount: number;
}

export interface MigrationPackage {
    npcId: number;
    sourceGame: string;
    targetGame: string;
    exportedData: {
        personality: any;
        memories: any[];
        relationships: any[];
        stats: Record<string, number>;
        achievements: string[];
        customData: any;
    };
    timestamp: number;
    signature: string;
}

/**
 * Cross-game NPC portability manager using Universal Identity NFTs
 */
export class PortabilityManager {
    private provider: ethers.JsonRpcProvider;
    private signer: ethers.Wallet;
    private identityContract: ethers.Contract | null = null;
    private gameProfiles: Map<string, GameProfile> = new Map();
    private migrationHistory: MigrationPackage[] = [];

    constructor() {
        this.provider = new ethers.JsonRpcProvider(process.env.SOMNIA_TESTNET_RPC_URL);
        this.signer = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY || '', this.provider);
        
        this.loadIdentityContract();
        this.loadGameProfiles();
    }

    /**
     * Load the Universal Identity contract
     */
    private loadIdentityContract(): void {
        try {
            const addressesPath = path.join(__dirname, '..', '..', 'contracts', 'addresses.json');
            const contractAddresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
            
            if (contractAddresses.universalNPCIdentity && contractAddresses.universalNPCIdentity !== '0x0000000000000000000000000000000000000000') {
                // Use simplified ABI for now
                const universalNPCIdentityABI = [
                    "function mint(address to, string memory name, string memory archetype, tuple(uint256,uint256,uint256,uint256,uint256,uint256) memory stats) external returns (uint256)",
                    "function getNPCIdentity(uint256 tokenId) external view returns (tuple(string,string,tuple(uint256,uint256,uint256,uint256,uint256,uint256),uint256,string[],uint256,uint256))",
                    "function updateStats(uint256 tokenId, tuple(uint256,uint256,uint256,uint256,uint256,uint256) memory newStats) external",
                    "function addExperience(uint256 tokenId, uint256 experience) external",
                    "function unlockAchievement(uint256 tokenId, string memory achievement) external"
                ];
                
                this.identityContract = new ethers.Contract(
                    contractAddresses.universalNPCIdentity,
                    universalNPCIdentityABI,
                    this.signer
                );
                
                console.log('PortabilityManager: Connected to UniversalNPCIdentity contract at', contractAddresses.universalNPCIdentity);
            } else {
                console.log('PortabilityManager: UniversalNPCIdentity contract not deployed yet, using off-chain storage only');
            }
        } catch (error) {
            console.warn('PortabilityManager: Could not load Universal Identity contract:', error);
        }
    }

    /**
     * Load registered game profiles
     */
    private loadGameProfiles(): void {
        // In a real implementation, this would load from a database or config
        const defaultGames = [
            {
                gameName: 'npc-engine-core',
                gameContract: '0x0000000000000000000000000000000000000001',
                isActive: true,
                registeredAt: Date.now(),
                npcCount: 0
            },
            {
                gameName: 'fantasy-rpg',
                gameContract: '0x0000000000000000000000000000000000000002',
                isActive: true,
                registeredAt: Date.now(),
                npcCount: 0
            }
        ];

        defaultGames.forEach(game => {
            this.gameProfiles.set(game.gameName, game);
        });
    }

    /**
     * Create a new universal NPC identity
     */
    async createUniversalIdentity(
        npcData: {
            name: string;
            archetype: string;
            initialStats: Record<string, number>;
            personality: any;
        }
    ): Promise<number> {
        if (!this.identityContract) {
            throw new Error('Universal Identity contract not available');
        }

        try {
            const statNames = Object.keys(npcData.initialStats);
            const statValues = Object.values(npcData.initialStats);

            const tx = await this.identityContract.createNPCIdentity(
                this.signer.address,
                npcData.name,
                npcData.archetype,
                statNames,
                statValues
            );

            const receipt = await tx.wait();
            
            // Extract token ID from events
            const event = receipt.logs.find((log: any) => 
                log.topics[0] === ethers.id('NPCCreated(uint256,string,string)')
            );
            
            if (event) {
                const tokenId = parseInt(event.topics[1], 16);
                console.log(`PortabilityManager: Created universal identity ${tokenId} for ${npcData.name}`);
                return tokenId;
            }

            throw new Error('Could not extract token ID from transaction');

        } catch (error) {
            console.error('PortabilityManager: Error creating universal identity:', error);
            throw error;
        }
    }

    /**
     * Get NPC identity from blockchain
     */
    async getNPCIdentity(tokenId: number): Promise<NPCIdentity | null> {
        if (!this.identityContract) {
            console.warn('PortabilityManager: Universal Identity contract not available');
            return null;
        }

        try {
            const [name, archetype, level, experience, reputation, gameHistory, createdAt, lastActive] = 
                await this.identityContract.getNPCProfile(tokenId);

            // Get common stats
            const commonStats = ['strength', 'intelligence', 'charisma', 'dexterity', 'constitution', 'wisdom'];
            const stats: Record<string, number> = {};
            
            for (const stat of commonStats) {
                try {
                    const value = await this.identityContract.getNPCStat(tokenId, stat);
                    stats[stat] = Number(value);
                } catch (error) {
                    stats[stat] = 0; // Default if stat doesn't exist
                }
            }

            // Get achievements (simplified - in real implementation would query events)
            const achievements: string[] = [];

            return {
                tokenId,
                name,
                archetype,
                level: Number(level),
                experience: Number(experience),
                reputation: Number(reputation),
                gameHistory,
                createdAt: Number(createdAt),
                lastActive: Number(lastActive),
                stats,
                achievements
            };

        } catch (error) {
            console.error('PortabilityManager: Error getting NPC identity:', error);
            return null;
        }
    }

    /**
     * Export NPC data for migration
     */
    async exportNPCData(
        npcId: number,
        sourceGame: string,
        memoryManager: any,
        personalityData?: any
    ): Promise<MigrationPackage> {
        try {
            // Get on-chain identity
            const identity = await this.getNPCIdentity(npcId);
            if (!identity) {
                throw new Error('NPC identity not found');
            }

            // Get off-chain data
            const personality = personalityData || await memoryManager.getPersonalityProfile(npcId);
            const memories = await memoryManager.getRecentMemories(npcId, 100);
            
            // Get relationships (simplified)
            const relationships: any[] = [];

            const exportedData = {
                personality,
                memories,
                relationships,
                stats: identity.stats,
                achievements: identity.achievements,
                customData: {
                    level: identity.level,
                    experience: identity.experience,
                    reputation: identity.reputation,
                    archetype: identity.archetype
                }
            };

            // Create migration package
            const migrationPackage: MigrationPackage = {
                npcId,
                sourceGame,
                targetGame: '', // Will be set during import
                exportedData,
                timestamp: Date.now(),
                signature: '' // Would be signed in production
            };

            // Sign the package (simplified)
            const dataHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(exportedData)));
            migrationPackage.signature = await this.signer.signMessage(ethers.getBytes(dataHash));

            this.migrationHistory.push(migrationPackage);
            
            console.log(`PortabilityManager: Exported NPC ${npcId} data from ${sourceGame}`);
            return migrationPackage;

        } catch (error) {
            console.error('PortabilityManager: Error exporting NPC data:', error);
            throw error;
        }
    }

    /**
     * Import NPC data from migration package
     */
    async importNPCData(
        migrationPackage: MigrationPackage,
        targetGame: string,
        memoryManager: any
    ): Promise<boolean> {
        try {
            // Verify signature (simplified)
            const dataHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(migrationPackage.exportedData)));
            const recoveredAddress = ethers.verifyMessage(ethers.getBytes(dataHash), migrationPackage.signature);
            
            if (recoveredAddress.toLowerCase() !== this.signer.address.toLowerCase()) {
                throw new Error('Invalid migration package signature');
            }

            // Update on-chain migration record
            if (this.identityContract) {
                try {
                    const tx = await this.identityContract.migrateToGame(migrationPackage.npcId, targetGame);
                    await tx.wait();
                } catch (error) {
                    console.warn('PortabilityManager: Could not update on-chain migration record:', error);
                }
            }

            // Import personality
            if (migrationPackage.exportedData.personality) {
                const personality = migrationPackage.exportedData.personality;
                const traits = Object.entries(personality.traits).map(([trait, value]) => ({
                    trait: trait as any,
                    value: value as number
                }));

                await memoryManager.initializePersonality(
                    migrationPackage.npcId,
                    traits,
                    personality.backstory || 'Migrated NPC',
                    personality.quirks || []
                );
            }

            // Import memories
            for (const memory of migrationPackage.exportedData.memories) {
                await memoryManager.addMemory(
                    migrationPackage.npcId,
                    memory.relatedAddress,
                    memory.memoryType,
                    {
                        ...memory.content,
                        migrated: true,
                        sourceGame: migrationPackage.sourceGame
                    },
                    memory.emotionalWeight,
                    [...memory.tags, 'migrated'],
                    memory.isPositive
                );
            }

            // Update migration package
            migrationPackage.targetGame = targetGame;
            
            console.log(`PortabilityManager: Imported NPC ${migrationPackage.npcId} to ${targetGame}`);
            return true;

        } catch (error) {
            console.error('PortabilityManager: Error importing NPC data:', error);
            return false;
        }
    }

    /**
     * Update NPC stats on-chain
     */
    async updateNPCStats(tokenId: number, stats: Record<string, number>): Promise<void> {
        if (!this.identityContract) {
            console.warn('PortabilityManager: Universal Identity contract not available');
            return;
        }

        try {
            const statNames = Object.keys(stats);
            const statValues = Object.values(stats);

            const tx = await this.identityContract.updateStats(tokenId, statNames, statValues);
            await tx.wait();

            console.log(`PortabilityManager: Updated stats for NPC ${tokenId}`);

        } catch (error) {
            console.error('PortabilityManager: Error updating NPC stats:', error);
        }
    }

    /**
     * Add experience to NPC
     */
    async addExperience(tokenId: number, experience: number): Promise<void> {
        if (!this.identityContract) {
            console.warn('PortabilityManager: Universal Identity contract not available');
            return;
        }

        try {
            const tx = await this.identityContract.addExperience(tokenId, experience);
            await tx.wait();

            console.log(`PortabilityManager: Added ${experience} XP to NPC ${tokenId}`);

        } catch (error) {
            console.error('PortabilityManager: Error adding experience:', error);
        }
    }

    /**
     * Unlock achievement for NPC
     */
    async unlockAchievement(tokenId: number, achievement: string): Promise<void> {
        if (!this.identityContract) {
            console.warn('PortabilityManager: Universal Identity contract not available');
            return;
        }

        try {
            const tx = await this.identityContract.unlockAchievement(tokenId, achievement);
            await tx.wait();

            console.log(`PortabilityManager: Unlocked achievement "${achievement}" for NPC ${tokenId}`);

        } catch (error) {
            console.error('PortabilityManager: Error unlocking achievement:', error);
        }
    }

    /**
     * Register a new game for cross-game compatibility
     */
    async registerGame(gameName: string, gameContract: string): Promise<void> {
        const gameProfile: GameProfile = {
            gameName,
            gameContract,
            isActive: true,
            registeredAt: Date.now(),
            npcCount: 0
        };

        this.gameProfiles.set(gameName, gameProfile);

        // Register on-chain if contract is available
        if (this.identityContract) {
            try {
                const tx = await this.identityContract.registerGame(gameName, gameContract);
                await tx.wait();
                console.log(`PortabilityManager: Registered game "${gameName}" on-chain`);
            } catch (error) {
                console.warn('PortabilityManager: Could not register game on-chain:', error);
            }
        }

        console.log(`PortabilityManager: Registered game "${gameName}"`);
    }

    /**
     * Get registered games
     */
    getRegisteredGames(): GameProfile[] {
        return Array.from(this.gameProfiles.values());
    }

    /**
     * Get migration history
     */
    getMigrationHistory(): MigrationPackage[] {
        return this.migrationHistory;
    }

    /**
     * Generate portable NPC data URL for sharing
     */
    generatePortableURL(migrationPackage: MigrationPackage): string {
        const encodedData = Buffer.from(JSON.stringify(migrationPackage)).toString('base64');
        return `npc://import/${encodedData}`;
    }

    /**
     * Parse portable NPC data URL
     */
    parsePortableURL(url: string): MigrationPackage | null {
        try {
            if (!url.startsWith('npc://import/')) {
                return null;
            }

            const encodedData = url.replace('npc://import/', '');
            const decodedData = Buffer.from(encodedData, 'base64').toString('utf8');
            return JSON.parse(decodedData);

        } catch (error) {
            console.error('PortabilityManager: Error parsing portable URL:', error);
            return null;
        }
    }
}