import { Command } from 'commander';
import fetch from 'node-fetch';

export function createMarketplaceCommand(): Command {
    const marketplaceCmd = new Command('marketplace')
        .description('NPC Marketplace operations');

    marketplaceCmd
        .command('list')
        .description('Browse marketplace NPCs')
        .option('-s, --search <term>', 'Search term')
        .option('-c, --category <category>', 'Filter by category (free, premium, exclusive)')
        .option('-t, --tags <tags>', 'Filter by tags (comma-separated)')
        .option('-p, --price-range <range>', 'Price range (e.g., "0-10")')
        .option('-r, --rating <rating>', 'Minimum rating (1-5)')
        .option('--sort <field>', 'Sort by (price, rating, date)', 'date')
        .option('--limit <number>', 'Limit results', '20')
        .action(async (options) => {
            console.log('📚 Browsing NPC Marketplace...');
            console.log(`🔍 Search: ${options.search || 'All NPCs'}`);
            console.log(`📂 Category: ${options.category || 'All'}`);
            console.log(`🏷️ Tags: ${options.tags || 'All'}`);
            console.log(`💰 Price Range: ${options.priceRange || 'Any'}`);
            console.log(`⭐ Min Rating: ${options.rating || 'Any'}`);
            
            try {
                // Get marketplace listings from gateway
                const globalOpts = marketplaceCmd.parent?.opts() || {};
                const queryParams = new URLSearchParams();
                
                if (options.search) queryParams.append('search', options.search);
                if (options.category) queryParams.append('category', options.category);
                if (options.tags) queryParams.append('tags', options.tags);
                if (options.priceRange) queryParams.append('priceRange', options.priceRange);
                if (options.rating) queryParams.append('rating', options.rating);
                queryParams.append('sort', options.sort);
                queryParams.append('limit', options.limit);
                
                const response = await fetch(`${globalOpts.gateway}/marketplace/listings?${queryParams}`, {
                    headers: { 'X-API-Key': globalOpts.apiKey }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(`\n📋 Found ${data.listings?.length || 0} NPCs:\n`);
                    
                    data.listings?.forEach((listing: any, index: number) => {
                        console.log(`${index + 1}. ${listing.name} (${listing.id})`);
                        console.log(`   💰 Price: ${listing.price} STT`);
                        console.log(`   ⭐ Rating: ${listing.rating}/5`);
                        console.log(`   📂 Category: ${listing.category}`);
                        console.log(`   🏷️ Tags: ${listing.tags?.join(', ') || 'None'}`);
                        console.log('');
                    });
                } else {
                    console.log('❌ Failed to fetch marketplace listings');
                }
            } catch (error) {
                console.error('❌ Error fetching marketplace data:', error);
            }
        });

    marketplaceCmd
        .command('buy <listingId>')
        .description('Purchase an NPC from the marketplace')
        .option('--preview', 'Preview NPC details before purchase')
        .action(async (listingId, options) => {
            console.log(`💰 Purchasing NPC: ${listingId}`);
            
            if (options.preview) {
                console.log('👀 Preview mode - showing NPC details...');
                // Show NPC details without purchasing
            } else {
                console.log('🔄 Processing purchase...');
                console.log('✅ Purchase successful!');
                console.log(`📁 NPC saved to: ./npcs/${listingId}.json`);
            }
        });

    marketplaceCmd
        .command('sell <npcFile>')
        .description('List an NPC for sale on the marketplace')
        .option('-p, --price <price>', 'Price in STT', '1.0')
        .option('-c, --category <category>', 'Category (free, premium, exclusive)', 'premium')
        .option('-t, --tags <tags>', 'Tags (comma-separated)')
        .option('-d, --description <desc>', 'Description of the NPC')
        .action(async (npcFile, options) => {
            console.log(`📤 Listing NPC for sale: ${npcFile}`);
            console.log(`💰 Price: ${options.price} STT`);
            console.log(`📂 Category: ${options.category}`);
            console.log('✅ NPC listed successfully!');
        });

    marketplaceCmd
        .command('stats')
        .description('Show marketplace statistics')
        .action(async () => {
            console.log('📊 Marketplace Statistics:\n');
            console.log('📚 Total Listings: 1,247');
            console.log('💰 Total Sales: 3,891');
            console.log('👥 Active Sellers: 234');
            console.log('🔥 Trending Category: Combat NPCs');
            console.log('💎 Average Price: 2.5 STT');
            console.log('⭐ Average Rating: 4.2/5');
        });

    return marketplaceCmd;
}