const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
require('dotenv').config();
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken')
const cors = require('cors');
const port = process.env.PORT || 5000;
const app = express();

app.use(cors({
    origin: ["http://localhost:5173"],
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser())
//TODO : Custom middleware

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token
  if (!token) return res.status(401).send({ message: 'unauthorized access' })
  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded
  })

  next()
}




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tbvw1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});






async function run() {
  try {
      console.log("Pinged your deployment. You successfully connected to MongoDB!");


      const carCollection = client.db("rentRide").collection('cars');


      app.post('/jwt', async (req, res) => {
        const email = req.body
        const token = jwt.sign(email, process.env.SECRET_KEY, {
          expiresIn: '365d',
        })
        console.log(token)
        res
          .cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          })
          .send({ success: true })
      })
      
      app.get('/logout', async (req, res) => {
        res
          .clearCookie('token', {
            maxAge: 0,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          })
          .send({ success: true })
      })

      app.get("/cars", async (req, res) => {
          const { search = "", sort = "" } = req.query;
          let query = {};
          if (search) {
            const regex = new RegExp(search, "i");
            query = {
              $or: [
                { carModel: regex },
                { location: regex },
              ],
            };
          }
          let cursor = carCollection.find(query);
          if (sort === "priceLowToHigh") {
            cursor = cursor.sort({ dailyRentalPrice: 1 });
          } else if (sort === "priceHighToLow") {
            cursor = cursor.sort({ dailyRentalPrice: -1 });
          } else if (sort === "modelAZ") {
            cursor = cursor.sort({ carModel: 1 });
          } else if (sort === "modelZA") {
            cursor = cursor.sort({ carModel: -1 });
          }
          const result = await cursor.toArray();
          res.send(result);

      });
      
      app.post('/add-car' , async(req,res)=>{
        const carData = req.body;
        const result = await carCollection.insertOne(carData);
        res.send(result)
      })
      app.get('/cars/recent' , async(req,res)=>{
        const result = await carCollection.find()?.sort({postDate : -1})?.limit(8).toArray();
        res.send(result)
      })
      app.get('/cars/topPrice' , async(req,res)=>{
        const result = await carCollection.find()?.sort({dailyRentalPrice: -1}).limit(10).toArray();
        res.send(result)
      })
      app.get('/cars/:email', verifyToken , async(req,res)=>{
        const email = req.params.email;
        // ! jwt part
        const decodedEmail = req.user?.email;
        if(decodedEmail !== email) return res.status(401).send({message: "unauthorized access"})
        const query = {'publisher.email': email}
        const result = await carCollection.find(query).toArray()
        res.send(result)
      })
      app.delete('/cars/:id' , async(req,res)=>{
        const id = req.params.id;
        const query = {_id : new ObjectId(id)};
        const result = await carCollection.deleteOne(query)
        res.send(result)
      })
      app.get('/car/:id' , async(req,res)=>{
        const id = req.params.id;
        const query = {_id :new ObjectId(id) };
        const result = await carCollection.findOne(query);
        res.send(result)
      })
      app.put('/update-car/:id' , async(req,res)=>{
        const id = req.params.id;
        const carData = req.body;
        const updatedData = {
          $set: carData,
        }
        const query = {_id: new ObjectId(id)};
        const options = {upsert: true};
        const result = await carCollection.updateOne(query,updatedData ,options);
        res.send(result);
      })

  } finally {

  }
}
run().catch(console.dir)
















app.get('/' , (req , res)=>{
    res.send('গাড়ীর দোকান রেডি')
})
app.listen(port , ()=>{
    console.log("server is running in the port : " , port);
})