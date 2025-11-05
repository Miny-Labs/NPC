"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Referee = exports.Action = exports.Perception = exports.Planner = exports.AgentRuntime = void 0;
require("dotenv/config");
const Planner_1 = require("./Planner");
const Perception_1 = require("./Perception");
const Action_1 = require("./Action");
const Referee_1 = require("./Referee");
const MemoryManager_1 = require("./MemoryManager");
const QuestGenerator_1 = require("./QuestGenerator");
const NPCMesh_1 = require("./NPCMesh");
const PortabilityManager_1 = require("./PortabilityManager");
const EmotionEngine_1 = require("./EmotionEngine");
class AgentRuntime {
    constructor() {
        console.log('Agent runtime starting...');
        this.perception = new Perception_1.Perception();
        this.planner = new Planner_1.Planner();
        this.action = new Action_1.Action();
        this.referee = new Referee_1.Referee();
        this.memoryManager = new MemoryManager_1.MemoryManager();
        this.questGenerator = new QuestGenerator_1.QuestGenerator();
        this.npcMesh = new NPCMesh_1.NPCMesh(8081);
        this.portabilityManager = new PortabilityManager_1.PortabilityManager();
        this.emotionEngine = new EmotionEngine_1.EmotionEngine();
        // Set up mesh event listeners
        this.setupMeshEventListeners();
    }
    async handleTask(task) {
        console.log('AgentRuntime: Handling new task', task);
        try {
            const npcId = task.npcId || 1; // Default NPC ID if not specified
            // 1. Perception gathers state from the blockchain
            const observation = await this.perception.observe();
            // 2. Get personality context for decision making
            const personalityContext = await this.memoryManager.generatePersonalityContext(npcId, `Task: ${task.type} with params: ${JSON.stringify(task.params)}`);
            // 2.5. Get emotional state and influence
            const emotionalState = this.emotionEngine.getEmotionalState(npcId.toString());
            const emotionalInfluence = emotionalState ?
                this.emotionEngine.getEmotionalInfluence(npcId.toString()) : null;
            // 3. Planner decides on an action based on observation, task, personality, and emotions
            const baseContext = personalityContext && typeof personalityContext === 'object' ? personalityContext : {};
            const enhancedContext = {
                ...baseContext,
                emotionalState,
                emotionalInfluence,
                emotionalSummary: emotionalState ?
                    this.emotionEngine.getEmotionalSummary(npcId.toString()) : 'balanced'
            };
            const plan = await this.planner.plan(observation, task.type, JSON.stringify(enhancedContext));
            // 4. Action executes the plan
            const executionResult = await this.action.execute(plan);
            // 5. Referee validates the result
            const finalResult = await this.referee.validate(executionResult);
            // 6. Store memory of this interaction
            await this.storeTaskMemory(npcId, task, executionResult, finalResult);
            // 7. Process emotional impact of the interaction
            if (task.params?.opponent || task.params?.player) {
                const playerAddress = task.params.opponent || task.params.player;
                await this.processEmotionalInteraction(npcId, playerAddress, task, finalResult);
            }
            console.log('AgentRuntime: Task handled successfully.', finalResult);
            return finalResult;
        }
        catch (error) {
            console.error('AgentRuntime: Error handling task:', error);
            // Store memory of failed task
            if (task.npcId) {
                await this.storeTaskMemory(task.npcId, task, null, { success: false, error: error.message });
            }
            throw error;
        }
    }
    /**
     * Store memory of task execution
     */
    async storeTaskMemory(npcId, task, executionResult, finalResult) {
        try {
            const memoryContent = {
                taskType: task.type,
                taskParams: task.params,
                executionResult,
                finalResult,
                timestamp: Date.now()
            };
            const isPositive = finalResult.success !== false;
            const emotionalWeight = task.type === 'duel' ? 80 : task.type === 'quest' ? 60 : 40;
            await this.memoryManager.addMemory(npcId, task.params?.opponent || task.params?.creator || '0x0000000000000000000000000000000000000000', MemoryManager_1.MemoryType.INTERACTION, memoryContent, emotionalWeight, [task.type, isPositive ? 'success' : 'failure'], isPositive);
            // Note: Personality evolution can be added later as needed
        }
        catch (error) {
            console.error('AgentRuntime: Error storing task memory:', error);
        }
    }
    /**
     * Initialize an NPC with personality and emotional state
     */
    async initializeNPC(npcId, archetype, backstory, quirks) {
        const traits = MemoryManager_1.MemoryManager.createArchetype(archetype);
        await this.memoryManager.initializePersonality(npcId, traits, backstory, quirks);
        // Initialize emotional state based on personality
        const personalityProfile = await this.memoryManager.getPersonalityProfile(npcId);
        const personalityTraits = personalityProfile?.traits || {};
        this.emotionEngine.initializeNPCEmotion(npcId.toString(), archetype, personalityTraits);
        console.log(`AgentRuntime: Initialized NPC ${npcId} as ${archetype} with emotional state`);
    }
    /**
     * Get NPC memory and personality info
     */
    async getNPCInfo(npcId) {
        const personality = await this.memoryManager.getPersonalityProfile(npcId);
        const recentMemories = await this.memoryManager.getRecentMemories(npcId, 10);
        return {
            npcId,
            personality,
            recentMemories,
            memoryCount: recentMemories.length
        };
    }
    /**
     * Generate a dynamic quest based on current game state
     */
    async generateDynamicQuest(npcId, playerAddress, difficulty = 'medium') {
        try {
            // Get current game state
            const observation = await this.perception.observe();
            // Get player history from memories
            const playerMemories = await this.memoryManager.getRecentMemories(npcId, 20);
            const playerHistory = playerMemories
                .filter(m => m.relatedAddress === playerAddress)
                .map(m => ({
                action: m.memoryType,
                result: m.content,
                isPositive: m.isPositive
            }));
            // Get NPC personality for quest flavor
            const personality = await this.memoryManager.getPersonalityProfile(npcId);
            // Generate the quest
            const quest = await this.questGenerator.generateDynamicQuest(observation, playerHistory, personality, difficulty);
            // Store memory of quest creation
            await this.memoryManager.addMemory(npcId, playerAddress, MemoryManager_1.MemoryType.EVENT, {
                action: 'quest_generated',
                questId: quest.id,
                questTitle: quest.title,
                difficulty: quest.difficulty
            }, 50, // Medium emotional weight
            ['quest', 'generation', difficulty], true);
            console.log(`AgentRuntime: Generated quest "${quest.title}" for player ${playerAddress}`);
            return quest;
        }
        catch (error) {
            console.error('AgentRuntime: Error generating quest:', error);
            throw error;
        }
    }
    /**
     * Generate a quest chain with narrative progression
     */
    async generateQuestChain(theme, chainLength = 3, difficulty = 'medium') {
        try {
            const questChain = await this.questGenerator.generateQuestChain(theme, chainLength, difficulty);
            console.log(`AgentRuntime: Generated ${questChain.length}-quest chain for theme "${theme}"`);
            return questChain;
        }
        catch (error) {
            console.error('AgentRuntime: Error generating quest chain:', error);
            throw error;
        }
    }
    /**
     * Generate a random event based on current conditions
     */
    async generateRandomEvent(activePlayerCount) {
        try {
            const observation = await this.perception.observe();
            const currentHour = new Date().getHours();
            let timeOfDay;
            if (currentHour >= 6 && currentHour < 12)
                timeOfDay = 'morning';
            else if (currentHour >= 12 && currentHour < 18)
                timeOfDay = 'afternoon';
            else if (currentHour >= 18 && currentHour < 22)
                timeOfDay = 'evening';
            else
                timeOfDay = 'night';
            const event = await this.questGenerator.generateRandomEvent(observation, activePlayerCount, timeOfDay);
            if (event) {
                console.log(`AgentRuntime: Generated random event "${event.title}"`);
            }
            return event;
        }
        catch (error) {
            console.error('AgentRuntime: Error generating random event:', error);
            return null;
        }
    }
    /**
     * Get available quests for a player
     */
    async getAvailableQuests(playerAddress, completedQuests = []) {
        return this.questGenerator.getAvailableQuests(playerAddress, completedQuests);
    }
    /**
     * Get active events
     */
    async getActiveEvents() {
        return this.questGenerator.getActiveEvents();
    }
    /**
     * Update quest progress
     */
    async updateQuestProgress(questId, objectiveId, progress) {
        return this.questGenerator.updateQuestProgress(questId, objectiveId, progress);
    }
    /**
     * Setup NPC mesh event listeners
     */
    setupMeshEventListeners() {
        this.npcMesh.on('messageReceived', async (message) => {
            console.log(`AgentRuntime: Received mesh message from ${message.from}: ${message.type}`);
            // Store social interaction in memory
            if (message.from !== 'self') {
                await this.memoryManager.addMemory(1, // Default NPC ID
                message.from, MemoryManager_1.MemoryType.INTERACTION, {
                    type: 'npc_communication',
                    messageType: message.type,
                    content: message.content
                }, 30, // Social interactions have moderate emotional weight
                ['social', 'npc', message.type], message.type !== 'betrayal');
            }
        });
        this.npcMesh.on('allianceFormed', async (alliance) => {
            console.log(`AgentRuntime: Alliance formed: ${alliance.purpose}`);
            // Store alliance formation in memory
            await this.memoryManager.addMemory(1, alliance.members.find(m => m !== 'self') || '', MemoryManager_1.MemoryType.RELATIONSHIP, {
                type: 'alliance_formed',
                allianceId: alliance.id,
                purpose: alliance.purpose,
                members: alliance.members
            }, 70, // Alliances are emotionally significant
            ['alliance', 'cooperation', 'social'], true);
        });
        this.npcMesh.on('betrayalReceived', async (message) => {
            console.log(`AgentRuntime: Betrayal received from ${message.from}`);
            // Store betrayal in memory with high emotional weight
            await this.memoryManager.addMemory(1, message.from, MemoryManager_1.MemoryType.RELATIONSHIP, {
                type: 'betrayal',
                details: message.content
            }, 90, // Betrayals are highly emotional
            ['betrayal', 'negative', 'social'], false);
        });
    }
    /**
     * Register this NPC in the mesh network
     */
    async registerInMesh(npcId) {
        const personality = await this.memoryManager.getPersonalityProfile(npcId);
        await this.npcMesh.registerAgent(`npc_${npcId}`, `0x${npcId.toString(16).padStart(40, '0')}`, // Generate address from ID
        personality, ['duel', 'quest', 'trade', 'social']);
        console.log(`AgentRuntime: Registered NPC ${npcId} in mesh network`);
    }
    /**
     * Connect to another NPC
     */
    async connectToNPC(npcId, npcUrl) {
        await this.npcMesh.connectToAgent(npcId, npcUrl);
    }
    /**
     * Propose alliance with another NPC
     */
    async proposeAlliance(targetNpcId, purpose) {
        await this.npcMesh.proposeAlliance(targetNpcId, purpose);
    }
    /**
     * Spread gossip about another NPC
     */
    async spreadGossip(aboutNpcId, sentiment, content) {
        await this.npcMesh.spreadGossip(aboutNpcId, sentiment, content);
    }
    /**
     * Get connected NPCs
     */
    async getConnectedNPCs() {
        return this.npcMesh.getConnectedAgents();
    }
    /**
     * Get active alliances
     */
    async getActiveAlliances() {
        return this.npcMesh.getActiveAlliances();
    }
    /**
     * Get recent NPC communications
     */
    async getRecentCommunications() {
        return this.npcMesh.getRecentMessages(20);
    }
    /**
     * Create universal NPC identity
     */
    async createUniversalIdentity(npcId, name, archetype) {
        const personality = await this.memoryManager.getPersonalityProfile(npcId);
        const initialStats = {
            strength: 50,
            intelligence: 50,
            charisma: 50,
            dexterity: 50,
            constitution: 50,
            wisdom: 50
        };
        // Adjust stats based on personality
        if (personality) {
            Object.entries(personality.traits).forEach(([trait, value]) => {
                switch (trait) {
                    case 'aggressive':
                        initialStats.strength += Math.floor((value - 50) / 2);
                        break;
                    case 'cunning':
                        initialStats.intelligence += Math.floor((value - 50) / 2);
                        break;
                    case 'friendly':
                        initialStats.charisma += Math.floor((value - 50) / 2);
                        break;
                }
            });
        }
        const tokenId = await this.portabilityManager.createUniversalIdentity({
            name,
            archetype,
            initialStats,
            personality
        });
        console.log(`AgentRuntime: Created universal identity ${tokenId} for NPC ${npcId}`);
        return tokenId;
    }
    /**
     * Export NPC for cross-game migration
     */
    async exportNPC(npcId, sourceGame) {
        const personality = await this.memoryManager.getPersonalityProfile(npcId);
        const migrationPackage = await this.portabilityManager.exportNPCData(npcId, sourceGame, this.memoryManager, personality);
        console.log(`AgentRuntime: Exported NPC ${npcId} from ${sourceGame}`);
        return migrationPackage;
    }
    /**
     * Import NPC from migration package
     */
    async importNPC(migrationPackage, targetGame) {
        const success = await this.portabilityManager.importNPCData(migrationPackage, targetGame, this.memoryManager);
        if (success) {
            console.log(`AgentRuntime: Imported NPC ${migrationPackage.npcId} to ${targetGame}`);
        }
        return success;
    }
    /**
     * Get NPC universal identity
     */
    async getNPCIdentity(tokenId) {
        return this.portabilityManager.getNPCIdentity(tokenId);
    }
    /**
     * Update NPC stats on universal identity
     */
    async updateUniversalStats(tokenId, stats) {
        await this.portabilityManager.updateNPCStats(tokenId, stats);
    }
    /**
     * Add experience to universal identity
     */
    async addUniversalExperience(tokenId, experience) {
        await this.portabilityManager.addExperience(tokenId, experience);
    }
    /**
     * Unlock achievement on universal identity
     */
    async unlockUniversalAchievement(tokenId, achievement) {
        await this.portabilityManager.unlockAchievement(tokenId, achievement);
    }
    /**
     * Generate portable NPC URL
     */
    generatePortableURL(migrationPackage) {
        return this.portabilityManager.generatePortableURL(migrationPackage);
    }
    /**
     * Parse portable NPC URL
     */
    parsePortableURL(url) {
        return this.portabilityManager.parsePortableURL(url);
    }
    /**
     * Process emotional impact of player interaction
     */
    async processEmotionalInteraction(npcId, playerAddress, task, result) {
        try {
            let action = 'unknown_interaction';
            const context = {
                taskType: task.type,
                success: result.success !== false
            };
            // Map task types to emotion triggers
            switch (task.type) {
                case 'duel':
                    if (result.success) {
                        action = result.winner === playerAddress ? 'player_won_duel' : 'npc_won_duel';
                    }
                    else {
                        action = 'duel_failed';
                    }
                    context.wager = task.params?.wager;
                    break;
                case 'quest':
                    action = result.success ? 'quest_completed' : 'quest_failed';
                    context.reward = task.params?.reward;
                    break;
                case 'trade':
                    action = result.success ? 'trade_completed' : 'trade_failed';
                    context.value = task.params?.value;
                    break;
                default:
                    action = result.success ? 'positive_interaction' : 'negative_interaction';
            }
            // Process the emotional impact
            const emotionResult = await this.emotionEngine.processInteraction(npcId.toString(), playerAddress, action, context);
            if (emotionResult.moodTransition) {
                console.log(`AgentRuntime: Mood transition for NPC ${npcId}: ${emotionResult.moodTransition.trigger} (intensity: ${emotionResult.moodTransition.intensity})`);
            }
            console.log(`AgentRuntime: Processed emotional interaction - reputation change: ${emotionResult.reputationChange}`);
        }
        catch (error) {
            console.error('AgentRuntime: Error processing emotional interaction:', error);
        }
    }
    /**
     * Get NPC's current emotional state
     */
    async getNPCEmotionalState(npcId) {
        return this.emotionEngine.getEmotionalState(npcId.toString());
    }
    /**
     * Get player's reputation with an NPC
     */
    async getPlayerReputation(playerAddress, npcId) {
        return this.emotionEngine.getPlayerReputation(playerAddress);
    }
    /**
     * Get NPC-specific reputation for a player
     */
    async getNPCSpecificReputation(playerAddress, npcId) {
        return this.emotionEngine.getNPCSpecificReputation(playerAddress, npcId.toString());
    }
    /**
     * Get mood history for an NPC
     */
    async getNPCMoodHistory(npcId, limit = 20) {
        return this.emotionEngine.getMoodHistory(npcId.toString(), limit);
    }
    /**
     * Get emotional influence on decision making
     */
    async getEmotionalInfluence(npcId) {
        return this.emotionEngine.getEmotionalInfluence(npcId.toString());
    }
    /**
     * Process emotional decay over time
     */
    async processEmotionalDecay(npcId, hoursElapsed) {
        return this.emotionEngine.processEmotionalDecay(npcId.toString(), hoursElapsed);
    }
    /**
     * Manually trigger an emotional interaction (for testing or special events)
     */
    async triggerEmotionalInteraction(npcId, playerAddress, action, context = {}) {
        return this.emotionEngine.processInteraction(npcId.toString(), playerAddress, action, context);
    }
}
exports.AgentRuntime = AgentRuntime;
// Export all classes
var Planner_2 = require("./Planner");
Object.defineProperty(exports, "Planner", { enumerable: true, get: function () { return Planner_2.Planner; } });
var Perception_2 = require("./Perception");
Object.defineProperty(exports, "Perception", { enumerable: true, get: function () { return Perception_2.Perception; } });
var Action_2 = require("./Action");
Object.defineProperty(exports, "Action", { enumerable: true, get: function () { return Action_2.Action; } });
var Referee_2 = require("./Referee");
Object.defineProperty(exports, "Referee", { enumerable: true, get: function () { return Referee_2.Referee; } });
