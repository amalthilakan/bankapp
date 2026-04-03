import { MongoClient } from 'mongodb';

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let mongoClientPromise: Promise<MongoClient> | undefined;

function createClientPromise(uri: string) {
  return new MongoClient(uri).connect();
}

async function getMongoClient() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not set. Add it to your .env.local file before calling the API.');
  }

  if (process.env.NODE_ENV === 'development') {
    global._mongoClientPromise ??= createClientPromise(uri);
    return global._mongoClientPromise;
  }

  mongoClientPromise ??= createClientPromise(uri);
  return mongoClientPromise;
}

export async function getDb() {
  const client = await getMongoClient();
  return client.db(process.env.MONGODB_DB || 'bankapp');
}
