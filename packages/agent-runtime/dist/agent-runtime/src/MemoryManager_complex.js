"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryManager = exports.MemoryType = exports.PersonalityTrait = void 0;
const redis_1 = require("redis");
const sqlite3_1 = __importDefault(require("sqlite3"));
const uuid_1 = require("uuid");
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
class MemoryManager {
    constructor() {
        this.isConnected = false;
        this.initializeConnections();
    }
    async initializeConnections() {
        try {
            // Initialize Redis (for fast access to recent memories and relationships)
            this.redis = (0, redis_1.createClient)({
                url: process.env.REDIS_URL || 'redis://localhost:6379'
            });
            this.redis.on('error', (err) => {
                console.warn('Redis Client Error:', err);
            });
            // Initialize SQLite (for persistent storage)
            const dbPath = path_1.default.join(__dirname, '..', '..', 'data', 'npc_memory.db');
            this.db = new sqlite3_1.default.Database(dbPath);
            // Create tables if they don't exist
            await this.createTables();
            this.isConnected = true;
            console.log('MemoryManager: Connected to Redis and SQLite');
        }
        catch (error) {
            console.warn('MemoryManager: Could not initialize connections:', error);
            this.isConnected = false;
        }
    }
    async createTables() {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                // Personalities table
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS personalities (
                        npc_id INTEGER PRIMARY KEY,
                        traits TEXT NOT NULL,
                        backstory TEXT,
                        quirks TEXT,
                        last_updated INTEGER,
                        is_initialized BOOLEAN DEFAULT FALSE
                    )
                `);
                // Memories table
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS memories (
                        id TEXT PRIMARY KEY,
                        npc_id INTEGER,
                        related_address TEXT,
                        memory_type TEXT,
                        content TEXT,
                        timestamp INTEGER,
                        emotional_weight INTEGER,
                        tags TEXT,
                        is_positive BOOLEAN,
                        FOREIGN KEY (npc_id) REFERENCES personalities (npc_id)
                    )
                `);
                // Relationships table
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS relationships (
                        npc_id INTEGER,
                        target_address TEXT,
                        affinity INTEGER,
                        interaction_count INTEGER,
                        last_interaction INTEGER,
                        relationship_type TEXT,
                        PRIMARY KEY (npc_id, target_address),
                        FOREIGN KEY (npc_id) REFERENCES personalities (npc_id)
                    )
                `, (err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
        });
    }
    /**
     * Initialize personality for an NPC
     */
    async initializePersonality(npcId, personalityTraits, backstory, quirks) {
        if (!this.isConnected) {
            await this.initializeConnections();
        }
        try {
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
            // Store in SQLite
            await new Promise((resolve, reject) => {
                this.db.run(`INSERT OR REPLACE INTO personalities 
                     (npc_id, traits, backstory, quirks, last_updated, is_initialized) 
                     VALUES (?, ?, ?, ?, ?, ?)`, [
                    npcId,
                    JSON.stringify(traits),
                    backstory,
                    JSON.stringify(quirks),
                    profile.lastUpdated,
                    1
                ], (err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
            // Cache in Redis
            if (this.redis.isOpen) {
                await this.redis.setEx(`personality:${npcId}`, 3600, JSON.stringify(profile));
            }
            console.log(`MemoryManager: Initialized personality for NPC ${npcId}`);
        }
        catch (error) {
            console.error('MemoryManager: Error initializing personality:', error);
            throw error;
        }
    }
    /**
     * Add a memory entry for an NPC
     */
    async addMemory(npcId, relatedAddress, memoryType, content, emotionalWeight, tags, isPositive) {
        if (!this.isConnected) {
            await this.initializeConnections();
        }
        try {
            const memoryId = (0, uuid_1.v4)();
            const contentString = typeof content === 'string' ? content : JSON.stringify(content);
            const timestamp = Date.now();
            const memory = {
                id: memoryId,
                npcId,
                relatedAddress,
                memoryType,
                content: contentString,
                timestamp,
                emotionalWeight,
                tags,
                isPositive
            };
            // Store in SQLite
            await new Promise((resolve, reject) => {
                this.db.run(`INSERT INTO memories 
                     (id, npc_id, related_address, memory_type, content, timestamp, emotional_weight, tags, is_positive) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                    memoryId,
                    npcId,
                    relatedAddress,
                    memoryType,
                    contentString,
                    timestamp,
                    emotionalWeight,
                    JSON.stringify(tags),
                    isPositive ? 1 : 0
                ], (err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
            // Add to Redis recent memories list
            if (this.redis.isOpen) {
                await this.redis.lPush(`memories:${npcId}`, JSON.stringify(memory));
                await this.redis.lTrim(`memories:${npcId}`, 0, 99); // Keep last 100 memories
                await this.redis.expire(`memories:${npcId}`, 3600); // 1 hour TTL
            }
            // Update relationship if applicable
            if (relatedAddress !== '0x0000000000000000000000000000000000000000') {
                await this.updateRelationship(npcId, relatedAddress, isPositive ? emotionalWeight : -emotionalWeight);
            }
            console.log(`MemoryManager: Added memory for NPC ${npcId}, type: ${memoryType}`);
        }
        catch (error) {
            console.error('MemoryManager: Error adding memory:', error);
            throw error;
        }
    }
    /**
     * Get recent memories for an NPC
     */
    async getRecentMemories(npcId, count = 10) {
        if (!this.isConnected) {
            await this.initializeConnections();
        }
        try {
            // Try Redis first for fast access
            if (this.redis.isOpen) {
                const cachedMemories = await this.redis.lRange(`memories:${npcId}`, 0, count - 1);
                if (cachedMemories.length > 0) {
                    return cachedMemories.map(m => JSON.parse(m));
                }
            }
            // Fallback to SQLite
            return new Promise((resolve, reject) => {
                this.db.all(`SELECT * FROM memories WHERE npc_id = ? ORDER BY timestamp DESC LIMIT ?`, [npcId, count], (err, rows) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        const memories = rows.map(row => ({
                            id: row.id,
                            npcId: row.npc_id,
                            relatedAddress: row.related_address,
                            memoryType: row.memory_type,
                            content: row.content,
                            timestamp: row.timestamp,
                            emotionalWeight: row.emotional_weight,
                            tags: JSON.parse(row.tags || '[]'),
                            isPositive: Boolean(row.is_positive)
                        }));
                        resolve(memories);
                    }
                });
            });
        }
        catch (error) {
            console.error('MemoryManager: Error getting memories:', error);
            return [];
        }
    }
    /**
     * Get personality profile for an NPC
     */
    async getPersonalityProfile(npcId) {
        try {
            // Check cache first
            if (this.personalityCache.has(npcId)) {
                return this.personalityCache.get(npcId);
            }
            const [backstory, quirks, lastUpdated, isInitialized] = await this.npcMemoryContract.getPersonalityInfo(npcId);
            if (!isInitialized) {
                return null;
            }
            // Get all personality traits
            const traits = new Map();
            for (let i = 0; i <= 9; i++) {
                const value = await this.npcMemoryContract.getPersonalityTrait(npcId, i);
                traits.set(i, Number(value));
            }
            const profile = {
                traits,
                backstory,
                quirks,
                lastUpdated: Number(lastUpdated),
                isInitialized
            };
            // Update cache
            this.personalityCache.set(npcId, profile);
            return profile;
        }
        catch (error) {
            console.error('MemoryManager: Error getting personality:', error);
            return null;
        }
    }
    /**
     * Get relationship info between NPC and target
     */
    async getRelationship(npcId, targetAddress) {
        try {
            const [affinity, interactionCount, lastInteraction, relationshipType] = await this.npcMemoryContract.getRelationship(npcId, targetAddress);
            if (Number(interactionCount) === 0) {
                return null;
            }
            return {
                target: targetAddress,
                affinity: Number(affinity),
                interactionCount: Number(interactionCount),
                lastInteraction: Number(lastInteraction),
                relationshipType
            };
        }
        catch (error) {
            console.error('MemoryManager: Error getting relationship:', error);
            return null;
        }
    }
    /**
     * Search memories by tag
     */
    async searchMemoriesByTag(npcId, tag) {
        try {
            const memories = await this.npcMemoryContract.searchMemoriesByTag(npcId, tag);
            return memories.map((memory) => ({
                id: Number(memory.id),
                relatedAddress: memory.relatedAddress,
                memoryType: Number(memory.memoryType),
                content: memory.content,
                timestamp: Number(memory.timestamp),
                emotionalWeight: Number(memory.emotionalWeight),
                tags: memory.tags,
                isPositive: memory.isPositive
            }));
        }
        catch (error) {
            console.error('MemoryManager: Error searching memories:', error);
            return [];
        }
    }
    /**
     * Generate personality-driven response context
     */
    async generatePersonalityContext(npcId, situation) {
        const personality = await this.getPersonalityProfile(npcId);
        const recentMemories = await this.getRecentMemories(npcId, 5);
        if (!personality) {
            return "This NPC has no established personality.";
        }
        let context = `NPC Personality Profile:\n`;
        context += `Backstory: ${personality.backstory}\n`;
        context += `Quirks: ${personality.quirks.join(', ')}\n`;
        context += `Personality Traits:\n`;
        personality.traits.forEach((value, trait) => {
            if (value > 60) {
                context += `- ${PersonalityTrait[trait]}: ${value}/100 (Strong)\n`;
            }
            else if (value > 30) {
                context += `- ${PersonalityTrait[trait]}: ${value}/100 (Moderate)\n`;
            }
        });
        if (recentMemories.length > 0) {
            context += `\nRecent Memories:\n`;
            recentMemories.forEach(memory => {
                const emotion = memory.isPositive ? '😊' : '😞';
                context += `- ${emotion} ${memory.content} (${new Date(memory.timestamp * 1000).toLocaleDateString()})\n`;
            });
        }
        context += `\nCurrent Situation: ${situation}\n`;
        context += `\nRespond in character based on this personality and memory context.`;
        return context;
    }
    /**
     * Update personality trait based on experience
     */
    async evolvePersonality(npcId, trait, change) {
        try {
            const personality = await this.getPersonalityProfile(npcId);
            if (!personality) {
                throw new Error('Personality not initialized');
            }
            const currentValue = personality.traits.get(trait) || 50;
            const newValue = Math.max(0, Math.min(100, currentValue + change));
            const tx = await this.npcMemoryContract.updatePersonalityTrait(npcId, trait, newValue);
            await tx.wait();
            console.log(`MemoryManager: Evolved ${PersonalityTrait[trait]} from ${currentValue} to ${newValue} for NPC ${npcId}`);
            // Update cache
            if (this.personalityCache.has(npcId)) {
                const cached = this.personalityCache.get(npcId);
                cached.traits.set(trait, newValue);
                cached.lastUpdated = Date.now();
            }
        }
        catch (error) {
            console.error('MemoryManager: Error evolving personality:', error);
            throw error;
        }
    }
    /**
     * Create default personality archetypes
     */
    static createArchetype(archetype) {
        switch (archetype) {
            case 'warrior':
                return [
                    { trait: PersonalityTrait.AGGRESSIVE, value: 80 },
                    { trait: PersonalityTrait.LOYAL, value: 70 },
                    { trait: PersonalityTrait.HONEST, value: 60 },
                    { trait: PersonalityTrait.CAUTIOUS, value: 30 }
                ];
            case 'merchant':
                return [
                    { trait: PersonalityTrait.GREEDY, value: 75 },
                    { trait: PersonalityTrait.CUNNING, value: 65 },
                    { trait: PersonalityTrait.FRIENDLY, value: 70 },
                    { trait: PersonalityTrait.HONEST, value: 40 }
                ];
            case 'scholar':
                return [
                    { trait: PersonalityTrait.CAUTIOUS, value: 80 },
                    { trait: PersonalityTrait.HONEST, value: 85 },
                    { trait: PersonalityTrait.MYSTERIOUS, value: 60 },
                    { trait: PersonalityTrait.FRIENDLY, value: 50 }
                ];
            case 'trickster':
                return [
                    { trait: PersonalityTrait.CUNNING, value: 90 },
                    { trait: PersonalityTrait.CHEERFUL, value: 70 },
                    { trait: PersonalityTrait.MYSTERIOUS, value: 80 },
                    { trait: PersonalityTrait.HONEST, value: 20 }
                ];
            case 'guardian':
                return [
                    { trait: PersonalityTrait.LOYAL, value: 95 },
                    { trait: PersonalityTrait.CAUTIOUS, value: 75 },
                    { trait: PersonalityTrait.HONEST, value: 80 },
                    { trait: PersonalityTrait.AGGRESSIVE, value: 60 }
                ];
            default:
                return [
                    { trait: PersonalityTrait.FRIENDLY, value: 50 },
                    { trait: PersonalityTrait.HONEST, value: 50 },
                    { trait: PersonalityTrait.CAUTIOUS, value: 50 }
                ];
        }
    }
}
exports.MemoryManager = MemoryManager;
