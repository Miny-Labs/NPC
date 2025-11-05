import React, { useState } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Grid,
  Paper,
  Box,
  Fab,
  Snackbar,
  Alert,
  Tabs,
  Tab
} from '@mui/material'
import { Add as AddIcon, Save as SaveIcon, Store as StoreIcon } from '@mui/icons-material'
import NPCDesigner from './components/NPCDesigner'
import NPCLibrary from './components/NPCLibrary'
import NPCMarketplace from './components/NPCMarketplace'
import { NPCTemplate } from './types'

function App() {
  const [currentNPC, setCurrentNPC] = useState<NPCTemplate | null>(null)
  const [savedNPCs, setSavedNPCs] = useState<NPCTemplate[]>([])
  const [activeTab, setActiveTab] = useState(0) // 0: Library, 1: Designer, 2: Marketplace
  const [notification, setNotification] = useState<{ message: string; severity: 'success' | 'error' } | null>(null)

  const handleCreateNew = () => {
    const newNPC: NPCTemplate = {
      id: `npc_${Date.now()}`,
      name: 'New NPC',
      archetype: 'balanced',
      personality: {
        friendly: 50,
        aggressive: 50,
        greedy: 50,
        cautious: 50,
        loyal: 50,
        cunning: 50,
        honest: 50,
        mysterious: 50,
        cheerful: 50
      },
      backstory: '',
      quirks: [],
      appearance: {
        description: '',
        avatar: ''
      },
      capabilities: [],
      dialogueStyle: 'neutral',
      behaviorRules: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    
    setCurrentNPC(newNPC)
    setActiveTab(1) // Switch to designer tab
  }

  const handleSaveNPC = async (npc: NPCTemplate) => {
    try {
      // In a real app, this would save to a backend
      const updatedNPC = { ...npc, updatedAt: Date.now() }
      
      const existingIndex = savedNPCs.findIndex(saved => saved.id === npc.id)
      if (existingIndex >= 0) {
        const newSavedNPCs = [...savedNPCs]
        newSavedNPCs[existingIndex] = updatedNPC
        setSavedNPCs(newSavedNPCs)
      } else {
        setSavedNPCs([...savedNPCs, updatedNPC])
      }
      
      setCurrentNPC(updatedNPC)
      setNotification({ message: 'NPC saved successfully!', severity: 'success' })
    } catch (error) {
      setNotification({ message: 'Failed to save NPC', severity: 'error' })
    }
  }

  const handleLoadNPC = (npc: NPCTemplate) => {
    setCurrentNPC(npc)
    setActiveTab(1) // Switch to designer tab
  }

  const handlePurchaseNPC = async (listing: any) => {
    try {
      // Simulate purchase and convert to NPCTemplate
      const purchasedNPC: NPCTemplate = {
        id: `purchased_${Date.now()}`,
        name: `${listing.name} (Purchased)`,
        archetype: listing.archetype,
        personality: {
          friendly: 50,
          aggressive: 50,
          greedy: 50,
          cautious: 50,
          loyal: 50,
          cunning: 50,
          honest: 50,
          mysterious: 50,
          cheerful: 50
        },
        backstory: listing.description,
        quirks: [],
        appearance: {
          description: '',
          avatar: ''
        },
        capabilities: listing.tags,
        dialogueStyle: 'neutral',
        behaviorRules: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      
      setSavedNPCs([...savedNPCs, purchasedNPC])
      setNotification({ 
        message: `Successfully ${listing.price === 0 ? 'downloaded' : 'purchased'} "${listing.name}"!`, 
        severity: 'success' 
      })
    } catch (error) {
      setNotification({ 
        message: `Failed to ${listing.price === 0 ? 'download' : 'purchase'} NPC`, 
        severity: 'error' 
      })
    }
  }

  const handleExportNPC = async (npc: NPCTemplate) => {
    try {
      // Export to NPC Engine format
      const exportData = {
        npc,
        format: 'npc-engine-v1',
        exportedAt: Date.now()
      }
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${npc.name.replace(/\s+/g, '_')}_npc.json`
      a.click()
      URL.revokeObjectURL(url)
      
      setNotification({ message: 'NPC exported successfully!', severity: 'success' })
    } catch (error) {
      setNotification({ message: 'Failed to export NPC', severity: 'error' })
    }
  }

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            🎭 NPC Builder - Visual Designer
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Create autonomous NPCs for Somnia games
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
        {/* Navigation Tabs */}
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
          <Tab label="📚 My NPCs" />
          <Tab label="🎨 Designer" />
          <Tab label="🛒 Marketplace" />
        </Tabs>

        <Paper sx={{ p: 3, minHeight: 'calc(100vh - 250px)' }}>
          {/* Library Tab */}
          {activeTab === 0 && (
            <Box>
              {savedNPCs.length === 0 ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '400px',
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="h4" gutterBottom color="text.secondary">
                    Welcome to NPC Builder
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 4, maxWidth: 600 }}>
                    Create intelligent, autonomous NPCs with personalities, memories, and behaviors. 
                    Design once, deploy anywhere on Somnia blockchain games.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Fab
                      variant="extended"
                      color="primary"
                      onClick={handleCreateNew}
                      size="large"
                    >
                      <AddIcon sx={{ mr: 1 }} />
                      Create New NPC
                    </Fab>
                    <Fab
                      variant="extended"
                      color="secondary"
                      onClick={() => setActiveTab(2)}
                      size="large"
                    >
                      <StoreIcon sx={{ mr: 1 }} />
                      Browse Marketplace
                    </Fab>
                  </Box>
                </Box>
              ) : (
                <NPCLibrary
                  npcs={savedNPCs}
                  onLoadNPC={handleLoadNPC}
                  onExportNPC={handleExportNPC}
                />
              )}
            </Box>
          )}

          {/* Designer Tab */}
          {activeTab === 1 && (
            <Box>
              {currentNPC ? (
                <NPCDesigner
                  npc={currentNPC}
                  onSave={handleSaveNPC}
                  onBack={() => setActiveTab(0)}
                />
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '400px',
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="h5" gutterBottom color="text.secondary">
                    No NPC Selected
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 3 }}>
                    Create a new NPC or load an existing one from your library.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Fab
                      variant="extended"
                      color="primary"
                      onClick={handleCreateNew}
                    >
                      <AddIcon sx={{ mr: 1 }} />
                      Create New NPC
                    </Fab>
                    <Fab
                      variant="extended"
                      onClick={() => setActiveTab(0)}
                    >
                      📚 Go to Library
                    </Fab>
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {/* Marketplace Tab */}
          {activeTab === 2 && (
            <NPCMarketplace onPurchaseNPC={handlePurchaseNPC} />
          )}
        </Paper>
      </Container>

      {/* Floating Action Button */}
      {activeTab !== 1 && (
        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={handleCreateNew}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Notifications */}
      <Snackbar
        open={!!notification}
        autoHideDuration={4000}
        onClose={() => setNotification(null)}
      >
        {notification && (
          <Alert severity={notification.severity} onClose={() => setNotification(null)}>
            {notification.message}
          </Alert>
        )}
      </Snackbar>
    </Box>
  )
}

export default App