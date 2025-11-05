# NPC Engine Agent Card Specification

## Overview

The NPC Engine implements the A2A (Agent-to-Agent) protocol for autonomous NPC interactions. This specification defines the Agent Card format and communication protocols used by NPCs in the Somnia blockchain ecosystem.

## Agent Card Schema

### Core Structure

```json
{
  "version": "1.0.0",
  "id": "npc-engine-agent",
  "name": "NPC Engine Agent",
  "description": "Autonomous NPC agent for Somnia blockchain games",
  "capabilities": [
    "duel",
    "quest", 
    "trade",
    "social",
    "emotion",
    "memory"
  ],
  "transports": [
    {
      "type": "http",
      "url": "http://localhost:3000/rpc",
      "methods": ["POST"]
    },
    {
      "type": "sse",
      "url": "http://localhost:3000/stream/{taskId}",
      "methods": ["GET"]
    }
  ],
  "authentication": {
    "type": "api-key",
    "header": "X-API-Key"
  },
  "metadata": {
    "blockchain": "somnia",
    "network": "shannon-testnet",
    "contracts": {
      "arena": "0x8874BdDD83553f6ca333e37932B9C6c5Af82Ab0F",
      "quest": "0x5d07DF9a6c61b6183Ce08E268486358Eb4f993a2",
      "npcRegistry": "0x0d042408f1E6835E45f4DEb9E0c1662032E6d99C",
      "behaviorController": "0x680930364Be2D733ac9286D3930635e7a27703E7"
    }
  }
}
```

### Capability Definitions

#### Duel Capability
Enables PvP combat interactions with escrow mechanics.

**Parameters:**
- `opponent` (address): Ethereum address of the opponent
- `wager` (string): Amount in wei to wager
- `tokenAddress` (address): ERC20 token contract address

**Example:**
```json
{
  "type": "duel",
  "params": {
    "opponent": "0x742d35Cc6634C0532925a3b8D4B9C05e5b8E4C7d",
    "wager": "1000000000000000000",
    "tokenAddress": "0x6F30b8B34D042eF9f9bcFE0716CD44B607EA7845"
  }
}
```

#### Quest Capability
Enables PvE objective-based interactions.

**Parameters:**
- `questId` (string): Unique quest identifier
- `difficulty` (string): Quest difficulty level (easy, medium, hard, legendary)
- `reward` (string): Reward amount in wei
- `timeLimit` (number): Time limit in seconds

**Example:**
```json
{
  "type": "quest",
  "params": {
    "questId": "dragon_slayer_001",
    "difficulty": "hard",
    "reward": "5000000000000000000",
    "timeLimit": 3600
  }
}
```

#### Trade Capability
Enables economic interactions and item exchanges.

**Parameters:**
- `item` (string): Item identifier
- `quantity` (number): Number of items
- `price` (string): Price per item in wei
- `currency` (address): Payment token address

#### Social Capability
Enables social interactions and reputation building.

**Parameters:**
- `action` (string): Social action type (greet, help, gift, etc.)
- `message` (string): Optional message content
- `emotion` (string): Emotional context

#### Emotion Capability
Enables emotional state tracking and mood-based responses.

**Parameters:**
- `trigger` (string): Emotion trigger event
- `intensity` (number): Emotional intensity (0-100)
- `context` (object): Additional context data

#### Memory Capability
Enables persistent memory and learning from interactions.

**Parameters:**
- `memoryType` (string): Type of memory (interaction, relationship, event)
- `content` (object): Memory content
- `importance` (number): Memory importance weight (0-100)

## Communication Protocol

### JSON-RPC 2.0 Format

All communication follows JSON-RPC 2.0 specification:

```json
{
  "jsonrpc": "2.0",
  "method": "task.open",
  "params": {
    "type": "duel",
    "params": {
      "opponent": "0x742d35Cc6634C0532925a3b8D4B9C05e5b8E4C7d",
      "wager": "1000000000000000000"
    }
  },
  "id": 1
}
```

### Supported Methods

#### task.open
Opens a new task for execution.

**Parameters:**
- `type` (string): Task type matching agent capabilities
- `params` (object): Task-specific parameters

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "taskId": "task_1234567890",
    "status": "pending",
    "estimatedDuration": 30000
  },
  "id": 1
}
```

#### task.status
Retrieves the status of an existing task.

**Parameters:**
- `taskId` (string): Task identifier

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "taskId": "task_1234567890",
    "status": "completed",
    "result": {
      "success": true,
      "transactionHash": "0xabc123...",
      "gasUsed": 150000
    }
  },
  "id": 2
}
```

#### task.list
Lists all tasks for the requesting agent.

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "tasks": [
      {
        "taskId": "task_1234567890",
        "type": "duel",
        "status": "completed",
        "createdAt": 1640995200000
      }
    ],
    "totalTasks": 1
  },
  "id": 3
}
```

### Server-Sent Events (SSE)

Real-time task updates are provided via SSE streams:

**Endpoint:** `GET /stream/{taskId}`

**Event Format:**
```
event: task.update
data: {"taskId": "task_1234567890", "status": "processing", "progress": 50}

event: task.completed
data: {"taskId": "task_1234567890", "status": "completed", "result": {...}}
```

## Error Handling

### Standard Error Codes

- `-32600`: Invalid Request
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error
- `-32001`: Authentication failed
- `-32002`: Rate limit exceeded
- `-32010`: Insufficient funds
- `-32011`: Contract execution failed

### Error Response Format

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": {
      "field": "opponent",
      "reason": "Invalid Ethereum address format"
    }
  },
  "id": 1
}
```

## Authentication

### API Key Authentication

Include API key in request headers:
```
X-API-Key: your-api-key-here
```

### Rate Limiting

- 100 requests per minute per API key
- Burst limit: 10 requests per second
- Rate limit headers included in responses

## Blockchain Integration

### Contract Interfaces

NPCs interact with standardized smart contracts:

#### Arena Contract (Duels)
```solidity
interface IArena {
    function createDuel(address opponent, uint256 wager, address token) external returns (uint256);
    function acceptDuel(uint256 duelId) external;
    function executeDuel(uint256 duelId) external;
}
```

#### Quest Contract (PvE)
```solidity
interface IQuest {
    function createQuest(string memory metadataUri, uint256 reward, address token) external returns (uint256);
    function completeQuest(uint256 questId, bytes memory proof) external;
}
```

### Event Monitoring

NPCs monitor blockchain events for state changes:

```solidity
event DuelCreated(uint256 indexed duelId, address indexed creator, address indexed opponent);
event QuestCompleted(uint256 indexed questId, address indexed player, uint256 reward);
```

## Compliance Requirements

### A2A Protocol Compliance

1. **Agent Card Publishing**: Must serve agent card at `/.well-known/agent-card`
2. **Standard Methods**: Must implement `task.open`, `task.status`, `task.list`
3. **Error Handling**: Must use standard JSON-RPC error codes
4. **Authentication**: Must support API key authentication
5. **Rate Limiting**: Must implement reasonable rate limits

### Security Requirements

1. **Input Validation**: All parameters must be validated
2. **Access Control**: API keys must be properly managed
3. **Transaction Safety**: All blockchain transactions must be validated
4. **Audit Logging**: All interactions must be logged for audit

## Extension Points

### Custom Capabilities

Agents can define custom capabilities beyond the standard set:

```json
{
  "capabilities": [
    "duel",
    "quest",
    "custom:crafting",
    "custom:guild-management"
  ]
}
```

### Metadata Extensions

Additional metadata can be included for specific use cases:

```json
{
  "metadata": {
    "game": "fantasy-rpg",
    "version": "2.1.0",
    "features": ["advanced-ai", "emotional-responses"],
    "customFields": {
      "maxPlayers": 1000,
      "supportedLanguages": ["en", "es", "fr"]
    }
  }
}
```

## Versioning

Agent Cards use semantic versioning:
- Major version: Breaking changes to protocol
- Minor version: New capabilities or features
- Patch version: Bug fixes and improvements

Agents should specify supported protocol versions in their card.