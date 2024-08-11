const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = "mongodb+srv://Prathmesh:APPLE@cluster0.58qvd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
let client = null;

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
      client = null; // Ensure client is reset if connection fails
    }
  }
  return client;
}

// Call this function once when the server starts to establish the connection
connectToMongo().catch(console.error);

// Export the function for connecting and the client for use in API routes
module.exports = { connectToMongo, client };
