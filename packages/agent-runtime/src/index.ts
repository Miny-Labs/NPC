import 'dotenv/config';
import { Planner } from './Planner';
import { Perception } from './Perception';
import { Action } from './Action';
import { Referee } from './Referee';
import { MemoryManager, MemoryType, PersonalityTrait } from './MemoryManager';
import { QuestGenerator, QuestTemplate, GameEvent } from './QuestGenerator';
import { NPCMesh, NPCAgent, NPCMessage, Alliance } from './NPCMesh';
import { PortabilityManager, NPCIdentity, MigrationPackage } from './PortabilityManager';
import { EmotionEngine, EmotionalState, PlayerReputation, MoodTransition } from './EmotionEngine';
import { AgentRuntimeInterface } from './AgentRuntimeInterface';

export class AgentRuntime implements AgentRuntimeInterface {
    private perception: Perception;
    private planner: Planner;
    private action: Action;
    private referee: Referee;
    private memoryManager: MemoryManager;
    private questGenerator: QuestGenerator;
    private npcMesh: NPCMesh;
    private portabilityManager: PortabilityManager;
    private emotionEngine: EmotionEngine;

    constructor() {
        console.log('Agent runtime starting...');
        this.perception = new Perception();
        this.planner = new Planner();
        this.action = new Action();
        this.referee = new Referee();
        this.memoryManager = new MemoryManager();
        this.questGenerator = new QuestGenerator();
        this.npcMesh = new NPCMesh(8081);
        this.portabilityManager = new PortabilityManager();
        this.emotionEngine = new EmotionEngine();
        
        // Set up mesh event listeners
        this.setupMeshEventListeners();
    }

    async handleTask(task: any): Promise<any> {
        console.log('AgentRuntime: Handling new task', task);

        try {
            const npcId = task.npcId || 1; // Default NPC ID if not specified

            // 1. Perception gathers state from the blockchain
            const observation = await this.perception.observe();

            // 2. Get personality context for decision making
            const personalityContext = await this.memoryManager.generatePersonalityContext(
                npcId, 
                `Task: ${task.type} with params: ${JSON.stringify(task.params)}`
            );

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
        } catch (error) {
            console.error('AgentRuntime: Error handling task:', error);
            
            // Store memory of failed task
            if (task.npcId) {
                await this.storeTaskMemory(task.npcId, task, null, { success: false, error: (error as Error).message });
            }
            
            throw error;
        }
    }

    /**
     * Store memory of task execution
     */
    private async storeTaskMemory(npcId: number, task: any, executionResult: any, finalResult: any): Promise<void> {
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

            await this.memoryManager.addMemory(
                npcId,
                task.params?.opponent || task.params?.creator || '0x0000000000000000000000000000000000000000',
                MemoryType.INTERACTION,
                memoryContent,
                emotionalWeight,
                [task.type, isPositive ? 'success' : 'failure'],
                isPositive
            );

            // Note: Personality evolution can be added later as needed

        } catch (error) {
            console.error('AgentRuntime: Error storing task memory:', error);
        }
    }

    /**
     * Initialize an NPC with personality and emotional state
     */
    async initializeNPC(
        npcId: number, 
        archetype: 'warrior' | 'merchant' | 'scholar' | 'trickster' | 'guardian',
        backstory: string,
        quirks: string[]
    ): Promise<void> {
        const traits = MemoryManager.createArchetype(archetype);
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
    async getNPCInfo(npcId: number): Promise<any> {
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
    async generateDynamicQuest(
        npcId: number,
        playerAddress: string,
        difficulty: 'easy' | 'medium' | 'hard' | 'legendary' = 'medium'
    ): Promise<QuestTemplate> {
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
            const quest = await this.questGenerator.generateDynamicQuest(
                observation,
                playerHistory,
                personality,
                difficulty
            );

            // Store memory of quest creation
            await this.memoryManager.addMemory(
                npcId,
                playerAddress,
                MemoryType.EVENT,
                {
                    action: 'quest_generated',
                    questId: quest.id,
                    questTitle: quest.title,
                    difficulty: quest.difficulty
                },
                50, // Medium emotional weight
                ['quest', 'generation', difficulty],
                true
            );

            console.log(`AgentRuntime: Generated quest "${quest.title}" for player ${playerAddress}`);
            return quest;

        } catch (error) {
            console.error('AgentRuntime: Error generating quest:', error);
            throw error;
        }
    }

    /**
     * Generate a quest chain with narrative progression
     */
    async generateQuestChain(
        theme: string,
        chainLength: number = 3,
        difficulty: 'easy' | 'medium' | 'hard' | 'legendary' = 'medium'
    ): Promise<QuestTemplate[]> {
        try {
            const questChain = await this.questGenerator.generateQuestChain(theme, chainLength, difficulty);
            
            console.log(`AgentRuntime: Generated ${questChain.length}-quest chain for theme "${theme}"`);
            return questChain;

        } catch (error) {
            console.error('AgentRuntime: Error generating quest chain:', error);
            throw error;
        }
    }

    /**
     * Generate a random event based on current conditions
     */
    async generateRandomEvent(activePlayerCount: number): Promise<GameEvent | null> {
        try {
            const observation = await this.perception.observe();
            const currentHour = new Date().getHours();
            
            let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
            if (currentHour >= 6 && currentHour < 12) timeOfDay = 'morning';
            else if (currentHour >= 12 && currentHour < 18) timeOfDay = 'afternoon';
            else if (currentHour >= 18 && currentHour < 22) timeOfDay = 'evening';
            else timeOfDay = 'night';

            const event = await this.questGenerator.generateRandomEvent(
                observation,
                activePlayerCount,
                timeOfDay
            );

            if (event) {
                console.log(`AgentRuntime: Generated random event "${event.title}"`);
            }

            return event;

        } catch (error) {
            console.error('AgentRuntime: Error generating random event:', error);
            return null;
        }
    }

    /**
     * Get available quests for a player
     */
    async getAvailableQuests(playerAddress: string, completedQuests: string[] = []): Promise<QuestTemplate[]> {
        return this.questGenerator.getAvailableQuests(playerAddress, completedQuests);
    }

    /**
     * Get active events
     */
    async getActiveEvents(): Promise<GameEvent[]> {
        return this.questGenerator.getActiveEvents();
    }

    /**
     * Update quest progress
     */
    async updateQuestProgress(questId: string, objectiveId: string, progress: number): Promise<boolean> {
        return this.questGenerator.updateQuestProgress(questId, objectiveId, progress);
    }

    /**
     * Setup NPC mesh event listeners
     */
    private setupMeshEventListeners(): void {
        this.npcMesh.on('messageReceived', async (message: NPCMessage) => {
            console.log(`AgentRuntime: Received mesh message from ${message.from}: ${message.type}`);
            
            // Store social interaction in memory
            if (message.from !== 'self') {
                await this.memoryManager.addMemory(
                    1, // Default NPC ID
                    message.from,
                    MemoryType.INTERACTION,
                    {
                        type: 'npc_communication',
                        messageType: message.type,
                        content: message.content
                    },
                    30, // Social interactions have moderate emotional weight
                    ['social', 'npc', message.type],
                    message.type !== 'betrayal'
                );
            }
        });

        this.npcMesh.on('allianceFormed', async (alliance: Alliance) => {
            console.log(`AgentRuntime: Alliance formed: ${alliance.purpose}`);
            
            // Store alliance formation in memory
            await this.memoryManager.addMemory(
                1,
                alliance.members.find(m => m !== 'self') || '',
                MemoryType.RELATIONSHIP,
                {
                    type: 'alliance_formed',
                    allianceId: alliance.id,
                    purpose: alliance.purpose,
                    members: alliance.members
                },
                70, // Alliances are emotionally significant
                ['alliance', 'cooperation', 'social'],
                true
            );
        });

        this.npcMesh.on('betrayalReceived', async (message: NPCMessage) => {
            console.log(`AgentRuntime: Betrayal received from ${message.from}`);
            
            // Store betrayal in memory with high emotional weight
            await this.memoryManager.addMemory(
                1,
                message.from,
                MemoryType.RELATIONSHIP,
                {
                    type: 'betrayal',
                    details: message.content
                },
                90, // Betrayals are highly emotional
                ['betrayal', 'negative', 'social'],
                false
            );
        });
    }

    /**
     * Register this NPC in the mesh network
     */
    async registerInMesh(npcId: number): Promise<void> {
        const personality = await this.memoryManager.getPersonalityProfile(npcId);
        
        await this.npcMesh.registerAgent(
            `npc_${npcId}`,
            `0x${npcId.toString(16).padStart(40, '0')}`, // Generate address from ID
            personality,
            ['duel', 'quest', 'trade', 'social']
        );
        
        console.log(`AgentRuntime: Registered NPC ${npcId} in mesh network`);
    }

    /**
     * Connect to another NPC
     */
    async connectToNPC(npcId: string, npcUrl: string): Promise<void> {
        await this.npcMesh.connectToAgent(npcId, npcUrl);
    }

    /**
     * Propose alliance with another NPC
     */
    async proposeAlliance(targetNpcId: string, purpose: string): Promise<void> {
        await this.npcMesh.proposeAlliance(targetNpcId, purpose);
    }

    /**
     * Spread gossip about another NPC
     */
    async spreadGossip(aboutNpcId: string, sentiment: 'positive' | 'negative', content: string): Promise<void> {
        await this.npcMesh.spreadGossip(aboutNpcId, sentiment, content);
    }

    /**
     * Get connected NPCs
     */
    async getConnectedNPCs(): Promise<NPCAgent[]> {
        return this.npcMesh.getConnectedAgents();
    }

    /**
     * Get active alliances
     */
    async getActiveAlliances(): Promise<Alliance[]> {
        return this.npcMesh.getActiveAlliances();
    }

    /**
     * Get recent NPC communications
     */
    async getRecentCommunications(): Promise<NPCMessage[]> {
        return this.npcMesh.getRecentMessages(20);
    }

    /**
     * Create universal NPC identity
     */
    async createUniversalIdentity(npcId: number, name: string, archetype: string): Promise<number> {
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
                        initialStats.strength += Math.floor((value as number - 50) / 2);
                        break;
                    case 'cunning':
                        initialStats.intelligence += Math.floor((value as number - 50) / 2);
                        break;
                    case 'friendly':
                        initialStats.charisma += Math.floor((value as number - 50) / 2);
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
    async exportNPC(npcId: number, sourceGame: string): Promise<MigrationPackage> {
        const personality = await this.memoryManager.getPersonalityProfile(npcId);
        
        const migrationPackage = await this.portabilityManager.exportNPCData(
            npcId,
            sourceGame,
            this.memoryManager,
            personality
        );

        console.log(`AgentRuntime: Exported NPC ${npcId} from ${sourceGame}`);
        return migrationPackage;
    }

    /**
     * Import NPC from migration package
     */
    async importNPC(migrationPackage: MigrationPackage, targetGame: string): Promise<boolean> {
        const success = await this.portabilityManager.importNPCData(
            migrationPackage,
            targetGame,
            this.memoryManager
        );

        if (success) {
            console.log(`AgentRuntime: Imported NPC ${migrationPackage.npcId} to ${targetGame}`);
        }

        return success;
    }

    /**
     * Get NPC universal identity
     */
    async getNPCIdentity(tokenId: number): Promise<NPCIdentity | null> {
        return this.portabilityManager.getNPCIdentity(tokenId);
    }

    /**
     * Update NPC stats on universal identity
     */
    async updateUniversalStats(tokenId: number, stats: Record<string, number>): Promise<void> {
        await this.portabilityManager.updateNPCStats(tokenId, stats);
    }

    /**
     * Add experience to universal identity
     */
    async addUniversalExperience(tokenId: number, experience: number): Promise<void> {
        await this.portabilityManager.addExperience(tokenId, experience);
    }

    /**
     * Unlock achievement on universal identity
     */
    async unlockUniversalAchievement(tokenId: number, achievement: string): Promise<void> {
        await this.portabilityManager.unlockAchievement(tokenId, achievement);
    }

    /**
     * Generate portable NPC URL
     */
    generatePortableURL(migrationPackage: MigrationPackage): string {
        return this.portabilityManager.generatePortableURL(migrationPackage);
    }

    /**
     * Parse portable NPC URL
     */
    parsePortableURL(url: string): MigrationPackage | null {
        return this.portabilityManager.parsePortableURL(url);
    }

    /**
     * Process emotional impact of player interaction
     */
    private async processEmotionalInteraction(
        npcId: number, 
        playerAddress: string, 
        task: any, 
        result: any
    ): Promise<void> {
        try {
            let action = 'unknown_interaction';
            const context: Record<string, any> = {
                taskType: task.type,
                success: result.success !== false
            };

            // Map task types to emotion triggers
            switch (task.type) {
                case 'duel':
                    if (result.success) {
                        action = result.winner === playerAddress ? 'player_won_duel' : 'npc_won_duel';
                    } else {
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
            const emotionResult = await this.emotionEngine.processInteraction(
                npcId.toString(),
                playerAddress,
                action,
                context
            );

            if (emotionResult.moodTransition) {
                console.log(`AgentRuntime: Mood transition for NPC ${npcId}: ${emotionResult.moodTransition.trigger} (intensity: ${emotionResult.moodTransition.intensity})`);
            }

            console.log(`AgentRuntime: Processed emotional interaction - reputation change: ${emotionResult.reputationChange}`);

        } catch (error) {
            console.error('AgentRuntime: Error processing emotional interaction:', error);
        }
    }

    /**
     * Get NPC's current emotional state
     */
    async getNPCEmotionalState(npcId: number): Promise<EmotionalState | null> {
        return this.emotionEngine.getEmotionalState(npcId.toString());
    }

    /**
     * Get player's reputation with an NPC
     */
    async getPlayerReputation(playerAddress: string, npcId?: number): Promise<PlayerReputation | null> {
        return this.emotionEngine.getPlayerReputation(playerAddress);
    }

    /**
     * Get NPC-specific reputation for a player
     */
    async getNPCSpecificReputation(playerAddress: string, npcId: number): Promise<number> {
        return this.emotionEngine.getNPCSpecificReputation(playerAddress, npcId.toString());
    }

    /**
     * Get mood history for an NPC
     */
    async getNPCMoodHistory(npcId: number, limit: number = 20): Promise<MoodTransition[]> {
        return this.emotionEngine.getMoodHistory(npcId.toString(), limit);
    }

    /**
     * Get emotional influence on decision making
     */
    async getEmotionalInfluence(npcId: number): Promise<{
        aggressiveness: number;
        trustfulness: number;
        helpfulness: number;
        riskTaking: number;
    }> {
        return this.emotionEngine.getEmotionalInfluence(npcId.toString());
    }

    /**
     * Process emotional decay over time
     */
    async processEmotionalDecay(npcId: number, hoursElapsed: number): Promise<EmotionalState> {
        return this.emotionEngine.processEmotionalDecay(npcId.toString(), hoursElapsed);
    }

    /**
     * Manually trigger an emotional interaction (for testing or special events)
     */
    async triggerEmotionalInteraction(
        npcId: number,
        playerAddress: string,
        action: string,
        context: Record<string, any> = {}
    ): Promise<{ newState: EmotionalState; reputationChange: number; moodTransition?: MoodTransition }> {
        return this.emotionEngine.processInteraction(npcId.toString(), playerAddress, action, context);
    }
}

// Export all classes
export { Planner } from './Planner';
export { Perception } from './Perception';
export { Action } from './Action';
export { Referee } from './Referee';
