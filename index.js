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

