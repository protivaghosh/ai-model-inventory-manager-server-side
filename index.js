const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const uri = `mongodb+srv://${process.env.ai_model_user}:${process.env.ai_model_password}@cluster0.1wh8t.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

 app.get('/', (req, res) => {
      res.send('AI Model Inventory Manager Server is running...');
    });

async function run() {
  try {
    // await client.connect();
    const database = client.db("ai-model-server");
    const userCollection = database.collection("users");
    const modelCollection = database.collection("models");
    const purchasesCollection = database.collection("purchases");

    console.log("✅ MongoDB connected successfully");

    

   
    // Add Model
    app.post("/models", async (req, res) => {
      try {
        const modelData = req.body;

        const requiredFields = ["name","framework","useCase","dataset","description","image","createdBy"];
        for (const field of requiredFields) {
          if (!modelData[field]) return res.status(400).json({ success: false, message: `${field} is required` });
        }

        modelData.createdAt = new Date();
        modelData.purchased = 0;

        const result = await modelCollection.insertOne(modelData);
        res.json({ success: true, result });
      } catch (err) {
        console.error("Error adding model:", err);
        res.status(500).json({ success: false, message: "Server error" });
      }
    });

    // Search Models
    app.get("/models/search", async (req, res) => {
      const { name } = req.query;
      if (!name) return res.status(400).json({ message: "Search term required" });

      try {
        const models = await modelCollection.find({ name: { $regex: name, $options: "i" } }).toArray();
        res.json(models);
      } catch (err) {
        console.error("Search Error:", err);
        res.status(500).json({ message: "Server error" });
      }
    });

    // Get Single Model
    app.get("/models/:id", async (req, res) => {
      const id = req.params.id;
      if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid model ID" });

      const model = await modelCollection.findOne({ _id: new ObjectId(id) });
      if (!model) return res.status(404).json({ message: "Model not found" });

      res.json(model);
    });

    // Delete Model
    app.delete("/models/:id", async (req, res) => {
      const id = req.params.id;
      if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid model ID" });

      const result = await modelCollection.deleteOne({ _id: new ObjectId(id) });
      res.json(result);
    });

    // Update Model
    app.put("/models/:id", async (req, res) => {
      const id = req.params.id;
      if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid model ID" });

      const updatedData = req.body;
      const result = await modelCollection.updateOne({ _id: new ObjectId(id) }, { $set: updatedData });
      res.json(result);
    });

    // Get All Models (optionally by creator or framework)
app.get("/models", async (req, res) => {
  try {
    const { createdBy, framework, name } = req.query;
    const query = {};

    if (createdBy) {
      query.createdBy = { $regex: new RegExp(`^${createdBy}$`, "i") };
    }

    if (framework) {
      query.framework = framework; // exact match
    }

    if (name) {
      query.name = { $regex: name, $options: "i" }; // name search
    }

    const models = await modelCollection.find(query).toArray();
    res.json(models);
  } catch (err) {
    console.error("Error fetching models:", err);
    res.status(500).json({ message: "Server error fetching models" });
  }
});


    // Get latest models
app.get('/latest-models', async(req, res)=>{
      const cursor = modelCollection.find().sort({ createdAt: -1 }).limit(6);
      const result = await cursor.toArray()
      res.send(result);
     })





    // Purchase Model
    app.post("/purchase/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const userEmail = req.body.email;
        if (!userEmail) return res.status(400).json({ success: false, message: "Email is required" });
        if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid model ID" });

        const model = await modelCollection.findOne({ _id: new ObjectId(id) });
        if (!model) return res.status(404).json({ success: false, message: "Model not found" });

        const purchaseDoc = {
          modelId: id,
          purchasedBy: userEmail,
          name: model.name,
          image: model.image,
          framework: model.framework,
          useCase: model.useCase,
          createdBy: model.createdBy,
           createdAt: new Date(),
        };
        await purchasesCollection.insertOne(purchaseDoc);

        const updatedModel = await modelCollection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $inc: { purchased: 1 } },
          { returnDocument: "after" }
        );

        res.json({
          success: true,
          message: "Purchase successful",
          purchasedCount: updatedModel?.value?.purchased ?? model.purchased + 1,
        });
      } catch (err) {
        console.error("Purchase Error:", err);
        res.status(500).json({ success: false, message: err.message || "Server error" });
      }
    });

    // Get Purchases for User
    app.get("/purchases", async (req, res) => {
      try {
        const purchasedBy = req.query.purchasedBy;
        if (!purchasedBy) return res.status(400).json({ success: false, message: "Email is required" });

        const purchases = await purchasesCollection.find({ purchasedBy }).toArray();
        res.json(purchases);
      } catch (err) {
        console.error("Error fetching purchases:", err);
        res.status(500).json({ success: false, message: "Server error fetching purchases" });
      }
    });

    // Add User
    app.post('/users', async (req, res) => {
      try {
        const { name = "User", email, photoURL = "https://i.ibb.co/9yRjFSp/user.png" } = req.body;
        if (!email) return res.status(400).json({ success: false, message: "Email is required" });

        const existingUser = await userCollection.findOne({ email });
        if (existingUser) return res.json({ success: false, message: "User already exists" });

        const result = await userCollection.insertOne({ name, email, photoURL });
        res.json({ success: true, result });
      } catch (err) {
        console.error("Error inserting user:", err);
        res.status(500).json({ success: false, message: "Server error" });
      }
    });

    // Ping MongoDB
    // await client.db("admin").command({ ping: 1 });
    console.log("✅ Pinged MongoDB successfully");

  } finally {
    // client.close(); // Don't close, server keeps running
  }
}

run().catch(console.error);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
