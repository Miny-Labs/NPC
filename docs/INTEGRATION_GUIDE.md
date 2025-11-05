# NPC Engine Integration Guide

## Overview

This guide walks you through integrating the NPC Engine into your Somnia blockchain game. The NPC Engine provides autonomous NPCs with AI-powered decision making, emotional states, persistent memory, and cross-game portability.

## Quick Start

### 1. Installation

```bash
npm install @npc/sdk @npc/contracts
```

### 2. Basic Setup

```typescript
import { NpcSDK } from '@npc/sdk';

const npcSDK = new NpcSDK('http://localhost:3000');
npcSDK.setApiKey('your-api-key');

// Create a duel
const result = await npcSDK.openTask({
  type: 'duel',
  params: {
    opponent: '0x742d35Cc6634C0532925a3b8D4B9C05e5b8E4C7d',
    wager: '1000000000000000000'
  }
});
```

### 3. Deploy Contracts

```bash
cd packages/contracts
npx hardhat ignition deploy ignition/modules/NPCSystem.ts --network somnia_shannon
```

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Your Game     │    │  NPC Engine     │    │  Somnia Chain   │
│                 │    │                 │    │                 │
│  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  │    UI     │  │    │  │ A2A Gateway │  │    │  │ Contracts │  │
│  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │
│  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  │Game Logic │◄─┼────┼─►│Agent Runtime│◄─┼────┼─►│ Blockchain│  │
│  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │
│  ┌───────────┐  │    │  ┌───────────┐  │    │                 │
│  │   SDK     │  │    │  │   Memory   │  │    │                 │
│  └───────────┘  │    │  └───────────┘  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Integration Patterns

### Pattern 1: Direct SDK Integration

Best for: Simple games, prototypes, single-player experiences

```typescript
import { NpcSDK } from '@npc/sdk';

class GameManager {
  private npcSDK: NpcSDK;

  constructor() {
    this.npcSDK = new NpcSDK(process.env.NPC_GATEWAY_URL);
    this.npcSDK.setApiKey(process.env.NPC_API_KEY);
  }

  async startDuel(playerAddress: string, npcId: string) {
    try {
      const task = await this.npcSDK.openTask({
        type: 'duel',
        params: {
          opponent: playerAddress,
          wager: '1000000000000000000',
          tokenAddress: process.env.GAME_TOKEN_ADDRESS
        }
      });

      // Monitor task progress
      const eventSource = this.npcSDK.watchTask(task.taskId);
      eventSource.onmessage = (event) => {
        const update = JSON.parse(event.data);
        this.handleDuelUpdate(update);
      };

      return task;
    } catch (error) {
      console.error('Failed to start duel:', error);
      throw error;
    }
  }

  private handleDuelUpdate(update: any) {
    switch (update.status) {
      case 'completed':
        this.onDuelCompleted(update.result);
        break;
      case 'failed':
        this.onDuelFailed(update.error);
        break;
    }
  }
}
```

### Pattern 2: Contract Adapter Integration

Best for: Complex games, multi-player experiences, custom game mechanics

```typescript
import { GameActionAdapter } from '@npc/contracts';
import { ethers } from 'ethers';

class CustomGameIntegration {
  private gameAdapter: ethers.Contract;
  private npcSDK: NpcSDK;

  constructor(provider: ethers.Provider, signer: ethers.Signer) {
    this.gameAdapter = new ethers.Contract(
      process.env.GAME_ADAPTER_ADDRESS,
      GameActionAdapter.abi,
      signer
    );
    this.npcSDK = new NpcSDK(process.env.NPC_GATEWAY_URL);
  }

  async registerCustomAction(actionName: string, handler: string) {
    // Register custom game action with the adapter
    await this.gameAdapter.registerAction(actionName, handler);
  }

  async executeCustomAction(npcId: string, actionName: string, params: any) {
    // Execute custom action through the adapter
    const tx = await this.gameAdapter.executeAction(npcId, actionName, params);
    return tx.wait();
  }
}
```

### Pattern 3: Event-Driven Integration

Best for: Real-time games, MMORPGs, social games

```typescript
class EventDrivenIntegration {
  private eventEmitter: EventEmitter;
  private npcSDK: NpcSDK;

  constructor() {
    this.eventEmitter = new EventEmitter();
    this.npcSDK = new NpcSDK(process.env.NPC_GATEWAY_URL);
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen for game events
    this.eventEmitter.on('player.joined', this.onPlayerJoined.bind(this));
    this.eventEmitter.on('player.action', this.onPlayerAction.bind(this));
    this.eventEmitter.on('npc.interaction', this.onNPCInteraction.bind(this));
  }

  private async onPlayerAction(event: PlayerActionEvent) {
    // Trigger NPC emotional response
    if (event.targetType === 'npc') {
      await this.npcSDK.triggerEmotionalInteraction(
        event.targetId,
        event.playerAddress,
        event.actionType,
        event.context
      );
    }
  }

  private async onNPCInteraction(event: NPCInteractionEvent) {
    // Update player reputation
    await this.npcSDK.updatePlayerReputation(
      event.playerAddress,
      event.npcId,
      event.reputationDelta
    );
  }
}
```

## Core Features Integration

### 1. Autonomous NPCs

```typescript
// Initialize an NPC with personality
await npcSDK.initializeNPC({
  npcId: 1,
  archetype: 'warrior',
  backstory: 'A battle-hardened veteran seeking worthy opponents',
  quirks: ['Always polishes armor', 'Speaks in military terms'],
  personality: {
    aggressive: 80,
    loyal: 90,
    cautious: 60
  }
});

// Get NPC information
const npcInfo = await npcSDK.getNPCInfo(1);
console.log('NPC Personality:', npcInfo.personality);
console.log('Recent Memories:', npcInfo.recentMemories);
```

### 2. Dynamic Quest Generation

```typescript
// Generate a quest based on player history and current state
const quest = await npcSDK.generateDynamicQuest(
  1, // npcId
  '0x742d35Cc6634C0532925a3b8D4B9C05e5b8E4C7d', // playerAddress
  'medium' // difficulty
);

console.log('Generated Quest:', quest.title);
console.log('Objectives:', quest.objectives);
console.log('Rewards:', quest.rewards);

// Create quest chain
const questChain = await npcSDK.generateQuestChain(
  'dragon_saga', // theme
  5, // chain length
  'hard' // difficulty
);
```

### 3. Emotional State Management

```typescript
// Get NPC's current emotional state
const emotionalState = await npcSDK.getNPCEmotionalState(1);
console.log('Happiness:', emotionalState.happiness);
console.log('Trust:', emotionalState.trust);

// Trigger emotional interaction
const result = await npcSDK.triggerEmotionalInteraction(
  1, // npcId
  '0x742d35Cc6634C0532925a3b8D4B9C05e5b8E4C7d', // playerAddress
  'gift_received',
  { item: 'flower', value: 50 }
);

console.log('Reputation change:', result.reputationChange);
console.log('New emotional state:', result.newState);
```

### 4. Player Reputation System

```typescript
// Get player's reputation with an NPC
const reputation = await npcSDK.getPlayerReputation(
  '0x742d35Cc6634C0532925a3b8D4B9C05e5b8E4C7d'
);

console.log('Global Score:', reputation.globalScore);
console.log('Trustworthiness:', reputation.traits.trustworthiness);

// Get NPC-specific reputation
const npcReputation = await npcSDK.getNPCSpecificReputation(
  '0x742d35Cc6634C0532925a3b8D4B9C05e5b8E4C7d',
  1
);
```

### 5. Cross-Game Portability

```typescript
// Create universal NPC identity
const tokenId = await npcSDK.createUniversalIdentity(
  1, // npcId
  'Elite Guardian',
  'warrior'
);

// Export NPC for migration
const migrationPackage = await npcSDK.exportNPC(1, 'source-game');

// Import NPC to new game
const success = await npcSDK.importNPC(migrationPackage, 'target-game');

// Generate portable URL
const portableURL = npcSDK.generatePortableURL(migrationPackage);
console.log('Share this NPC:', portableURL);
```

## Custom Game Mechanics

### Implementing Custom Actions

1. **Define Action Interface**

```typescript
interface CustomAction {
  name: string;
  parameters: Record<string, any>;
  preconditions: string[];
  effects: string[];
}
```

2. **Register with Game Adapter**

```solidity
// In your game contract
contract MyGame {
    function craftItem(address player, uint256 recipe, uint256[] materials) 
        external 
        returns (bool success, uint256 itemId) 
    {
        // Custom crafting logic
        // ...
        return (true, newItemId);
    }
}
```

3. **Integrate with NPC Engine**

```typescript
// Register custom action
await gameAdapter.registerAction(
  'craft_item',
  myGameContract.address,
  'craftItem(address,uint256,uint256[])'
);

// NPCs can now use crafting in their decision making
```

### Custom Dialogue Systems

```typescript
class DialogueSystem {
  async getDialogueOptions(npcId: string, playerAddress: string, context: any) {
    // Get NPC's emotional state and player reputation
    const emotionalState = await npcSDK.getNPCEmotionalState(npcId);
    const reputation = await npcSDK.getNPCSpecificReputation(playerAddress, npcId);
    
    // Generate context-aware dialogue options
    const options = this.generateOptions(emotionalState, reputation, context);
    
    return options;
  }

  async selectDialogueOption(npcId: string, playerAddress: string, option: string) {
    // Record dialogue choice for analytics
    await analyticsEngine.recordDialogueBranch(
      sessionId,
      npcId,
      playerAddress,
      ['greeting', 'main_menu'],
      ['hello', 'trade', 'quest'],
      option
    );

    // Process emotional impact
    await npcSDK.processEmotionalInteraction(npcId, playerAddress, 'dialogue', {
      option,
      sentiment: this.analyzeSentiment(option)
    });
  }
}
```

## Testing and Validation

### Unit Testing NPCs

```typescript
import { PlaytestingHarness } from '@npc/agent-runtime';

describe('NPC Behavior Tests', () => {
  let harness: PlaytestingHarness;

  beforeEach(() => {
    harness = new PlaytestingHarness(mockAgentRuntime);
  });

  it('should handle basic duel scenario', async () => {
    const result = await harness.runScenario('basic_duel_test');
    
    expect(result.success).toBe(true);
    expect(result.executedActions).toBeGreaterThan(0);
    expect(result.performance.errorRate).toBeLessThan(0.1);
  });

  it('should detect exploit attempts', async () => {
    const result = await harness.runScenario('exploit_detection_test');
    
    expect(result.exploitsDetected.length).toBeGreaterThan(0);
    expect(result.exploitsDetected).toContain('rapid_fire_actions');
  });
});
```

### Integration Testing

```typescript
describe('Game Integration Tests', () => {
  it('should complete full quest workflow', async () => {
    // Generate quest
    const quest = await npcSDK.generateDynamicQuest(1, playerAddress, 'easy');
    
    // Start quest
    const task = await npcSDK.openTask({
      type: 'quest',
      params: { questId: quest.id }
    });
    
    // Complete quest
    await gameContract.completeQuest(quest.id, proof);
    
    // Verify completion
    const status = await npcSDK.getTaskStatus(task.taskId);
    expect(status.status).toBe('completed');
  });
});
```

## Performance Optimization

### Caching Strategies

```typescript
class NPCCache {
  private cache = new Map();
  private ttl = 300000; // 5 minutes

  async getNPCState(npcId: string) {
    const cached = this.cache.get(npcId);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }

    const state = await npcSDK.getNPCEmotionalState(npcId);
    this.cache.set(npcId, {
      data: state,
      timestamp: Date.now()
    });

    return state;
  }
}
```

### Batch Operations

```typescript
// Batch multiple NPC interactions
const batchResults = await Promise.all([
  npcSDK.processEmotionalInteraction(1, playerAddress, 'greeting'),
  npcSDK.processEmotionalInteraction(2, playerAddress, 'trade'),
  npcSDK.processEmotionalInteraction(3, playerAddress, 'quest')
]);
```

## Monitoring and Analytics

### Health Monitoring

```typescript
class NPCHealthMonitor {
  async checkHealth() {
    const health = await npcSDK.getHealth();
    
    if (health.status !== 'healthy') {
      this.alertOps('NPC Engine unhealthy', health);
    }

    return health;
  }

  async getMetrics() {
    const report = await fetch('/analytics/report', {
      headers: { 'X-API-Key': apiKey }
    }).then(r => r.json());

    return {
      totalSessions: report.data.totalSessions,
      successRate: report.data.successRate,
      averageResponseTime: report.data.averageSessionDuration,
      exploitsDetected: report.data.exploitsDetected.length
    };
  }
}
```

### Custom Analytics

```typescript
class GameAnalytics {
  async trackPlayerBehavior(playerAddress: string, action: string, context: any) {
    // Send to your analytics service
    await this.analyticsService.track('player_action', {
      player: playerAddress,
      action,
      context,
      timestamp: Date.now()
    });

    // Also send to NPC Engine for reputation tracking
    await npcSDK.recordPlayerAction(playerAddress, action, context);
  }
}
```

## Troubleshooting

### Common Issues

1. **Connection Timeouts**
   - Check network connectivity to NPC Gateway
   - Verify API key is valid
   - Ensure rate limits are not exceeded

2. **Transaction Failures**
   - Verify contract addresses are correct
   - Check gas limits and prices
   - Ensure sufficient token balances

3. **Unexpected NPC Behavior**
   - Check NPC emotional state and recent interactions
   - Verify personality configuration
   - Review behavior rules and priorities

### Debug Mode

```typescript
// Enable debug logging
const npcSDK = new NpcSDK(gatewayUrl, { debug: true });

// Get detailed task information
const taskDetails = await npcSDK.getTaskDetails(taskId);
console.log('Task execution trace:', taskDetails.trace);
```

## Best Practices

1. **Error Handling**: Always wrap NPC interactions in try-catch blocks
2. **Rate Limiting**: Implement client-side rate limiting to avoid API limits
3. **Caching**: Cache NPC states and player reputations when possible
4. **Monitoring**: Set up health checks and alerting for NPC services
5. **Testing**: Use the playtesting harness for comprehensive testing
6. **Security**: Validate all inputs and use secure API key management

## Support and Community

- **Documentation**: [docs.npc-engine.com](https://docs.npc-engine.com)
- **Discord**: [discord.gg/npc-engine](https://discord.gg/npc-engine)
- **GitHub**: [github.com/npc-engine](https://github.com/npc-engine)
- **Examples**: [github.com/npc-engine/examples](https://github.com/npc-engine/examples)