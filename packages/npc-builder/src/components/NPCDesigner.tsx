import React, { useState } from 'react'
import {
  Box,
  Tabs,
  Tab,
  Button,
  TextField,
  Typography,
  Grid,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Card,
  CardContent,
  Divider
} from '@mui/material'
import {
  Save as SaveIcon,
  ArrowBack as BackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Download as ExportIcon
} from '@mui/icons-material'
import { NPCTemplate, BehaviorRule } from '../types'

interface Props {
  npc: NPCTemplate
  onSave: (npc: NPCTemplate) => void
  onBack: () => void
}

function NPCDesigner({ npc, onSave, onBack }: Props) {
  const [currentTab, setCurrentTab] = useState(0)
  const [editingNPC, setEditingNPC] = useState<NPCTemplate>(npc)
  const [newQuirk, setNewQuirk] = useState('')
  const [newCapability, setNewCapability] = useState('')

  const handlePersonalityChange = (trait: string, value: number) => {
    setEditingNPC({
      ...editingNPC,
      personality: {
        ...editingNPC.personality,
        [trait]: value
      }
    })
  }

  const handleAddQuirk = () => {
    if (newQuirk.trim()) {
      setEditingNPC({
        ...editingNPC,
        quirks: [...editingNPC.quirks, newQuirk.trim()]
      })
      setNewQuirk('')
    }
  }

  const handleRemoveQuirk = (index: number) => {
    setEditingNPC({
      ...editingNPC,
      quirks: editingNPC.quirks.filter((_, i) => i !== index)
    })
  }

  const handleAddCapability = () => {
    if (newCapability.trim()) {
      setEditingNPC({
        ...editingNPC,
        capabilities: [...editingNPC.capabilities, newCapability.trim()]
      })
      setNewCapability('')
    }
  }

  const handleRemoveCapability = (index: number) => {
    setEditingNPC({
      ...editingNPC,
      capabilities: editingNPC.capabilities.filter((_, i) => i !== index)
    })
  }

  const handleAddBehaviorRule = () => {
    const newRule: BehaviorRule = {
      id: `rule_${Date.now()}`,
      condition: 'When player approaches',
      action: 'Greet player',
      priority: 1,
      isActive: true
    }
    
    setEditingNPC({
      ...editingNPC,
      behaviorRules: [...editingNPC.behaviorRules, newRule]
    })
  }

  const handleUpdateBehaviorRule = (ruleId: string, updates: Partial<BehaviorRule>) => {
    setEditingNPC({
      ...editingNPC,
      behaviorRules: editingNPC.behaviorRules.map(rule =>
        rule.id === ruleId ? { ...rule, ...updates } : rule
      )
    })
  }

  const handleRemoveBehaviorRule = (ruleId: string) => {
    setEditingNPC({
      ...editingNPC,
      behaviorRules: editingNPC.behaviorRules.filter(rule => rule.id !== ruleId)
    })
  }

  const handleSave = () => {
    onSave(editingNPC)
  }

  const handleExport = () => {
    // Generate Agent Card format
    const agentCard = {
      id: editingNPC.id,
      name: editingNPC.name,
      version: '1.0.0',
      description: editingNPC.backstory || `A ${editingNPC.archetype} NPC`,
      personality: editingNPC.personality,
      capabilities: editingNPC.capabilities,
      behaviorRules: editingNPC.behaviorRules,
      archetype: editingNPC.archetype,
      quirks: editingNPC.quirks,
      dialogueStyle: editingNPC.dialogueStyle,
      createdWith: 'npc-builder-gui',
      exportedAt: Date.now()
    }

    const blob = new Blob([JSON.stringify(agentCard, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${editingNPC.name.replace(/\s+/g, '_')}_agent_card.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const personalityTraits = [
    { key: 'friendly', label: 'Friendly', color: '#10b981' },
    { key: 'aggressive', label: 'Aggressive', color: '#ef4444' },
    { key: 'greedy', label: 'Greedy', color: '#f59e0b' },
    { key: 'cautious', label: 'Cautious', color: '#6366f1' },
    { key: 'loyal', label: 'Loyal', color: '#8b5cf6' },
    { key: 'cunning', label: 'Cunning', color: '#ec4899' },
    { key: 'honest', label: 'Honest', color: '#06b6d4' },
    { key: 'mysterious', label: 'Mysterious', color: '#64748b' },
    { key: 'cheerful', label: 'Cheerful', color: '#84cc16' }
  ]

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={onBack} sx={{ mr: 2 }}>
          <BackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          {editingNPC.name} - NPC Designer
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ExportIcon />}
          onClick={handleExport}
          sx={{ mr: 2 }}
        >
          Export Agent Card
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
        >
          Save NPC
        </Button>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
          <Tab label="Basic Info" />
          <Tab label="Personality" />
          <Tab label="Behavior Rules" />
          <Tab label="Appearance" />
          <Tab label="Preview" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {currentTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="NPC Name"
              value={editingNPC.name}
              onChange={(e) => setEditingNPC({ ...editingNPC, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Archetype</InputLabel>
              <Select
                value={editingNPC.archetype}
                onChange={(e) => setEditingNPC({ ...editingNPC, archetype: e.target.value as any })}
              >
                <MenuItem value="warrior">⚔️ Warrior</MenuItem>
                <MenuItem value="merchant">💰 Merchant</MenuItem>
                <MenuItem value="scholar">📚 Scholar</MenuItem>
                <MenuItem value="trickster">🎭 Trickster</MenuItem>
                <MenuItem value="guardian">🛡️ Guardian</MenuItem>
                <MenuItem value="balanced">⚖️ Balanced</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Backstory"
              value={editingNPC.backstory}
              onChange={(e) => setEditingNPC({ ...editingNPC, backstory: e.target.value })}
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Dialogue Style</InputLabel>
              <Select
                value={editingNPC.dialogueStyle}
                onChange={(e) => setEditingNPC({ ...editingNPC, dialogueStyle: e.target.value as any })}
              >
                <MenuItem value="formal">🎩 Formal</MenuItem>
                <MenuItem value="casual">😎 Casual</MenuItem>
                <MenuItem value="mysterious">🔮 Mysterious</MenuItem>
                <MenuItem value="aggressive">😠 Aggressive</MenuItem>
                <MenuItem value="friendly">😊 Friendly</MenuItem>
                <MenuItem value="neutral">😐 Neutral</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>Quirks</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                size="small"
                placeholder="Add a quirk..."
                value={newQuirk}
                onChange={(e) => setNewQuirk(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddQuirk()}
              />
              <Button onClick={handleAddQuirk} variant="outlined" size="small">
                <AddIcon />
              </Button>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
              {editingNPC.quirks.map((quirk, index) => (
                <Chip
                  key={index}
                  label={quirk}
                  onDelete={() => handleRemoveQuirk(index)}
                  color="secondary"
                  variant="outlined"
                />
              ))}
            </Box>

            <Typography variant="h6" gutterBottom>Capabilities</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                size="small"
                placeholder="Add a capability..."
                value={newCapability}
                onChange={(e) => setNewCapability(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCapability()}
              />
              <Button onClick={handleAddCapability} variant="outlined" size="small">
                <AddIcon />
              </Button>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {editingNPC.capabilities.map((capability, index) => (
                <Chip
                  key={index}
                  label={capability}
                  onDelete={() => handleRemoveCapability(index)}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
          </Grid>
        </Grid>
      )}

      {currentTab === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Personality Traits (0-100 scale)
          </Typography>
          <Grid container spacing={3}>
            {personalityTraits.map((trait) => (
              <Grid item xs={12} md={6} key={trait.key}>
                <Box sx={{ px: 2 }}>
                  <Typography gutterBottom>
                    {trait.label}: {editingNPC.personality[trait.key as keyof typeof editingNPC.personality]}
                  </Typography>
                  <Slider
                    value={editingNPC.personality[trait.key as keyof typeof editingNPC.personality]}
                    onChange={(_, value) => handlePersonalityChange(trait.key, value as number)}
                    min={0}
                    max={100}
                    step={5}
                    marks={[
                      { value: 0, label: 'Low' },
                      { value: 50, label: 'Medium' },
                      { value: 100, label: 'High' }
                    ]}
                    sx={{ color: trait.color }}
                  />
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {currentTab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Behavior Rules</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddBehaviorRule}
            >
              Add Rule
            </Button>
          </Box>

          <Grid container spacing={2}>
            {editingNPC.behaviorRules.map((rule) => (
              <Grid item xs={12} key={rule.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="subtitle1">Rule #{rule.priority}</Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveBehaviorRule(rule.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={5}>
                        <TextField
                          fullWidth
                          label="Condition"
                          value={rule.condition}
                          onChange={(e) => handleUpdateBehaviorRule(rule.id, { condition: e.target.value })}
                          placeholder="When player approaches..."
                        />
                      </Grid>
                      <Grid item xs={12} md={5}>
                        <TextField
                          fullWidth
                          label="Action"
                          value={rule.action}
                          onChange={(e) => handleUpdateBehaviorRule(rule.id, { action: e.target.value })}
                          placeholder="Greet player..."
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Priority"
                          value={rule.priority}
                          onChange={(e) => handleUpdateBehaviorRule(rule.id, { priority: parseInt(e.target.value) || 1 })}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {currentTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              multiline
              rows={6}
              label="Appearance Description"
              value={editingNPC.appearance.description}
              onChange={(e) => setEditingNPC({
                ...editingNPC,
                appearance: { ...editingNPC.appearance, description: e.target.value }
              })}
              placeholder="Describe how this NPC looks..."
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Avatar URL"
              value={editingNPC.appearance.avatar}
              onChange={(e) => setEditingNPC({
                ...editingNPC,
                appearance: { ...editingNPC.appearance, avatar: e.target.value }
              })}
              placeholder="https://example.com/avatar.png"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                minHeight: 300,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              {editingNPC.appearance.avatar ? (
                <img
                  src={editingNPC.appearance.avatar}
                  alt="NPC Avatar"
                  style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              ) : (
                <>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Avatar Preview
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Add an avatar URL to see preview
                  </Typography>
                </>
              )}
            </Box>
          </Grid>
        </Grid>
      )}

      {currentTab === 4 && (
        <Box>
          <Typography variant="h6" gutterBottom>NPC Preview</Typography>
          
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                {editingNPC.name} ({editingNPC.archetype})
              </Typography>
              
              <Typography variant="body1" paragraph>
                {editingNPC.backstory || 'No backstory provided.'}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>Personality Profile</Typography>
              <Grid container spacing={2}>
                {personalityTraits.map((trait) => {
                  const value = editingNPC.personality[trait.key as keyof typeof editingNPC.personality]
                  return (
                    <Grid item xs={6} md={4} key={trait.key}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          {trait.label}
                        </Typography>
                        <Typography variant="h6" sx={{ color: trait.color }}>
                          {value}
                        </Typography>
                      </Box>
                    </Grid>
                  )
                })}
              </Grid>

              {editingNPC.quirks.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>Quirks</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {editingNPC.quirks.map((quirk, index) => (
                      <Chip key={index} label={quirk} color="secondary" />
                    ))}
                  </Box>
                </>
              )}

              {editingNPC.capabilities.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>Capabilities</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {editingNPC.capabilities.map((capability, index) => (
                      <Chip key={index} label={capability} color="primary" />
                    ))}
                  </Box>
                </>
              )}

              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Dialogue Style: {editingNPC.dialogueStyle} • 
                Behavior Rules: {editingNPC.behaviorRules.length} • 
                Created: {new Date(editingNPC.createdAt).toLocaleDateString()}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  )
}

export default NPCDesigner