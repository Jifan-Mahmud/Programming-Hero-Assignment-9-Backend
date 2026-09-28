require("dotenv").config();
const express = require("express");
const { MongoClient,ServerApiVersion } = require("mongodb");
const cors = require("cors");

const app = express();
const port = process.env.PORT;
const url = process.env.MONGODB_URL;

app.use(cors());
app.use(express.json());


const client = new MongoClient(url, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");

    app.get("/", (req, res) => {
      res.send("Hello World!");
    });

    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  } catch (err) {
    console.dir(err);
  }
}

run().catch(console.dir);
