import React, { useState, useEffect } from 'react'
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
  Rating,
  Avatar,
  Divider,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Badge,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider
} from '@mui/material'
import {
  Search as SearchIcon,
  ShoppingCart as CartIcon,
  Star as StarIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  TrendingUp as TrendingIcon,
  Person as PersonIcon,
  Store as StoreIcon
} from '@mui/icons-material'

interface MarketplaceListing {
  id: string
  name: string
  archetype: string
  price: number
  rating: number
  downloads: number
  category: 'free' | 'premium' | 'exclusive'
  seller: string
  sellerName: string
  description: string
  tags: string[]
  isVerified: boolean
  createdAt: number
}

interface CreatorProfile {
  address: string
  name: string
  avatar: string
  totalSales: number
  rating: number
  npcCount: number
  isVerified: boolean
  specialties: string[]
}

interface Props {
  onPurchaseNPC: (listing: MarketplaceListing) => void
}

function NPCMarketplace({ onPurchaseNPC }: Props) {
  const [activeTab, setActiveTab] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedArchetype, setSelectedArchetype] = useState<string>('')
  const [priceRange, setPriceRange] = useState<number[]>([0, 100])
  const [sortBy, setSortBy] = useState('newest')
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null)
  const [selectedCreator, setSelectedCreator] = useState<CreatorProfile | null>(null)

  // Mock marketplace data
  const [listings] = useState<MarketplaceListing[]>([
    {
      id: 'npc_001',
      name: 'Elite Guardian',
      archetype: 'warrior',
      price: 5.0,
      rating: 4.8,
      downloads: 156,
      category: 'premium',
      seller: '0x742d35Cc6634C0532925a3b8D4B9C05e5b8E4C7d',
      sellerName: 'WarriorCraft Studios',
      description: 'A battle-hardened warrior with advanced combat AI and protective instincts.',
      tags: ['combat', 'protection', 'leadership', 'pvp'],
      isVerified: true,
      createdAt: Date.now() - 86400000
    },
    {
      id: 'npc_002',
      name: 'Wise Merchant',
      archetype: 'merchant',
      price: 2.5,
      rating: 4.6,
      downloads: 89,
      category: 'premium',
      seller: '0x8f3e2b1c4d5a6e7f8g9h0i1j2k3l4m5n6o7p8q9r',
      sellerName: 'TradeWind Creators',
      description: 'Expert trader with dynamic pricing algorithms and negotiation skills.',
      tags: ['trading', 'economics', 'negotiation', 'pve'],
      isVerified: true,
      createdAt: Date.now() - 172800000
    },
    {
      id: 'npc_003',
      name: 'Cunning Trickster',
      archetype: 'trickster',
      price: 0,
      rating: 4.2,
      downloads: 234,
      category: 'free',
      seller: '0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t',
      sellerName: 'Community Builder',
      description: 'Mischievous NPC with unpredictable behavior patterns and puzzle-solving abilities.',
      tags: ['puzzles', 'humor', 'unpredictable', 'community'],
      isVerified: false,
      createdAt: Date.now() - 259200000
    },
    {
      id: 'npc_004',
      name: 'Ancient Scholar',
      archetype: 'scholar',
      price: 7.5,
      rating: 4.9,
      downloads: 67,
      category: 'exclusive',
      seller: '0x742d35Cc6634C0532925a3b8D4B9C05e5b8E4C7d',
      sellerName: 'WarriorCraft Studios',
      description: 'Legendary scholar with vast knowledge base and quest generation capabilities.',
      tags: ['knowledge', 'quests', 'lore', 'rare'],
      isVerified: true,
      createdAt: Date.now() - 345600000
    }
  ])

  const [creators] = useState<CreatorProfile[]>([
    {
      address: '0x742d35Cc6634C0532925a3b8D4B9C05e5b8E4C7d',
      name: 'WarriorCraft Studios',
      avatar: '',
      totalSales: 223,
      rating: 4.85,
      npcCount: 12,
      isVerified: true,
      specialties: ['warrior', 'scholar', 'combat']
    },
    {
      address: '0x8f3e2b1c4d5a6e7f8g9h0i1j2k3l4m5n6o7p8q9r',
      name: 'TradeWind Creators',
      avatar: '',
      totalSales: 156,
      rating: 4.7,
      npcCount: 8,
      isVerified: true,
      specialties: ['merchant', 'economics']
    }
  ])

  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         listing.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         listing.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = !selectedCategory || listing.category === selectedCategory
    const matchesArchetype = !selectedArchetype || listing.archetype === selectedArchetype
    const matchesPrice = listing.price >= priceRange[0] && listing.price <= priceRange[1]
    
    return matchesSearch && matchesCategory && matchesArchetype && matchesPrice
  })

  const sortedListings = [...filteredListings].sort((a, b) => {
    switch (sortBy) {
      case 'price_low':
        return a.price - b.price
      case 'price_high':
        return b.price - a.price
      case 'rating':
        return b.rating - a.rating
      case 'downloads':
        return b.downloads - a.downloads
      case 'newest':
      default:
        return b.createdAt - a.createdAt
    }
  })

  const trendingNPCs = listings
    .sort((a, b) => (b.downloads * b.rating) - (a.downloads * a.rating))
    .slice(0, 5)

  const categories = ['free', 'premium', 'exclusive']
  const archetypes = ['warrior', 'merchant', 'scholar', 'trickster', 'guardian', 'balanced']

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'free': return 'success'
      case 'premium': return 'primary'
      case 'exclusive': return 'secondary'
      default: return 'default'
    }
  }

  const renderMarketplace = () => (
    <Box>
      {/* Search and Filters */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
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
            />
          </Grid>
          
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                label="Category"
              >
                <MenuItem value="">All</MenuItem>
                {categories.map(cat => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Archetype</InputLabel>
              <Select
                value={selectedArchetype}
                onChange={(e) => setSelectedArchetype(e.target.value)}
                label="Archetype"
              >
                <MenuItem value="">All</MenuItem>
                {archetypes.map(arch => (
                  <MenuItem key={arch} value={arch}>{arch}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                label="Sort By"
              >
                <MenuItem value="newest">Newest</MenuItem>
                <MenuItem value="price_low">Price: Low to High</MenuItem>
                <MenuItem value="price_high">Price: High to Low</MenuItem>
                <MenuItem value="rating">Highest Rated</MenuItem>
                <MenuItem value="downloads">Most Downloaded</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={6} md={2}>
            <Typography variant="caption" color="text.secondary">
              Price Range (STT)
            </Typography>
            <Slider
              value={priceRange}
              onChange={(_, newValue) => setPriceRange(newValue as number[])}
              valueLabelDisplay="auto"
              min={0}
              max={100}
              size="small"
            />
          </Grid>
        </Grid>
      </Box>

      {/* Results */}
      <Typography variant="h6" gutterBottom>
        🛒 Marketplace ({sortedListings.length} NPCs)
      </Typography>

      {sortedListings.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No NPCs match your search criteria.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {sortedListings.map(listing => (
            <Grid item xs={12} sm={6} md={4} key={listing.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" component="div" noWrap>
                      {listing.name}
                    </Typography>
                    <Chip
                      label={listing.category}
                      size="small"
                      color={getCategoryColor(listing.category) as any}
                      variant="outlined"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {listing.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Rating value={listing.rating} precision={0.1} size="small" readOnly />
                    <Typography variant="caption" sx={{ ml: 1 }}>
                      ({listing.downloads})
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                    <Chip label={listing.archetype} size="small" color="primary" variant="outlined" />
                    {listing.tags.slice(0, 2).map(tag => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" color="primary">
                      {listing.price === 0 ? 'FREE' : `${listing.price} STT`}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {listing.isVerified && (
                        <Chip label="✓" size="small" color="success" sx={{ mr: 1 }} />
                      )}
                      <Typography variant="caption" color="text.secondary">
                        by {listing.sellerName}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
                
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => setSelectedListing(listing)}
                  >
                    Preview
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<CartIcon />}
                    onClick={() => onPurchaseNPC(listing)}
                  >
                    {listing.price === 0 ? 'Download' : 'Buy'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  )

  const renderTrending = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        🔥 Trending NPCs
      </Typography>
      
      <List>
        {trendingNPCs.map((npc, index) => (
          <React.Fragment key={npc.id}>
            <ListItem>
              <ListItemAvatar>
                <Badge badgeContent={index + 1} color="primary">
                  <Avatar>
                    <TrendingIcon />
                  </Avatar>
                </Badge>
              </ListItemAvatar>
              <ListItemText
                primary={npc.name}
                secondary={
                  <Box>
                    <Typography variant="body2" component="span">
                      {npc.archetype} • {npc.price === 0 ? 'FREE' : `${npc.price} STT`}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      <Rating value={npc.rating} precision={0.1} size="small" readOnly />
                      <Typography variant="caption" sx={{ ml: 1 }}>
                        {npc.downloads} downloads
                      </Typography>
                    </Box>
                  </Box>
                }
              />
              <Button
                size="small"
                onClick={() => setSelectedListing(npc)}
              >
                View
              </Button>
            </ListItem>
            {index < trendingNPCs.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    </Box>
  )

  const renderCreators = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        👥 Top Creators
      </Typography>
      
      <Grid container spacing={2}>
        {creators.map(creator => (
          <Grid item xs={12} sm={6} key={creator.address}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ mr: 2 }}>
                    <PersonIcon />
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6">
                      {creator.name}
                      {creator.isVerified && (
                        <Chip label="✓" size="small" color="success" sx={{ ml: 1 }} />
                      )}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {creator.address.slice(0, 6)}...{creator.address.slice(-4)}
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">NPCs Created:</Typography>
                  <Typography variant="body2" fontWeight="bold">{creator.npcCount}</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Total Sales:</Typography>
                  <Typography variant="body2" fontWeight="bold">{creator.totalSales}</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2">Rating:</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Rating value={creator.rating} precision={0.1} size="small" readOnly />
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      {creator.rating.toFixed(1)}
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {creator.specialties.map(specialty => (
                    <Chip key={specialty} label={specialty} size="small" variant="outlined" />
                  ))}
                </Box>
              </CardContent>
              
              <CardActions>
                <Button
                  size="small"
                  startIcon={<StoreIcon />}
                  onClick={() => setSelectedCreator(creator)}
                >
                  View Store
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        🛒 NPC Marketplace
      </Typography>
      
      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Browse" />
        <Tab label="Trending" />
        <Tab label="Creators" />
      </Tabs>
      
      {activeTab === 0 && renderMarketplace()}
      {activeTab === 1 && renderTrending()}
      {activeTab === 2 && renderCreators()}

      {/* NPC Preview Dialog */}
      <Dialog
        open={!!selectedListing}
        onClose={() => setSelectedListing(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedListing && (
          <>
            <DialogTitle>
              {selectedListing.name}
              <Chip
                label={selectedListing.category}
                size="small"
                color={getCategoryColor(selectedListing.category) as any}
                sx={{ ml: 2 }}
              />
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" paragraph>
                {selectedListing.description}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Rating value={selectedListing.rating} precision={0.1} readOnly />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  {selectedListing.rating.toFixed(1)} ({selectedListing.downloads} downloads)
                </Typography>
              </Box>
              
              <Typography variant="h6" gutterBottom>
                Tags & Capabilities
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                <Chip label={selectedListing.archetype} color="primary" />
                {selectedListing.tags.map(tag => (
                  <Chip key={tag} label={tag} variant="outlined" />
                ))}
              </Box>
              
              <Typography variant="h6" gutterBottom>
                Seller Information
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ mr: 2 }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="body1">
                    {selectedListing.sellerName}
                    {selectedListing.isVerified && (
                      <Chip label="✓ Verified" size="small" color="success" sx={{ ml: 1 }} />
                    )}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedListing.seller.slice(0, 6)}...{selectedListing.seller.slice(-4)}
                  </Typography>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedListing(null)}>Close</Button>
              <Button
                variant="contained"
                startIcon={<CartIcon />}
                onClick={() => {
                  onPurchaseNPC(selectedListing)
                  setSelectedListing(null)
                }}
              >
                {selectedListing.price === 0 ? 'Download Free' : `Buy for ${selectedListing.price} STT`}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  )
}

export default NPCMarketplace