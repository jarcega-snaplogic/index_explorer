import pineconeService from './services/pineconeService';

// Quick test script to see if this actually works
// Because trusting things to work first time is for optimists

async function testConnection() {
  console.log('🔍 Testing Pinecone connection...\n');

  try {
    // Test 1: List all indexes
    console.log('📋 Fetching indexes...');
    const indexes = await pineconeService.listIndexes();
    console.log('Indexes found:', indexes);

    // Test 2: Get stats for the first index (if any)
    if (indexes.indexes && indexes.indexes.length > 0) {
      const firstIndex = indexes.indexes[0];
      console.log(`\n📊 Getting stats for index: ${firstIndex.name}`);
      const stats = await pineconeService.getIndexStats(firstIndex.name);
      console.log('Index stats:', JSON.stringify(stats, null, 2));

      // Test 3: Try to query some documents
      console.log(`\n📄 Querying documents from ${firstIndex.name}...`);
      const documents = await pineconeService.queryDocuments(firstIndex.name, {
        topK: 10,
        includeMetadata: true
      });
      console.log(`Found ${documents.length} documents`);
      if (documents.length > 0) {
        console.log('Sample document:', JSON.stringify(documents[0], null, 2));
      }
    } else {
      console.log('\n⚠️  No indexes found. Create one first maybe?');
    }

    console.log('\n✅ Connection test successful! The API key works!');
    console.log('Jean-Claude saves the day again. You\'re welcome.');
  } catch (error) {
    console.error('\n❌ Connection test failed:', error);
    console.error('Check your API key. Or blame the network. Your choice.');
    process.exit(1);
  }
}

testConnection();