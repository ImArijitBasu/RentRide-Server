const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const port = process.env.PORT || 5000;
const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://rentride-assignment-11.web.app",
      "https://rentride-assignment-11.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
//TODO : Custom middleware

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).send({ message: "unauthorized access" });
  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
  });

  next();
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tbvw1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    const carCollection = client.db("rentRide").collection("cars");
    const bookingCollection = client.db("rentRide").collection("bookings");

    app.post("/jwt", async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.SECRET_KEY, {
        expiresIn: "365d",
      });
      console.log(token);
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    app.get("/logout", async (req, res) => {
      res
        .clearCookie("token", {
          maxAge: 0,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    app.get("/cars", async (req, res) => {
      const { search = "", sort = "" } = req.query;
      let query = {};
      if (search) {
        const regex = new RegExp(search, "i");
        query = {
          $or: [{ carModel: regex }, { location: regex }],
        };
      }
      let cursor = carCollection.find(query);
      if (sort === "priceLowToHigh") {
        cursor = cursor.sort({ dailyRentalPrice: 1 });
      } else if (sort === "priceHighToLow") {
        cursor = cursor.sort({ dailyRentalPrice: -1 });
      } else if (sort === "modelAZ") {
        cursor = cursor.sort({ postDate: 1 });
      } else if (sort === "modelZA") {
        cursor = cursor.sort({ postDate: -1 });
      }
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/add-car", async (req, res) => {
      const carData = req.body;
      const result = await carCollection.insertOne(carData);
      res.send(result);
    });
    app.get("/cars/recent", async (req, res) => {
      const result = await carCollection
        .find()
        ?.sort({ postDate: -1 })
        ?.limit(8)
        .toArray();
      res.send(result);
    });
    app.get("/cars/topPrice", async (req, res) => {
      const result = await carCollection
        .find()
        ?.sort({ dailyRentalPrice: -1 })
        .limit(10)
        .toArray();
      res.send(result);
    });
    app.get("/cars/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      // ! jwt part
      const decodedEmail = req.user?.email;
      if (decodedEmail !== email)
        return res.status(401).send({ message: "unauthorized access" });
      const query = { "publisher.email": email };
      const result = await carCollection.find(query).toArray();
      res.send(result);
    });
    app.delete("/cars/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await carCollection.deleteOne(query);
      res.send(result);
    });
    app.get("/car/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await carCollection.findOne(query);
      res.send(result);
    });
    app.put("/update-car/:id", async (req, res) => {
      const id = req.params.id;
      const carData = req.body;
      const updatedData = {
        $set: carData,
      };
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const result = await carCollection.updateOne(query, updatedData, options);
      res.send(result);
    });
    app.post("/cars-by-ids", async (req, res) => {
      const { carIds } = req.body;
    
      if (!carIds || !Array.isArray(carIds)) {
        return res.status(400).json({ error: "Invalid carIds" });
      }
    
      try {
        // Convert carIds to ObjectId
        const objectIds = carIds.map((id) => new ObjectId(id));
    
        const cars = await carCollection.find({ _id: { $in: objectIds } }).toArray();
    
        res.status(200).json(cars);
      } catch (err) {
        console.error("Error fetching cars:", err);
        res.status(500).json({ error: "Failed to fetch cars" });
      }
    });
    
    //! booking section codes
    app.post("/book-car", verifyToken, async (req, res) => {
      try {
        const bookingData = req.body;
        const decodedEmail = req.user?.email;
    
        if (decodedEmail !== bookingData.userEmail) {
          return res.status(401).send({ message: "Unauthorized access" });
        }
    
        const carId = new ObjectId(bookingData.carId);
        const car = await carCollection.findOne({ _id: carId });

        if (!car) {
          return res.status(404).send({ message: "Car not found" });
        }
    
        if (car.availability === "Unavailable") {
          return res.status(400).send({ message: "Car is not available for booking" });
        }
    

        await carCollection.updateOne(
          { _id: carId },
          {
            $set: { availability: "Unavailable", booked: true },
            $inc: { bookingCount: 1 }
          }
        );
        
    
        const booking = {
          carId: bookingData.carId,
          userEmail: bookingData.userEmail,
          bookingDate: new Date().toISOString(),
          rentFee: car.dailyRentalPrice,
          carModel: car.carModel, 
        };
    
        const result = await bookingCollection.insertOne(booking);
    
        res.status(200).send({ message: "Car booked successfully", bookingId: result.insertedId });
      } catch (err) {
        console.error("Booking Error:", err);
        res.status(500).send({ message: "Failed to book the car. Please try again." });
      }
    });
    
    
    app.delete("/cancel-booking/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const booking = await bookingCollection.findOne({
          _id: new ObjectId(id),
        });
    
        if (!booking) {
          return res.status(404).send({ message: "Booking not found" });
        }
    
        const carId = new ObjectId(booking.carId);
        const car = await carCollection.findOne({ _id: carId });
        if (!car) {
          return res.status(404).send({ message: "Car not found" });
        }
        await carCollection.updateOne(
          { _id: carId },
          { $set: { availability: "Available" , booked: false } }
        );
        const result = await bookingCollection.deleteOne({
          _id: new ObjectId(id),
        });
    
        if (result.deletedCount === 1) {
          res.status(200).send({ message: "Booking canceled successfully" });
        } else {
          res.status(500).send({ message: "Failed to cancel booking" });
        }
      } catch (err) {
        console.error("Cancellation Error:", err);
        res.status(500).send({ message: "An error occurred. Please try again." });
      }
    });
    app.get("/my-bookings/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.user?.email;
      if (decodedEmail !== email) {
        return res.status(401).send({ message: "Unauthorized access" });
      }
    
      try {
        const result = await bookingCollection
          .find({ userEmail: email })
          .toArray();
        if (result.length === 0) {
          return res.status(404).send({ message: "No bookings found for this user" });
        }
        res.status(200).send(result);
    
      } catch (err) {
        console.error("Error fetching bookings:", err);
        res.status(500).send({ message: "Failed to fetch bookings. Please try again later." });
      }
    });
    app.put("/update-booking/:id", async (req, res) => {
      try {
        const bookingId = req.params.id;
        const { bookingDate } = req.body;
    
        const result = await bookingCollection.updateOne(
          { _id: new ObjectId(bookingId) },
          { $set: { bookingDate: new Date(bookingDate) } }
        );
    
        if (result.modifiedCount > 0) {
          res.status(200).send({ message: "Booking updated successfully" });
        } else {
          res.status(404).send({ message: "Booking not found or no changes made" });
        }
      } catch (err) {
        console.error("Update Error:", err);
        res.status(500).send({ message: "Failed to update booking" });
      }
    });
    
    
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("গাড়ীর দোকান রেডি");
});
app.listen(port, () => {
  console.log("server is running in the port : ", port);
});
