const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = "mongodb+srv://Prathmesh:APPLE@cluster0.58qvd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
let client;

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    try {
      await client.connect();
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch (error) {
      console.error("MongoDB connection failed:", error);
      client = null;
    }
  }
  return client;
}

// Call this function once when the server starts to establish the connection
connectToMongo();

// Export the client for use in API routes
module.exports = { connectToMongo, client };
