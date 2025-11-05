import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { nanoid } from 'nanoid';

export interface NPCAgent {
    id: string;
    address: string;
    personality: any;
    capabilities: string[];
    status: 'online' | 'offline' | 'busy';
    lastSeen: number;
    reputation: number;
    relationships: Map<string, number>; // NPC ID -> affinity score
}

export interface NPCMessage {
    id: string;
    from: string;
    to: string;
    type: 'greeting' | 'proposal' | 'negotiation' | 'alliance' | 'betrayal' | 'gossip' | 'trade';
    content: any;
    timestamp: number;
    requiresResponse: boolean;
}

export interface Alliance {
    id: string;
    members: string[];
    purpose: string;
    createdAt: number;
    expiresAt?: number;
    terms: any;
    isActive: boolean;
}

/**
 * Real-time NPC-to-NPC communication mesh using WebSockets and A2A protocols
 */
export class NPCMesh extends EventEmitter {
    private agents: Map<string, NPCAgent> = new Map();
    private connections: Map<string, WebSocket> = new Map();
    private alliances: Map<string, Alliance> = new Map();
    private messageHistory: NPCMessage[] = [];
    private meshPort: number;
    private server: WebSocket.Server | null = null;
    private discoveryInterval: NodeJS.Timeout | null = null;

    constructor(meshPort: number = 8081) {
        super();
        this.meshPort = meshPort;
        this.startMeshServer();
        this.startDiscoveryService();
    }

    /**
     * Start the mesh WebSocket server
     */
    private startMeshServer(): void {
        this.server = new WebSocket.Server({ port: this.meshPort });
        
        this.server.on('connection', (ws: WebSocket, req) => {
            console.log('NPCMesh: New agent connected');
            
            ws.on('message', (data: string) => {
                try {
                    const message = JSON.parse(data);
                    this.handleIncomingMessage(message, ws);
                } catch (error) {
                    console.error('NPCMesh: Invalid message format:', error);
                }
            });

            ws.on('close', () => {
                // Find and mark agent as offline
                for (const [agentId, agent] of this.agents.entries()) {
                    if (this.connections.get(agentId) === ws) {
                        agent.status = 'offline';
                        this.connections.delete(agentId);
                        this.emit('agentDisconnected', agentId);
                        break;
                    }
                }
            });
        });

        console.log(`NPCMesh: Server started on port ${this.meshPort}`);
    }

    /**
     * Register an NPC agent in the mesh
     */
    async registerAgent(
        agentId: string,
        address: string,
        personality: any,
        capabilities: string[]
    ): Promise<void> {
        const agent: NPCAgent = {
            id: agentId,
            address,
            personality,
            capabilities,
            status: 'online',
            lastSeen: Date.now(),
            reputation: 50, // Start with neutral reputation
            relationships: new Map()
        };

        this.agents.set(agentId, agent);
        
        // Announce to other agents
        await this.broadcastMessage({
            from: agentId,
            to: 'all',
            type: 'greeting',
            content: {
                action: 'agent_joined',
                agent: {
                    id: agentId,
                    capabilities,
                    personality: this.getPersonalitySummary(personality)
                }
            },
            requiresResponse: false
        });

        this.emit('agentRegistered', agent);
        console.log(`NPCMesh: Registered agent ${agentId}`);
    }

    /**
     * Connect to another NPC agent
     */
    async connectToAgent(agentId: string, agentUrl: string): Promise<void> {
        try {
            const ws = new WebSocket(agentUrl);
            
            ws.on('open', () => {
                this.connections.set(agentId, ws);
                console.log(`NPCMesh: Connected to agent ${agentId}`);
                
                // Send introduction
                this.sendMessage(agentId, {
                    from: 'self',
                    to: agentId,
                    type: 'greeting',
                    content: { action: 'introduction' },
                    requiresResponse: true
                });
            });

            ws.on('message', (data: string) => {
                try {
                    const message = JSON.parse(data);
                    this.handleIncomingMessage(message, ws);
                } catch (error) {
                    console.error('NPCMesh: Invalid message from agent:', error);
                }
            });

            ws.on('close', () => {
                this.connections.delete(agentId);
                const agent = this.agents.get(agentId);
                if (agent) {
                    agent.status = 'offline';
                }
            });

        } catch (error) {
            console.error(`NPCMesh: Failed to connect to agent ${agentId}:`, error);
        }
    }

    /**
     * Send a message to a specific agent
     */
    async sendMessage(targetAgentId: string, message: Omit<NPCMessage, 'id' | 'timestamp'>): Promise<void> {
        const fullMessage: NPCMessage = {
            ...message,
            id: nanoid(),
            timestamp: Date.now()
        };

        const connection = this.connections.get(targetAgentId);
        if (connection && connection.readyState === WebSocket.OPEN) {
            connection.send(JSON.stringify(fullMessage));
            this.messageHistory.push(fullMessage);
            
            // Keep only last 1000 messages
            if (this.messageHistory.length > 1000) {
                this.messageHistory.shift();
            }
        } else {
            console.warn(`NPCMesh: No connection to agent ${targetAgentId}`);
        }
    }

    /**
     * Broadcast message to all connected agents
     */
    async broadcastMessage(message: Omit<NPCMessage, 'id' | 'timestamp'>): Promise<void> {
        const fullMessage: NPCMessage = {
            ...message,
            id: nanoid(),
            timestamp: Date.now()
        };

        for (const [agentId, connection] of this.connections.entries()) {
            if (connection.readyState === WebSocket.OPEN) {
                connection.send(JSON.stringify(fullMessage));
            }
        }

        this.messageHistory.push(fullMessage);
    }

    /**
     * Handle incoming messages from other agents
     */
    private handleIncomingMessage(message: NPCMessage, ws: WebSocket): void {
        this.messageHistory.push(message);
        
        switch (message.type) {
            case 'greeting':
                this.handleGreeting(message, ws);
                break;
            case 'proposal':
                this.handleProposal(message);
                break;
            case 'negotiation':
                this.handleNegotiation(message);
                break;
            case 'alliance':
                this.handleAlliance(message);
                break;
            case 'betrayal':
                this.handleBetrayal(message);
                break;
            case 'gossip':
                this.handleGossip(message);
                break;
            case 'trade':
                this.handleTrade(message);
                break;
        }

        this.emit('messageReceived', message);
    }

    /**
     * Handle greeting messages
     */
    private handleGreeting(message: NPCMessage, ws: WebSocket): void {
        if (message.content.action === 'introduction' && message.requiresResponse) {
            // Respond with our own introduction
            const response: NPCMessage = {
                id: nanoid(),
                from: 'self',
                to: message.from,
                type: 'greeting',
                content: {
                    action: 'introduction_response',
                    capabilities: ['duel', 'quest', 'trade'],
                    personality: 'friendly'
                },
                timestamp: Date.now(),
                requiresResponse: false
            };

            ws.send(JSON.stringify(response));
        }
    }

    /**
     * Handle proposal messages (alliance, trade, etc.)
     */
    private handleProposal(message: NPCMessage): void {
        const fromAgent = this.agents.get(message.from);
        if (!fromAgent) return;

        // Simple AI decision making based on reputation and relationship
        const relationship = fromAgent.relationships.get('self') || 0;
        const acceptChance = Math.min(0.8, (fromAgent.reputation + relationship + 100) / 200);
        
        const accept = Math.random() < acceptChance;
        
        this.sendMessage(message.from, {
            from: 'self',
            to: message.from,
            type: 'negotiation',
            content: {
                originalProposal: message.id,
                response: accept ? 'accept' : 'reject',
                reason: accept ? 'Sounds good!' : 'Not interested right now'
            },
            requiresResponse: false
        });

        this.emit('proposalReceived', { message, accepted: accept });
    }

    /**
     * Handle negotiation messages
     */
    private handleNegotiation(message: NPCMessage): void {
        this.emit('negotiationUpdate', message);
    }

    /**
     * Handle alliance formation
     */
    private handleAlliance(message: NPCMessage): void {
        if (message.content.action === 'form') {
            const alliance: Alliance = {
                id: nanoid(),
                members: [message.from, 'self'],
                purpose: message.content.purpose || 'mutual benefit',
                createdAt: Date.now(),
                expiresAt: message.content.duration ? Date.now() + message.content.duration : undefined,
                terms: message.content.terms || {},
                isActive: true
            };

            this.alliances.set(alliance.id, alliance);
            this.emit('allianceFormed', alliance);
        }
    }

    /**
     * Handle betrayal messages
     */
    private handleBetrayal(message: NPCMessage): void {
        const fromAgent = this.agents.get(message.from);
        if (fromAgent) {
            // Reduce relationship and reputation
            const currentRelationship = fromAgent.relationships.get('self') || 0;
            fromAgent.relationships.set('self', Math.max(-100, currentRelationship - 30));
            fromAgent.reputation = Math.max(0, fromAgent.reputation - 20);
        }

        // Break any alliances with this agent
        for (const [allianceId, alliance] of this.alliances.entries()) {
            if (alliance.members.includes(message.from)) {
                alliance.isActive = false;
                this.emit('allianceBroken', { alliance, reason: 'betrayal' });
            }
        }

        this.emit('betrayalReceived', message);
    }

    /**
     * Handle gossip messages
     */
    private handleGossip(message: NPCMessage): void {
        // Gossip affects reputation of mentioned agents
        if (message.content.about && message.content.sentiment) {
            const aboutAgent = this.agents.get(message.content.about);
            if (aboutAgent) {
                const change = message.content.sentiment === 'positive' ? 2 : -2;
                aboutAgent.reputation = Math.max(0, Math.min(100, aboutAgent.reputation + change));
            }
        }

        this.emit('gossipReceived', message);
    }

    /**
     * Handle trade messages
     */
    private handleTrade(message: NPCMessage): void {
        this.emit('tradeProposal', message);
    }

    /**
     * Propose an alliance to another agent
     */
    async proposeAlliance(targetAgentId: string, purpose: string, terms: any = {}): Promise<void> {
        await this.sendMessage(targetAgentId, {
            from: 'self',
            to: targetAgentId,
            type: 'proposal',
            content: {
                type: 'alliance',
                purpose,
                terms,
                duration: 24 * 60 * 60 * 1000 // 24 hours
            },
            requiresResponse: true
        });
    }

    /**
     * Spread gossip about another agent
     */
    async spreadGossip(about: string, sentiment: 'positive' | 'negative', content: string): Promise<void> {
        await this.broadcastMessage({
            from: 'self',
            to: 'all',
            type: 'gossip',
            content: {
                about,
                sentiment,
                message: content
            },
            requiresResponse: false
        });
    }

    /**
     * Get personality summary for sharing
     */
    private getPersonalitySummary(personality: any): any {
        if (!personality || !personality.traits) {
            return { type: 'neutral' };
        }

        // Find dominant traits
        const dominantTraits = Object.entries(personality.traits)
            .filter(([_, value]) => (value as number) > 60)
            .map(([trait, _]) => trait);

        return {
            type: dominantTraits.length > 0 ? dominantTraits[0] : 'balanced',
            traits: dominantTraits.slice(0, 3) // Top 3 traits
        };
    }

    /**
     * Start discovery service to find other NPCs
     */
    private startDiscoveryService(): void {
        this.discoveryInterval = setInterval(() => {
            // Clean up offline agents
            for (const [agentId, agent] of this.agents.entries()) {
                if (agent.status === 'offline' && Date.now() - agent.lastSeen > 300000) { // 5 minutes
                    this.agents.delete(agentId);
                    this.connections.delete(agentId);
                }
            }

            // Emit discovery event for external systems to handle
            this.emit('discoveryTick', {
                onlineAgents: Array.from(this.agents.values()).filter(a => a.status === 'online').length,
                totalAgents: this.agents.size
            });

        }, 30000); // Every 30 seconds
    }

    /**
     * Get all connected agents
     */
    getConnectedAgents(): NPCAgent[] {
        return Array.from(this.agents.values()).filter(agent => agent.status === 'online');
    }

    /**
     * Get active alliances
     */
    getActiveAlliances(): Alliance[] {
        return Array.from(this.alliances.values()).filter(alliance => alliance.isActive);
    }

    /**
     * Get recent messages
     */
    getRecentMessages(count: number = 50): NPCMessage[] {
        return this.messageHistory.slice(-count);
    }

    /**
     * Shutdown the mesh
     */
    shutdown(): void {
        if (this.discoveryInterval) {
            clearInterval(this.discoveryInterval);
        }

        for (const connection of this.connections.values()) {
            connection.close();
        }

        if (this.server) {
            this.server.close();
        }

        console.log('NPCMesh: Shutdown complete');
    }
}