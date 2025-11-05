"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryManager = exports.MemoryType = exports.PersonalityTrait = void 0;
const redis_1 = require("redis");
const sqlite3_1 = __importDefault(require("sqlite3"));
const uuid_1 = require("uuid");
const ethers_1 = require("ethers");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
var PersonalityTrait;
(function (PersonalityTrait) {
    PersonalityTrait["FRIENDLY"] = "friendly";
    PersonalityTrait["GRUMPY"] = "grumpy";
    PersonalityTrait["GREEDY"] = "greedy";
    PersonalityTrait["CAUTIOUS"] = "cautious";
    PersonalityTrait["AGGRESSIVE"] = "aggressive";
    PersonalityTrait["LOYAL"] = "loyal";
    PersonalityTrait["CUNNING"] = "cunning";
    PersonalityTrait["HONEST"] = "honest";
    PersonalityTrait["MYSTERIOUS"] = "mysterious";
    PersonalityTrait["CHEERFUL"] = "cheerful";
})(PersonalityTrait || (exports.PersonalityTrait = PersonalityTrait = {}));
var MemoryType;
(function (MemoryType) {
    MemoryType["INTERACTION"] = "interaction";
    MemoryType["ACHIEVEMENT"] = "achievement";
    MemoryType["RELATIONSHIP"] = "relationship";
    MemoryType["EVENT"] = "event";
    MemoryType["DIALOGUE"] = "dialogue";
})(MemoryType || (exports.MemoryType = MemoryType = {}));
/**
 * Simplified Memory Manager using Redis + SQLite + in-memory fallbacks
 */
class MemoryManager {
    constructor() {
        this.redis = null;
        this.db = null;
        this.memoryStore = new Map();
        this.personalityStore = new Map();
        this.relationshipStore = new Map();
        this.npcMemoryContract = null;
        // Initialize blockchain connection
        this.provider = new ethers_1.ethers.JsonRpcProvider(process.env.SOMNIA_TESTNET_RPC_URL);
        this.signer = new ethers_1.ethers.Wallet(process.env.WALLET_PRIVATE_KEY || '', this.provider);
        this.initializeConnections();
        this.initializeContract();
    }
    async initializeConnections() {
        try {
            // Try Redis connection (optional)
            try {
                this.redis = (0, redis_1.createClient)({
                    url: process.env.REDIS_URL || 'redis://localhost:6379',
                    socket: { connectTimeout: 5000 }
                });
                await this.redis.connect();
                console.log('MemoryManager: Connected to Redis');
            }
            catch (error) {
                console.warn('MemoryManager: Redis not available, using in-memory storage');
                this.redis = null;
            }
            // Try SQLite connection (optional)
            try {
                const dbPath = path_1.default.join(__dirname, '..', '..', 'data', 'npc_memory.db');
                this.db = new sqlite3_1.default.Database(dbPath);
                await this.createTables();
                console.log('MemoryManager: Connected to SQLite');
            }
            catch (error) {
                console.warn('MemoryManager: SQLite not available, using in-memory storage');
                this.db = null;
            }
        }
        catch (error) {
            console.warn('MemoryManager: Using in-memory storage only');
        }
    }
    async createTables() {
        if (!this.db)
            return;
        return new Promise((resolve) => {
            this.db.serialize(() => {
                this.db.run(`CREATE TABLE IF NOT EXISTS personalities (
                    npc_id INTEGER PRIMARY KEY,
                    data TEXT NOT NULL
                )`);
                this.db.run(`CREATE TABLE IF NOT EXISTS memories (
                    id TEXT PRIMARY KEY,
                    npc_id INTEGER,
                    data TEXT NOT NULL
                )`);
                this.db.run(`CREATE TABLE IF NOT EXISTS relationships (
                    key TEXT PRIMARY KEY,
                    data TEXT NOT NULL
                )`, () => resolve());
            });
        });
    }
    /**
     * Initialize NPCMemory contract connection
     */
    async initializeContract() {
        try {
            // Load contract addresses
            const addressesPath = path_1.default.join(__dirname, '../../contracts/addresses.json');
            if (fs_1.default.existsSync(addressesPath)) {
                const addresses = JSON.parse(fs_1.default.readFileSync(addressesPath, 'utf8'));
                if (addresses.npcMemory && addresses.npcMemory !== '0x0000000000000000000000000000000000000000') {
                    // Load contract ABI (would be generated from compilation)
                    const npcMemoryABI = [
                        "function storeMemory(uint256 npcId, address relatedAddress, uint8 memoryType, string memory content, uint256 emotionalWeight, string[] memory tags, bool isPositive) external returns (uint256)",
                        "function getMemories(uint256 npcId, uint256 limit) external view returns (tuple(uint256 id, uint256 npcId, address relatedAddress, uint8 memoryType, string content, uint256 timestamp, uint256 emotionalWeight, string[] tags, bool isPositive)[])",
                        "function updatePersonality(uint256 npcId, string memory traits, string memory backstory, string[] memory quirks) external",
                        "function getPersonality(uint256 npcId) external view returns (string memory traits, string memory backstory, string[] memory quirks, uint256 lastUpdated)"
                    ];
                    this.npcMemoryContract = new ethers_1.ethers.Contract(addresses.npcMemory, npcMemoryABI, this.signer);
                    console.log('MemoryManager: Connected to NPCMemory contract at', addresses.npcMemory);
                }
                else {
                    console.log('MemoryManager: NPCMemory contract not deployed yet, using off-chain storage only');
                }
            }
        }
        catch (error) {
            console.error('MemoryManager: Failed to initialize contract:', error);
        }
    }
    /**
     * Initialize personality for an NPC
     */
    async initializePersonality(npcId, personalityTraits, backstory, quirks) {
        const traits = personalityTraits.reduce((acc, p) => {
            acc[p.trait] = p.value;
            return acc;
        }, {});
        const profile = {
            traits,
            backstory,
            quirks,
            lastUpdated: Date.now(),
            isInitialized: true
        };
        // Store in all available systems
        this.personalityStore.set(npcId, profile);
        if (this.redis) {
            try {
                await this.redis.setEx(`personality:${npcId}`, 3600, JSON.stringify(profile));
            }
            catch (error) {
                console.warn('Redis storage failed, using in-memory');
            }
        }
        if (this.db) {
            this.db.run(`INSERT OR REPLACE INTO personalities (npc_id, data) VALUES (?, ?)`, [npcId, JSON.stringify(profile)]);
        }
        console.log(`MemoryManager: Initialized personality for NPC ${npcId}`);
    }
    /**
     * Add a memory entry
     */
    async addMemory(npcId, relatedAddress, memoryType, content, emotionalWeight, tags, isPositive) {
        const memory = {
            id: (0, uuid_1.v4)(),
            npcId,
            relatedAddress,
            memoryType,
            content: typeof content === 'string' ? content : JSON.stringify(content),
            timestamp: Date.now(),
            emotionalWeight,
            tags,
            isPositive
        };
        // Store in memory
        if (!this.memoryStore.has(npcId)) {
            this.memoryStore.set(npcId, []);
        }
        const memories = this.memoryStore.get(npcId);
        memories.push(memory);
        // Keep only last 100 memories in memory
        if (memories.length > 100) {
            memories.shift();
        }
        // Store in Redis
        if (this.redis) {
            try {
                await this.redis.lPush(`memories:${npcId}`, JSON.stringify(memory));
                await this.redis.lTrim(`memories:${npcId}`, 0, 99);
            }
            catch (error) {
                console.warn('Redis memory storage failed');
            }
        }
        // Store in SQLite
        if (this.db) {
            this.db.run(`INSERT INTO memories (id, npc_id, data) VALUES (?, ?, ?)`, [memory.id, npcId, JSON.stringify(memory)]);
        }
        // Store on-chain for important memories
        if (this.npcMemoryContract && emotionalWeight > 70) {
            try {
                const memoryTypeIndex = Object.values(MemoryType).indexOf(memoryType);
                await this.npcMemoryContract.storeMemory(npcId, relatedAddress, memoryTypeIndex, memory.content, emotionalWeight, tags, isPositive);
                console.log(`MemoryManager: Stored high-impact memory on-chain for NPC ${npcId}`);
            }
            catch (error) {
                console.warn('MemoryManager: Failed to store memory on-chain:', error);
            }
        }
        // Update relationship
        if (relatedAddress !== '0x0000000000000000000000000000000000000000') {
            await this.updateRelationship(npcId, relatedAddress, isPositive ? emotionalWeight : -emotionalWeight);
        }
        console.log(`MemoryManager: Added ${memoryType} memory for NPC ${npcId}`);
    }
    /**
     * Get recent memories
     */
    async getRecentMemories(npcId, count = 10) {
        // Try in-memory first
        if (this.memoryStore.has(npcId)) {
            const memories = this.memoryStore.get(npcId);
            return memories.slice(-count);
        }
        // Try Redis
        if (this.redis) {
            try {
                const cachedMemories = await this.redis.lRange(`memories:${npcId}`, 0, count - 1);
                if (cachedMemories.length > 0) {
                    return cachedMemories.map(m => JSON.parse(m));
                }
            }
            catch (error) {
                console.warn('Redis read failed');
            }
        }
        // Try SQLite
        if (this.db) {
            return new Promise((resolve) => {
                this.db.all(`SELECT data FROM memories WHERE npc_id = ? ORDER BY rowid DESC LIMIT ?`, [npcId, count], (err, rows) => {
                    if (err) {
                        resolve([]);
                    }
                    else {
                        const memories = rows.map(row => JSON.parse(row.data));
                        resolve(memories);
                    }
                });
            });
        }
        return [];
    }
    /**
     * Get personality profile
     */
    async getPersonalityProfile(npcId) {
        // Try in-memory first
        if (this.personalityStore.has(npcId)) {
            return this.personalityStore.get(npcId);
        }
        // Try Redis
        if (this.redis) {
            try {
                const cached = await this.redis.get(`personality:${npcId}`);
                if (cached) {
                    const profile = JSON.parse(cached);
                    this.personalityStore.set(npcId, profile);
                    return profile;
                }
            }
            catch (error) {
                console.warn('Redis personality read failed');
            }
        }
        // Try SQLite
        if (this.db) {
            return new Promise((resolve) => {
                this.db.get(`SELECT data FROM personalities WHERE npc_id = ?`, [npcId], (err, row) => {
                    if (err || !row) {
                        resolve(null);
                    }
                    else {
                        const profile = JSON.parse(row.data);
                        this.personalityStore.set(npcId, profile);
                        resolve(profile);
                    }
                });
            });
        }
        return null;
    }
    /**
     * Update relationship
     */
    async updateRelationship(npcId, targetAddress, affinityChange) {
        const key = `${npcId}:${targetAddress}`;
        let relationship = this.relationshipStore.get(key) || {
            target: targetAddress,
            affinity: 0,
            interactionCount: 0,
            lastInteraction: 0,
            relationshipType: 'neutral'
        };
        relationship.affinity = Math.max(-100, Math.min(100, relationship.affinity + affinityChange));
        relationship.interactionCount++;
        relationship.lastInteraction = Date.now();
        // Update relationship type
        if (relationship.affinity >= 70)
            relationship.relationshipType = 'friend';
        else if (relationship.affinity >= 30)
            relationship.relationshipType = 'ally';
        else if (relationship.affinity <= -70)
            relationship.relationshipType = 'enemy';
        else if (relationship.affinity <= -30)
            relationship.relationshipType = 'rival';
        else
            relationship.relationshipType = 'neutral';
        this.relationshipStore.set(key, relationship);
        // Store in persistent storage
        if (this.redis) {
            try {
                await this.redis.setEx(`relationship:${key}`, 3600, JSON.stringify(relationship));
            }
            catch (error) {
                console.warn('Redis relationship storage failed');
            }
        }
        if (this.db) {
            this.db.run(`INSERT OR REPLACE INTO relationships (key, data) VALUES (?, ?)`, [key, JSON.stringify(relationship)]);
        }
    }
    /**
     * Get relationship
     */
    async getRelationship(npcId, targetAddress) {
        const key = `${npcId}:${targetAddress}`;
        if (this.relationshipStore.has(key)) {
            return this.relationshipStore.get(key);
        }
        // Try Redis
        if (this.redis) {
            try {
                const cached = await this.redis.get(`relationship:${key}`);
                if (cached) {
                    const relationship = JSON.parse(cached);
                    this.relationshipStore.set(key, relationship);
                    return relationship;
                }
            }
            catch (error) {
                console.warn('Redis relationship read failed');
            }
        }
        return null;
    }
    /**
     * Generate personality context for AI
     */
    async generatePersonalityContext(npcId, situation) {
        const personality = await this.getPersonalityProfile(npcId);
        const recentMemories = await this.getRecentMemories(npcId, 5);
        if (!personality) {
            return "This NPC has no established personality. Act as a neutral, helpful character.";
        }
        let context = `You are an NPC with the following personality:\n\n`;
        context += `Backstory: ${personality.backstory}\n`;
        context += `Quirks: ${personality.quirks.join(', ')}\n\n`;
        context += `Personality Traits (0-100 scale):\n`;
        Object.entries(personality.traits).forEach(([trait, value]) => {
            if (value > 60) {
                context += `- ${trait}: ${value} (Strong tendency)\n`;
            }
            else if (value > 30) {
                context += `- ${trait}: ${value} (Moderate tendency)\n`;
            }
        });
        if (recentMemories.length > 0) {
            context += `\nRecent Memories:\n`;
            recentMemories.forEach(memory => {
                const emotion = memory.isPositive ? '😊' : '😞';
                context += `- ${emotion} ${memory.content}\n`;
            });
        }
        context += `\nCurrent Situation: ${situation}\n`;
        context += `\nRespond in character based on your personality and memories.`;
        return context;
    }
    /**
     * Create personality archetypes
     */
    static createArchetype(archetype) {
        const archetypes = {
            warrior: [
                { trait: PersonalityTrait.AGGRESSIVE, value: 80 },
                { trait: PersonalityTrait.LOYAL, value: 70 },
                { trait: PersonalityTrait.HONEST, value: 60 },
                { trait: PersonalityTrait.CAUTIOUS, value: 30 }
            ],
            merchant: [
                { trait: PersonalityTrait.GREEDY, value: 75 },
                { trait: PersonalityTrait.CUNNING, value: 65 },
                { trait: PersonalityTrait.FRIENDLY, value: 70 },
                { trait: PersonalityTrait.HONEST, value: 40 }
            ],
            scholar: [
                { trait: PersonalityTrait.CAUTIOUS, value: 80 },
                { trait: PersonalityTrait.HONEST, value: 85 },
                { trait: PersonalityTrait.MYSTERIOUS, value: 60 },
                { trait: PersonalityTrait.FRIENDLY, value: 50 }
            ],
            trickster: [
                { trait: PersonalityTrait.CUNNING, value: 90 },
                { trait: PersonalityTrait.CHEERFUL, value: 70 },
                { trait: PersonalityTrait.MYSTERIOUS, value: 80 },
                { trait: PersonalityTrait.HONEST, value: 20 }
            ],
            guardian: [
                { trait: PersonalityTrait.LOYAL, value: 95 },
                { trait: PersonalityTrait.CAUTIOUS, value: 75 },
                { trait: PersonalityTrait.HONEST, value: 80 },
                { trait: PersonalityTrait.AGGRESSIVE, value: 60 }
            ]
        };
        return archetypes[archetype] || archetypes.scholar;
    }
}
exports.MemoryManager = MemoryManager;
