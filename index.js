const express = require('express');
const dotenv = require('dotenv');
const cors = require("cors")

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
dotenv.config();

const uri = process.env.MONGO_DB;

const app = express();

const PORT = process.env.PORT;

app.use(cors())
app.use(express.json())

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


const JWKS = createRemoteJWKSet(
  new URL('http://localhost:3000/api/auth/jwks')
)




const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization;

  if(!authHeader){
    return res.status(401).json({message: "Unauthorized"})
  }

  const token = authHeader.split(" ")[1];

  if(!token){
    return res.status(401).json({message: "Unauthorized"})
  }

  try {
    const { payload } = await jwtVerify(token, JWKS)
    console.log(payload)
    next()

  } catch (error) {

    return res.status(401).json({message: "Unauthorized"})
  }

  // console.log(token);

  
} 


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db("driveEasy");

    const carCollection = db.collection('cars');

    const bookingsCollection = db.collection('bookings');

    const myAddedCarsCollection = db.collection('myAddedCars')



    // app.post('/myAddedCars', async (req, res) => {
    //   const myAddedCarsData = req.body;

    //   // console.log(myAddedCarsData);

    //   const result = await myAddedCarsCollection.insertOne(myAddedCarsData);

    //   res.json(result);
    // })


    app.get('/car', async (req, res) => {
      const result = await carCollection.find().toArray();
      res.json(result);
    })

    app.get('/myAddedCars', verifyToken ,async (req, res) => {
      const result = await myAddedCarsCollection.find().toArray();
      res.json(result);
    })

    app.patch('/myAddedCars/:id', async (req, res) => {
      const {id} = req.params;
      const updatedData  = req.body;

          if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid ID"
        });
      }

      const result = await myAddedCarsCollection.updateOne(
        {_id: new ObjectId(id)},
        {$set: updatedData}
      )

      res.json(result);
    })


    app.delete('/myAddedCars/:id', async (req, res) => {
      const {id} = req.params;

      const result = await myAddedCarsCollection.deleteOne({_id: new ObjectId(id)})

      res.json(result);
    })


    app.post('/car', verifyToken ,async (req, res) => {
      const carData = req.body;

      console.log(carData);

      const result1 = await carCollection.insertOne(carData);
      const result2 = await myAddedCarsCollection.insertOne(carData);
      

      res.json({result1, result2});
    })


    app.get('/car/:id', verifyToken, async (req, res) => {

        const {id} = req.params

        const result = await carCollection.findOne({_id: new ObjectId(id)})
        

        res.json(result)
    })


    app.get('/bookings/:userId', verifyToken, async (req, res) => {
      const {userId} = req.params;

      const result = await bookingsCollection.find({userId:userId}).toArray();

      res.json(result);
    })

    app.post('/bookings',verifyToken, async (req, res) => {
      const bookingData = req.body;

      const result = await bookingsCollection.insertOne(bookingData);

      res.json(result);
    })





    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send("server is running fine")
})

app.listen(PORT, () => {
    console.log(`server running on port ${PORT}`)
})