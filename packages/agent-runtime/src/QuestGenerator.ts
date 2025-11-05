import { GoogleGenerativeAI } from '@google/generative-ai';
import { nanoid } from 'nanoid';

export interface QuestTemplate {
    id: string;
    title: string;
    description: string;
    type: 'collection' | 'elimination' | 'exploration' | 'social' | 'puzzle' | 'escort';
    difficulty: 'easy' | 'medium' | 'hard' | 'legendary';
    objectives: QuestObjective[];
    rewards: QuestReward[];
    prerequisites: string[];
    timeLimit?: number; // in seconds
    isRepeatable: boolean;
    tags: string[];
    generatedBy: 'ai' | 'template' | 'community';
    createdAt: number;
}

export interface QuestObjective {
    id: string;
    description: string;
    type: 'kill' | 'collect' | 'interact' | 'reach' | 'survive' | 'craft';
    target: string;
    quantity: number;
    isCompleted: boolean;
    progress: number;
}

export interface QuestReward {
    type: 'token' | 'nft' | 'experience' | 'reputation' | 'item';
    amount: string;
    tokenAddress?: string;
    metadata?: any;
}

export interface GameEvent {
    id: string;
    title: string;
    description: string;
    type: 'seasonal' | 'random' | 'triggered' | 'community';
    startTime: number;
    endTime: number;
    participants: string[];
    rewards: QuestReward[];
    conditions: EventCondition[];
    isActive: boolean;
    generatedBy: 'ai' | 'schedule' | 'trigger';
}

export interface EventCondition {
    type: 'player_count' | 'time_of_day' | 'game_state' | 'npc_mood' | 'weather';
    operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
    value: any;
}

/**
 * AI-powered quest and event generation system
 */
export class QuestGenerator {
    private genAI: GoogleGenerativeAI;
    private model: any;
    private questTemplates: Map<string, QuestTemplate> = new Map();
    private activeEvents: Map<string, GameEvent> = new Map();

    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
        
        // Load some base templates
        this.loadBaseTemplates();
    }

    /**
     * Generate a dynamic quest based on game state and player history
     */
    async generateDynamicQuest(
        gameState: any,
        playerHistory: any[],
        npcPersonality?: any,
        difficulty: 'easy' | 'medium' | 'hard' | 'legendary' = 'medium'
    ): Promise<QuestTemplate> {
        try {
            const prompt = this.createQuestGenerationPrompt(gameState, playerHistory, npcPersonality, difficulty);
            
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const questData = this.parseQuestResponse(response.text());
            
            const quest: QuestTemplate = {
                id: nanoid(),
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

        } catch (error) {
            console.error('QuestGenerator: Error generating quest:', error);
            return this.getFallbackQuest(difficulty);
        }
    }

    /**
     * Generate a quest chain based on story progression
     */
    async generateQuestChain(
        theme: string,
        chainLength: number = 3,
        difficulty: 'easy' | 'medium' | 'hard' | 'legendary' = 'medium'
    ): Promise<QuestTemplate[]> {
        const chain: QuestTemplate[] = [];
        
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
                const quest: QuestTemplate = {
                    id: `${theme}_chain_${i + 1}_${nanoid(6)}`,
                    title: questData.title,
                    description: questData.description,
                    type: questData.type,
                    difficulty,
                    objectives: questData.objectives.map((obj: any) => ({
                        id: nanoid(),
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

        } catch (error) {
            console.error('QuestGenerator: Error generating quest chain:', error);
            return [this.getFallbackQuest(difficulty)];
        }
    }

    /**
     * Generate a random event based on current conditions
     */
    async generateRandomEvent(
        gameState: any,
        activePlayerCount: number,
        timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
    ): Promise<GameEvent | null> {
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

            const event: GameEvent = {
                id: nanoid(),
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

        } catch (error) {
            console.error('QuestGenerator: Error generating event:', error);
            return null;
        }
    }

    /**
     * Create quest generation prompt
     */
    private createQuestGenerationPrompt(
        gameState: any,
        playerHistory: any[],
        npcPersonality?: any,
        difficulty: string = 'medium'
    ): string {
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
    private parseQuestResponse(response: string): Partial<QuestTemplate> {
        try {
            // Clean up the response (remove markdown formatting if present)
            const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const questData = JSON.parse(cleanResponse);

            return {
                title: questData.title || 'Generated Quest',
                description: questData.description || 'A mysterious quest awaits...',
                type: questData.type || 'exploration',
                objectives: (questData.objectives || []).map((obj: any) => ({
                    id: nanoid(),
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

        } catch (error) {
            console.error('QuestGenerator: Error parsing quest response:', error);
            return this.getFallbackQuestData();
        }
    }

    /**
     * Get fallback quest when AI generation fails
     */
    private getFallbackQuest(difficulty: string): QuestTemplate {
        const fallbacks = {
            easy: {
                title: 'Collect Resources',
                description: 'Gather basic resources to help the community.',
                type: 'collection' as const,
                objectives: [{
                    id: nanoid(),
                    description: 'Collect 10 basic tokens',
                    type: 'collect' as const,
                    target: 'tokens',
                    quantity: 10,
                    isCompleted: false,
                    progress: 0
                }],
                rewards: [{ type: 'token' as const, amount: '500000000000000000' }]
            },
            medium: {
                title: 'Prove Your Worth',
                description: 'Complete a challenging task to gain recognition.',
                type: 'elimination' as const,
                objectives: [{
                    id: nanoid(),
                    description: 'Win 3 duels',
                    type: 'kill' as const,
                    target: 'opponents',
                    quantity: 3,
                    isCompleted: false,
                    progress: 0
                }],
                rewards: [{ type: 'token' as const, amount: '2000000000000000000' }]
            },
            hard: {
                title: 'Epic Challenge',
                description: 'Face the ultimate test of skill and determination.',
                type: 'puzzle' as const,
                objectives: [{
                    id: nanoid(),
                    description: 'Solve the ancient riddle',
                    type: 'interact' as const,
                    target: 'oracle',
                    quantity: 1,
                    isCompleted: false,
                    progress: 0
                }],
                rewards: [{ type: 'token' as const, amount: '5000000000000000000' }]
            },
            legendary: {
                title: 'Legendary Quest',
                description: 'A quest of epic proportions that will be remembered forever.',
                type: 'escort' as const,
                objectives: [{
                    id: nanoid(),
                    description: 'Complete the impossible task',
                    type: 'survive' as const,
                    target: 'trials',
                    quantity: 1,
                    isCompleted: false,
                    progress: 0
                }],
                rewards: [{ type: 'token' as const, amount: '10000000000000000000' }]
            }
        };

        const fallbackData = fallbacks[difficulty as keyof typeof fallbacks] || fallbacks.medium;

        return {
            id: nanoid(),
            ...fallbackData,
            difficulty: difficulty as any,
            prerequisites: [],
            isRepeatable: false,
            tags: ['fallback', difficulty],
            generatedBy: 'template',
            createdAt: Date.now()
        };
    }

    private getFallbackQuestData(): Partial<QuestTemplate> {
        return {
            title: 'Simple Task',
            description: 'A basic quest to get you started.',
            type: 'collection',
            objectives: [{
                id: nanoid(),
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
    private loadBaseTemplates(): void {
        const baseTemplates = [
            {
                id: 'welcome_quest',
                title: 'Welcome to the World',
                description: 'Learn the basics of this realm.',
                type: 'social' as const,
                difficulty: 'easy' as const,
                objectives: [{
                    id: nanoid(),
                    description: 'Talk to 3 different NPCs',
                    type: 'interact' as const,
                    target: 'npcs',
                    quantity: 3,
                    isCompleted: false,
                    progress: 0
                }],
                rewards: [{ type: 'token' as const, amount: '1000000000000000000' }],
                prerequisites: [],
                isRepeatable: false,
                tags: ['tutorial', 'welcome'],
                generatedBy: 'template' as const,
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
    getAvailableQuests(playerAddress: string, completedQuests: string[] = []): QuestTemplate[] {
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
    getActiveEvents(): GameEvent[] {
        const now = Date.now();
        return Array.from(this.activeEvents.values()).filter(event => 
            event.isActive && event.startTime <= now && event.endTime > now
        );
    }

    /**
     * Get quest by ID
     */
    getQuest(questId: string): QuestTemplate | undefined {
        return this.questTemplates.get(questId);
    }

    /**
     * Update quest progress
     */
    updateQuestProgress(questId: string, objectiveId: string, progress: number): boolean {
        const quest = this.questTemplates.get(questId);
        if (!quest) return false;

        const objective = quest.objectives.find(obj => obj.id === objectiveId);
        if (!objective) return false;

        objective.progress = Math.min(progress, objective.quantity);
        objective.isCompleted = objective.progress >= objective.quantity;

        return true;
    }
}