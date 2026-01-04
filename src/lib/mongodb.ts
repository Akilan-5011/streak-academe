const MONGODB_API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mongodb-api`;

interface MongoDBResponse<T = any> {
  data?: T;
  error?: string;
}

async function callMongoDB<T = any>(body: {
  action: string;
  collection: string;
  data?: any;
  query?: any;
  update?: any;
  options?: any;
}): Promise<MongoDBResponse<T>> {
  try {
    const token = localStorage.getItem('auth_token');
    
    const response = await fetch(MONGODB_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify(body)
    });

    const result = await response.json();
    
    if (!response.ok) {
      return { error: result.error || 'Request failed' };
    }

    return { data: result.data };
  } catch (error: any) {
    console.error('MongoDB API call failed:', error);
    return { error: error.message || 'Network error' };
  }
}

// Database collections
export const mongodb = {
  // Generic operations
  find: <T = any>(collection: string, query?: any, options?: { sort?: any; limit?: number }) =>
    callMongoDB<T[]>({ action: 'find', collection, query, options }),
    
  findOne: <T = any>(collection: string, query: any) =>
    callMongoDB<T>({ action: 'findOne', collection, query }),
    
  insertOne: (collection: string, data: any) =>
    callMongoDB({ action: 'insertOne', collection, data }),
    
  insertMany: (collection: string, data: any[]) =>
    callMongoDB({ action: 'insertMany', collection, data }),
    
  updateOne: (collection: string, query: any, update: any) =>
    callMongoDB({ action: 'updateOne', collection, query, update }),
    
  updateMany: (collection: string, query: any, update: any) =>
    callMongoDB({ action: 'updateMany', collection, query, update }),
    
  deleteOne: (collection: string, query: any) =>
    callMongoDB({ action: 'deleteOne', collection, query }),
    
  deleteMany: (collection: string, query: any) =>
    callMongoDB({ action: 'deleteMany', collection, query }),
    
  aggregate: <T = any>(collection: string, pipeline: any[]) =>
    callMongoDB<T[]>({ action: 'aggregate', collection, data: pipeline }),
    
  count: (collection: string, query?: any) =>
    callMongoDB<number>({ action: 'count', collection, query }),

  // Auth operations
  register: (email: string, password: string, name: string) =>
    callMongoDB({ action: 'register', collection: 'users', data: { email, password, name } }),
    
  login: (email: string, password: string) =>
    callMongoDB({ action: 'login', collection: 'users', data: { email, password } }),
    
  verifyToken: (token: string) =>
    callMongoDB({ action: 'verifyToken', collection: 'users', data: { token } }),
};

export default mongodb;
