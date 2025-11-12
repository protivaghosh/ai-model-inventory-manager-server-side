const express = require('express')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 5000 ;
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');


// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.ai_model_user}:${process.env.ai_model_password}@cluster0.1wh8t.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


app.get('/', (req, res) => {
  res.send(' ai-model-inventory-manager-server-side running .....')
})


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
     
   
      const database = client.db("ai-model-server");
      const userCollection = database.collection("users");
       const modelCollection = database.collection("models");
       const purchasesCollection = database.collection("purchases");

         // ---------- Add Model ----------
    app.post("/models", async (req, res) => {
      try {
        const modelData = req.body;

        // Validation: all required fields must exist
        const requiredFields = [
          "name",
          "framework",
          "useCase",
          "dataset",
          "description",
          "image",
          "createdBy",
        ];

        for (const field of requiredFields) {
          if (!modelData[field]) {
            return res.status(400).send({
              success: false,
              message: `${field} is required`,
            });
          }
        }

        // Add extra fields
        modelData.createdAt = new Date();
        modelData.purchased = 0;

        const result = await modelCollection.insertOne(modelData);
        res.send({ success: true, result });
      } catch (err) {
        console.error("Error adding model:", err);
        res.status(500).send({ success: false, message: "Server error" });
      }
    });

  

//  ---------- Get Single Model (Details Page) ----------
    app.get("/models/:id", async (req, res) => {
      const id = req.params.id;
      const { ObjectId } = require("mongodb");
      const model = await modelCollection.findOne({ _id: new ObjectId(id) });
      res.send(model);
    });

 // ---------- Delete Model ----------
    app.delete("/models/:id", async (req, res) => {
      const id = req.params.id;
      const { ObjectId } = require("mongodb");
      const result = await modelCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // ---------- Update Model ----------
    app.put("/models/:id", async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      const { ObjectId } = require("mongodb");
      const result = await modelCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );
      res.send(result);
    });

 // ---------- Get Models (all or by createdBy) ----------
app.get("/models", async (req, res) => {
  try {
    const createdBy = req.query.createdBy;
    let query = {};

    if (createdBy) {
      // Case-insensitive match
      query = { createdBy: { $regex: new RegExp(`^${createdBy}$`, "i") } };
    }

    console.log("🧩 Filter Query:", query);

    const models = await modelCollection.find(query).toArray();
    console.log("📦 Found Models:", models.length);

    res.send(models);
  } catch (err) {
    console.error("❌ Error fetching models:", err);
    res.status(500).send({ message: "Server error fetching models" });
  }
});




// purchase
 app.post("/purchase/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const userEmail = req.body.email;
    const { ObjectId } = require("mongodb");

    console.log("🟡 Purchase Request Received for ID:", id, "by:", userEmail);

    if (!userEmail) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const model = await modelCollection.findOne({ _id: new ObjectId(id) });
    if (!model) {
      return res.status(404).json({ success: false, message: "Model not found" });
    }

    // Insert purchase
    const purchaseDoc = {
      modelId: id,
      purchasedBy: userEmail,
      name: model.name,
      image: model.image,
      framework: model.framework,
      useCase: model.useCase,
      createdAt: new Date(),
    };
    await purchasesCollection.insertOne(purchaseDoc);
    console.log("🟢 Purchase inserted successfully!");

    // ✅ Update purchase count safely
    const updatedModel = await modelCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $inc: { purchased: 1 } },
      { returnDocument: "after" } // after update
    );

    console.log("🟢 Update Result:", updatedModel);

    // ✅ Extra safety check
    const newCount = updatedModel?.value?.purchased ?? model.purchased + 1;

    res.status(200).json({
      success: true,
      message: "Purchase successful!",
      purchasedCount: newCount,
    });
  } catch (err) {
    console.error("🔥 Purchase Route Error:", err);
    res.status(500).json({ success: false, message: err.message || "Server error" });
  }
});





// user start
      app.post('/users', async (req, res) => {
  try {
     const newUser = {
  name: req.body.name || "User",
  email: req.body.email,
  photoURL: req.body.photoURL || "https://i.ibb.co/9yRjFSp/user.png"
}; 
    const email = newUser.email;

    if (!email) {
      return res.status(400).send({ success: false, message: "Email is required" });
    }

    // Check if user already exists
    const existingUser = await userCollection.findOne({ email: email });
    if (existingUser) {
      return res.send({ success: false, message: "User already exists" });
    }

    // user end

    // Insert new user
    const result = await userCollection.insertOne(newUser);
    res.send({ success: true, result });
  } catch (err) {
    console.error("Error inserting user:", err);
    res.status(500).send({ success: false, message: "Server error" });
  }
});



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

