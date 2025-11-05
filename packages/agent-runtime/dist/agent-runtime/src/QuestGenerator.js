"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestGenerator = void 0;
const generative_ai_1 = require("@google/generative-ai");
const nanoid_1 = require("nanoid");
/**
 * AI-powered quest and event generation system
 */
class QuestGenerator {
    constructor() {
        this.questTemplates = new Map();
        this.activeEvents = new Map();
        this.genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
        // Load some base templates
        this.loadBaseTemplates();
    }
    /**
     * Generate a dynamic quest based on game state and player history
     */
    async generateDynamicQuest(gameState, playerHistory, npcPersonality, difficulty = 'medium') {
        try {
            const prompt = this.createQuestGenerationPrompt(gameState, playerHistory, npcPersonality, difficulty);
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const questData = this.parseQuestResponse(response.text());
            const quest = {
                id: (0, nanoid_1.nanoid)(),
                title: questData.title || 'Generated Quest',
                description: questData.description || 'A mysterious quest awaits...',
                type: questData.type || 'exploration',
                difficulty,
                objectives: questData.objectives || [],
                rewards: questData.rewards || [],
                prerequisites: questData.prerequisites || [],
                timeLimit: questData.timeLimit,
                isRepeatable: false,
                tags: questData.tags || ['generated'],
                generatedBy: 'ai',
                createdAt: Date.now()
            };
            this.questTemplates.set(quest.id, quest);
            console.log(`QuestGenerator: Generated dynamic quest "${quest.title}"`);
            return quest;
        }
        catch (error) {
            console.error('QuestGenerator: Error generating quest:', error);
            return this.getFallbackQuest(difficulty);
        }
    }
    /**
     * Generate a quest chain based on story progression
     */
    async generateQuestChain(theme, chainLength = 3, difficulty = 'medium') {
        const chain = [];
        try {
            const prompt = `
Create a ${chainLength}-part quest chain with the theme "${theme}".
Each quest should build upon the previous one, creating a cohesive narrative.
Difficulty: ${difficulty}

Return a JSON array of quests, each with:
- title: Quest name
- description: Detailed quest description
- type: one of [collection, elimination, exploration, social, puzzle, escort]
- objectives: Array of objectives with {description, type, target, quantity}
- rewards: Array of rewards with {type, amount}
- prerequisites: Array of prerequisite quest IDs (use "quest_1", "quest_2", etc.)
- tags: Array of relevant tags

Make each quest unique and engaging, with escalating stakes and rewards.
`;
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const questsData = JSON.parse(response.text());
            for (let i = 0; i < questsData.length; i++) {
                const questData = questsData[i];
                const quest = {
                    id: `${theme}_chain_${i + 1}_${(0, nanoid_1.nanoid)(6)}`,
                    title: questData.title,
                    description: questData.description,
                    type: questData.type,
                    difficulty,
                    objectives: questData.objectives.map((obj) => ({
                        id: (0, nanoid_1.nanoid)(),
                        description: obj.description,
                        type: obj.type,
                        target: obj.target,
                        quantity: obj.quantity || 1,
                        isCompleted: false,
                        progress: 0
                    })),
                    rewards: questData.rewards,
                    prerequisites: i === 0 ? [] : [chain[i - 1].id],
                    isRepeatable: false,
                    tags: questData.tags || [theme],
                    generatedBy: 'ai',
                    createdAt: Date.now()
                };
                chain.push(quest);
                this.questTemplates.set(quest.id, quest);
            }
            console.log(`QuestGenerator: Generated ${chain.length}-quest chain for theme "${theme}"`);
            return chain;
        }
        catch (error) {
            console.error('QuestGenerator: Error generating quest chain:', error);
            return [this.getFallbackQuest(difficulty)];
        }
    }
    /**
     * Generate a random event based on current conditions
     */
    async generateRandomEvent(gameState, activePlayerCount, timeOfDay) {
        try {
            const prompt = `
Generate a random game event based on these conditions:
- Active players: ${activePlayerCount}
- Time of day: ${timeOfDay}
- Game state: ${JSON.stringify(gameState, null, 2)}

Create an engaging event that would be fun for the current player count and time.
Return JSON with:
- title: Event name
- description: What happens during the event
- type: one of [seasonal, random, triggered, community]
- duration: Duration in minutes
- rewards: Array of rewards for participants
- conditions: Any special conditions for participation

Make it exciting and appropriate for the current game state!
`;
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const eventData = JSON.parse(response.text());
            const event = {
                id: (0, nanoid_1.nanoid)(),
                title: eventData.title,
                description: eventData.description,
                type: eventData.type || 'random',
                startTime: Date.now(),
                endTime: Date.now() + (eventData.duration * 60 * 1000),
                participants: [],
                rewards: eventData.rewards || [],
                conditions: eventData.conditions || [],
                isActive: true,
                generatedBy: 'ai'
            };
            this.activeEvents.set(event.id, event);
            console.log(`QuestGenerator: Generated random event "${event.title}"`);
            return event;
        }
        catch (error) {
            console.error('QuestGenerator: Error generating event:', error);
            return null;
        }
    }
    /**
     * Create quest generation prompt
     */
    createQuestGenerationPrompt(gameState, playerHistory, npcPersonality, difficulty = 'medium') {
        let prompt = `
Generate a unique, engaging quest based on the current game state and player history.

Game State:
${JSON.stringify(gameState, null, 2)}

Player Recent History:
${playerHistory.map(h => `- ${h.action}: ${h.result}`).join('\n')}

Difficulty: ${difficulty}
`;
        if (npcPersonality) {
            prompt += `
NPC Personality giving this quest:
- Backstory: ${npcPersonality.backstory}
- Traits: ${Object.entries(npcPersonality.traits).map(([trait, value]) => `${trait}: ${value}`).join(', ')}
- Quirks: ${npcPersonality.quirks.join(', ')}

The quest should reflect this NPC's personality and motivations.
`;
        }
        prompt += `
Return a JSON object with:
- title: Creative quest name
- description: Detailed, engaging quest description
- type: one of [collection, elimination, exploration, social, puzzle, escort]
- objectives: Array of 1-3 objectives with {description, type, target, quantity}
- rewards: Array of appropriate rewards {type, amount, tokenAddress}
- tags: Array of relevant tags
- timeLimit: Optional time limit in seconds

Make it creative, fun, and appropriate for the current game state!
`;
        return prompt;
    }
    /**
     * Parse AI response into quest data
     */
    parseQuestResponse(response) {
        try {
            // Clean up the response (remove markdown formatting if present)
            const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const questData = JSON.parse(cleanResponse);
            return {
                title: questData.title || 'Generated Quest',
                description: questData.description || 'A mysterious quest awaits...',
                type: questData.type || 'exploration',
                objectives: (questData.objectives || []).map((obj) => ({
                    id: (0, nanoid_1.nanoid)(),
                    description: obj.description,
                    type: obj.type || 'interact',
                    target: obj.target || 'unknown',
                    quantity: obj.quantity || 1,
                    isCompleted: false,
                    progress: 0
                })),
                rewards: questData.rewards || [{ type: 'token', amount: '1000000000000000000' }],
                prerequisites: questData.prerequisites || [],
                timeLimit: questData.timeLimit,
                tags: questData.tags || ['generated']
            };
        }
        catch (error) {
            console.error('QuestGenerator: Error parsing quest response:', error);
            return this.getFallbackQuestData();
        }
    }
    /**
     * Get fallback quest when AI generation fails
     */
    getFallbackQuest(difficulty) {
        const fallbacks = {
            easy: {
                title: 'Collect Resources',
                description: 'Gather basic resources to help the community.',
                type: 'collection',
                objectives: [{
                        id: (0, nanoid_1.nanoid)(),
                        description: 'Collect 10 basic tokens',
                        type: 'collect',
                        target: 'tokens',
                        quantity: 10,
                        isCompleted: false,
                        progress: 0
                    }],
                rewards: [{ type: 'token', amount: '500000000000000000' }]
            },
            medium: {
                title: 'Prove Your Worth',
                description: 'Complete a challenging task to gain recognition.',
                type: 'elimination',
                objectives: [{
                        id: (0, nanoid_1.nanoid)(),
                        description: 'Win 3 duels',
                        type: 'kill',
                        target: 'opponents',
                        quantity: 3,
                        isCompleted: false,
                        progress: 0
                    }],
                rewards: [{ type: 'token', amount: '2000000000000000000' }]
            },
            hard: {
                title: 'Epic Challenge',
                description: 'Face the ultimate test of skill and determination.',
                type: 'puzzle',
                objectives: [{
                        id: (0, nanoid_1.nanoid)(),
                        description: 'Solve the ancient riddle',
                        type: 'interact',
                        target: 'oracle',
                        quantity: 1,
                        isCompleted: false,
                        progress: 0
                    }],
                rewards: [{ type: 'token', amount: '5000000000000000000' }]
            },
            legendary: {
                title: 'Legendary Quest',
                description: 'A quest of epic proportions that will be remembered forever.',
                type: 'escort',
                objectives: [{
                        id: (0, nanoid_1.nanoid)(),
                        description: 'Complete the impossible task',
                        type: 'survive',
                        target: 'trials',
                        quantity: 1,
                        isCompleted: false,
                        progress: 0
                    }],
                rewards: [{ type: 'token', amount: '10000000000000000000' }]
            }
        };
        const fallbackData = fallbacks[difficulty] || fallbacks.medium;
        return {
            id: (0, nanoid_1.nanoid)(),
            ...fallbackData,
            difficulty: difficulty,
            prerequisites: [],
            isRepeatable: false,
            tags: ['fallback', difficulty],
            generatedBy: 'template',
            createdAt: Date.now()
        };
    }
    getFallbackQuestData() {
        return {
            title: 'Simple Task',
            description: 'A basic quest to get you started.',
            type: 'collection',
            objectives: [{
                    id: (0, nanoid_1.nanoid)(),
                    description: 'Complete a simple task',
                    type: 'interact',
                    target: 'npc',
                    quantity: 1,
                    isCompleted: false,
                    progress: 0
                }],
            rewards: [{ type: 'token', amount: '1000000000000000000' }],
            prerequisites: [],
            tags: ['simple']
        };
    }
    /**
     * Load base quest templates
     */
    loadBaseTemplates() {
        const baseTemplates = [
            {
                id: 'welcome_quest',
                title: 'Welcome to the World',
                description: 'Learn the basics of this realm.',
                type: 'social',
                difficulty: 'easy',
                objectives: [{
                        id: (0, nanoid_1.nanoid)(),
                        description: 'Talk to 3 different NPCs',
                        type: 'interact',
                        target: 'npcs',
                        quantity: 3,
                        isCompleted: false,
                        progress: 0
                    }],
                rewards: [{ type: 'token', amount: '1000000000000000000' }],
                prerequisites: [],
                isRepeatable: false,
                tags: ['tutorial', 'welcome'],
                generatedBy: 'template',
                createdAt: Date.now()
            }
        ];
        baseTemplates.forEach(template => {
            this.questTemplates.set(template.id, template);
        });
    }
    /**
     * Get available quests for a player
     */
    getAvailableQuests(playerAddress, completedQuests = []) {
        return Array.from(this.questTemplates.values()).filter(quest => {
            // Check if already completed and not repeatable
            if (completedQuests.includes(quest.id) && !quest.isRepeatable) {
                return false;
            }
            // Check prerequisites
            if (quest.prerequisites.length > 0) {
                return quest.prerequisites.every(prereq => completedQuests.includes(prereq));
            }
            return true;
        });
    }
    /**
     * Get active events
     */
    getActiveEvents() {
        const now = Date.now();
        return Array.from(this.activeEvents.values()).filter(event => event.isActive && event.startTime <= now && event.endTime > now);
    }
    /**
     * Get quest by ID
     */
    getQuest(questId) {
        return this.questTemplates.get(questId);
    }
    /**
     * Update quest progress
     */
    updateQuestProgress(questId, objectiveId, progress) {
        const quest = this.questTemplates.get(questId);
        if (!quest)
            return false;
        const objective = quest.objectives.find(obj => obj.id === objectiveId);
        if (!objective)
            return false;
        objective.progress = Math.min(progress, objective.quantity);
        objective.isCompleted = objective.progress >= objective.quantity;
        return true;
    }
}
exports.QuestGenerator = QuestGenerator;
