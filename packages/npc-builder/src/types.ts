export interface NPCTemplate {
  id: string;
  name: string;
  archetype: 'warrior' | 'merchant' | 'scholar' | 'trickster' | 'guardian' | 'balanced';
  personality: {
    friendly: number;
    aggressive: number;
    greedy: number;
    cautious: number;
    loyal: number;
    cunning: number;
    honest: number;
    mysterious: number;
    cheerful: number;
  };
  backstory: string;
  quirks: string[];
  appearance: {
    description: string;
    avatar: string;
  };
  capabilities: string[];
  dialogueStyle: 'formal' | 'casual' | 'mysterious' | 'aggressive' | 'friendly' | 'neutral';
  behaviorRules: BehaviorRule[];
  createdAt: number;
  updatedAt: number;
}

export interface BehaviorRule {
  id: string;
  condition: string;
  action: string;
  priority: number;
  isActive: boolean;
}

export interface DialogueNode {
  id: string;
  text: string;
  responses: DialogueResponse[];
  conditions?: string[];
  actions?: string[];
}

export interface DialogueResponse {
  id: string;
  text: string;
  nextNodeId?: string;
  requirements?: string[];
  effects?: string[];
}