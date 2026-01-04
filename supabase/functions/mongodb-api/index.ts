import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { MongoClient, ObjectId, Database } from "https://deno.land/x/mongo@v0.32.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  action: string;
  collection: string;
  data?: any;
  query?: any;
  update?: any;
  options?: any;
}

let cachedDb: Database | null = null;

async function getDatabase(): Promise<Database> {
  if (cachedDb) {
    return cachedDb;
  }
  
  const uri = Deno.env.get("MONGODB_URI");
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }
  
  const client = new MongoClient();
  await client.connect(uri);
  console.log("Connected to MongoDB");
  
  cachedDb = client.database("quizapp");
  return cachedDb;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, collection, data, query, update, options }: RequestBody = await req.json();
    
    const db = await getDatabase();
    const col = db.collection(collection);
    
    let result: any;

    // Convert string _id to ObjectId in queries
    const processQuery = (q: any) => {
      if (!q) return q;
      if (q._id && typeof q._id === 'string') {
        q._id = new ObjectId(q._id);
      }
      return q;
    };

    switch (action) {
      case "find":
        const findOptions: any = {};
        if (options?.sort) findOptions.sort = options.sort;
        if (options?.limit) findOptions.limit = options.limit;
        result = await col.find(processQuery(query) || {}, findOptions).toArray();
        break;
        
      case "findOne":
        result = await col.findOne(processQuery(query) || {});
        break;
        
      case "insertOne":
        result = await col.insertOne(data);
        break;
        
      case "insertMany":
        result = await col.insertMany(data);
        break;
        
      case "updateOne":
        result = await col.updateOne(processQuery(query), update);
        break;
        
      case "updateMany":
        result = await col.updateMany(processQuery(query), update);
        break;
        
      case "deleteOne":
        result = await col.deleteOne(processQuery(query));
        break;
        
      case "deleteMany":
        result = await col.deleteMany(processQuery(query));
        break;
        
      case "aggregate":
        result = await col.aggregate(data).toArray();
        break;
        
      case "count":
        result = await col.countDocuments(processQuery(query) || {});
        break;

      // Auth: Register
      case "register": {
        const usersCol = db.collection("users");
        const existingUser = await usersCol.findOne({ email: data.email });
        if (existingUser) {
          return new Response(
            JSON.stringify({ error: "User already exists" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        
        // Simple password hashing
        const hashedPassword = btoa(data.password + "salt_quiz_app_2024");
        
        const newUserId = new ObjectId();
        const newUser = {
          _id: newUserId,
          email: data.email,
          password: hashedPassword,
          name: data.name,
          role: data.email === "akilannandhakumar@gmail.com" ? "admin" : "student",
          xp: 0,
          current_streak: 1,
          longest_streak: 1,
          daily_xp: 0,
          daily_xp_goal: 50,
          last_login_date: new Date().toISOString().split('T')[0],
          last_xp_reset_date: new Date().toISOString().split('T')[0],
          last_quiz_date: null,
          created_at: new Date().toISOString()
        };
        
        await usersCol.insertOne(newUser);
        
        const { password: _, ...userWithoutPassword } = newUser;
        result = { user: { ...userWithoutPassword, id: newUserId.toString() } };
        break;
      }
        
      // Auth: Login
      case "login": {
        const usersCol = db.collection("users");
        const user = await usersCol.findOne({ email: data.email });
        if (!user) {
          return new Response(
            JSON.stringify({ error: "Invalid email or password" }),
            { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        
        const passwordHash = btoa(data.password + "salt_quiz_app_2024");
        if (user.password !== passwordHash) {
          return new Response(
            JSON.stringify({ error: "Invalid email or password" }),
            { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        
        // Update last login
        await usersCol.updateOne(
          { _id: user._id },
          { $set: { last_login_date: new Date().toISOString().split('T')[0] } }
        );
        
        // Simple token
        const token = btoa(JSON.stringify({ 
          userId: user._id.toString(), 
          email: user.email, 
          exp: Date.now() + 7 * 24 * 60 * 60 * 1000 
        }));
        
        const { password: __, ...loginUserWithoutPassword } = user;
        result = { 
          user: { ...loginUserWithoutPassword, id: user._id.toString() },
          token 
        };
        break;
      }
        
      // Auth: Verify Token
      case "verifyToken": {
        try {
          const decoded = JSON.parse(atob(data.token));
          if (decoded.exp < Date.now()) {
            return new Response(
              JSON.stringify({ error: "Token expired" }),
              { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
          }
          
          const usersCol = db.collection("users");
          const tokenUser = await usersCol.findOne({ _id: new ObjectId(decoded.userId) });
          if (!tokenUser) {
            return new Response(
              JSON.stringify({ error: "User not found" }),
              { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
          }
          
          const { password: ___, ...verifiedUser } = tokenUser;
          result = { user: { ...verifiedUser, id: tokenUser._id.toString() } };
        } catch {
          return new Response(
            JSON.stringify({ error: "Invalid token" }),
            { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }

    return new Response(
      JSON.stringify({ data: result }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("MongoDB API Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
