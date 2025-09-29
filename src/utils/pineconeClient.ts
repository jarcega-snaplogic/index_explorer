import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config();

// Singleton Pinecone client because we're not amateurs here
class PineconeClient {
  private static instance: Pinecone;

  private constructor() {}

  public static getInstance(): Pinecone {
    if (!PineconeClient.instance) {
      const apiKey = process.env.PINECONE_API_KEY;

      if (!apiKey) {
        throw new Error('PINECONE_API_KEY is not set. Did someone forget to read the docs again?');
      }

      PineconeClient.instance = new Pinecone({
        apiKey: apiKey
      });

      console.log('✅ Pinecone client initialized. You\'re welcome.');
    }

    return PineconeClient.instance;
  }
}

export default PineconeClient.getInstance();