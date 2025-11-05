import React, { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material'
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon
} from '@mui/icons-material'
import { NPCTemplate } from '../types'

interface Props {
  npcs: NPCTemplate[]
  onLoadNPC: (npc: NPCTemplate) => void
  onExportNPC: (npc: NPCTemplate) => void
}

function NPCLibrary({ npcs, onLoadNPC, onExportNPC }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedArchetype, setSelectedArchetype] = useState<string>('')
  const [previewNPC, setPreviewNPC] = useState<NPCTemplate | null>(null)

  const filteredNPCs = npcs.filter(npc => {
    const matchesSearch = npc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         npc.backstory.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesArchetype = !selectedArchetype || npc.archetype === selectedArchetype
    return matchesSearch && matchesArchetype
  })

  const archetypes = ['warrior', 'merchant', 'scholar', 'trickster', 'guardian', 'balanced']
  const archetypeEmojis = {
    warrior: '⚔️',
    merchant: '💰',
    scholar: '📚',
    trickster: '🎭',
    guardian: '🛡️',
    balanced: '⚖️'
  }

  const getPersonalityHighlights = (personality: NPCTemplate['personality']) => {
    return Object.entries(personality)
      .filter(([_, value]) => value > 70)
      .map(([trait, _]) => trait)
      .slice(0, 3)
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        📚 NPC Library ({npcs.length})
      </Typography>

      {/* Search and Filters */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search NPCs..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          )
        }}
        sx={{ mb: 2 }}
      />

      {/* Archetype Filter */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
        <Chip
          label="All"
          onClick={() => setSelectedArchetype('')}
          color={selectedArchetype === '' ? 'primary' : 'default'}
          variant={selectedArchetype === '' ? 'filled' : 'outlined'}
          size="small"
        />
        {archetypes.map(archetype => (
          <Chip
            key={archetype}
            label={`${archetypeEmojis[archetype as keyof typeof archetypeEmojis]} ${archetype}`}
            onClick={() => setSelectedArchetype(archetype)}
            color={selectedArchetype === archetype ? 'primary' : 'default'}
            variant={selectedArchetype === archetype ? 'filled' : 'outlined'}
            size="small"
          />
        ))}
      </Box>

      {/* NPC Cards */}
      {filteredNPCs.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            {npcs.length === 0 ? 'No NPCs created yet.' : 'No NPCs match your search.'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {npcs.length === 0 ? 'Create your first NPC to get started!' : 'Try adjusting your search terms.'}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredNPCs.map(npc => {
            const personalityHighlights = getPersonalityHighlights(npc.personality)
            
            return (
              <Card key={npc.id} variant="outlined" sx={{ transition: 'all 0.2s', '&:hover': { boxShadow: 2 } }}>
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h6" component="div">
                      {archetypeEmojis[npc.archetype as keyof typeof archetypeEmojis]} {npc.name}
                    </Typography>
                    <Chip
                      label={npc.archetype}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {npc.backstory ? 
                      (npc.backstory.length > 100 ? `${npc.backstory.substring(0, 100)}...` : npc.backstory) :
                      'No backstory provided'
                    }
                  </Typography>

                  {personalityHighlights.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                      {personalityHighlights.map(trait => (
                        <Chip
                          key={trait}
                          label={trait}
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Updated: {new Date(npc.updatedAt).toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {npc.capabilities.length} capabilities • {npc.behaviorRules.length} rules
                    </Typography>
                  </Box>
                </CardContent>
                
                <CardActions sx={{ pt: 0, justifyContent: 'space-between' }}>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => setPreviewNPC(npc)}
                      title="Preview"
                    >
                      <ViewIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => onExportNPC(npc)}
                      title="Export"
                    >
                      <DownloadIcon />
                    </IconButton>
                  </Box>
                  
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => onLoadNPC(npc)}
                  >
                    Edit
                  </Button>
                </CardActions>
              </Card>
            )
          })}
        </Box>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={!!previewNPC}
        onClose={() => setPreviewNPC(null)}
        maxWidth="md"
        fullWidth
      >
        {previewNPC && (
          <>
            <DialogTitle>
              {archetypeEmojis[previewNPC.archetype as keyof typeof archetypeEmojis]} {previewNPC.name}
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" paragraph>
                <strong>Archetype:</strong> {previewNPC.archetype}
              </Typography>
              
              {previewNPC.backstory && (
                <Typography variant="body1" paragraph>
                  <strong>Backstory:</strong> {previewNPC.backstory}
                </Typography>
              )}

              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Personality Traits
              </Typography>
              <Grid container spacing={1} sx={{ mb: 2 }}>
                {Object.entries(previewNPC.personality).map(([trait, value]) => (
                  <Grid item xs={6} sm={4} key={trait}>
                    <Box sx={{ textAlign: 'center', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        {trait}
                      </Typography>
                      <Typography variant="h6" color={value > 70 ? 'primary.main' : value < 30 ? 'error.main' : 'text.primary'}>
                        {value}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              {previewNPC.quirks.length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Quirks
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {previewNPC.quirks.map((quirk, index) => (
                      <Chip key={index} label={quirk} color="secondary" size="small" />
                    ))}
                  </Box>
                </>
              )}

              {previewNPC.capabilities.length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Capabilities
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {previewNPC.capabilities.map((capability, index) => (
                      <Chip key={index} label={capability} color="primary" size="small" />
                    ))}
                  </Box>
                </>
              )}

              {previewNPC.behaviorRules.length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Behavior Rules ({previewNPC.behaviorRules.length})
                  </Typography>
                  <List dense>
                    {previewNPC.behaviorRules.slice(0, 5).map((rule, index) => (
                      <React.Fragment key={rule.id}>
                        <ListItem>
                          <ListItemText
                            primary={`${rule.condition} → ${rule.action}`}
                            secondary={`Priority: ${rule.priority}`}
                          />
                        </ListItem>
                        {index < Math.min(4, previewNPC.behaviorRules.length - 1) && <Divider />}
                      </React.Fragment>
                    ))}
                    {previewNPC.behaviorRules.length > 5 && (
                      <ListItem>
                        <ListItemText
                          primary={`... and ${previewNPC.behaviorRules.length - 5} more rules`}
                          sx={{ fontStyle: 'italic', color: 'text.secondary' }}
                        />
                      </ListItem>
                    )}
                  </List>
                </>
              )}

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                <strong>Dialogue Style:</strong> {previewNPC.dialogueStyle}<br />
                <strong>Created:</strong> {new Date(previewNPC.createdAt).toLocaleString()}<br />
                <strong>Last Updated:</strong> {new Date(previewNPC.updatedAt).toLocaleString()}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPreviewNPC(null)}>Close</Button>
              <Button
                onClick={() => {
                  onExportNPC(previewNPC)
                  setPreviewNPC(null)
                }}
                startIcon={<DownloadIcon />}
              >
                Export
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  onLoadNPC(previewNPC)
                  setPreviewNPC(null)
                }}
                startIcon={<EditIcon />}
              >
                Edit
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  )
}

export default NPCLibrary