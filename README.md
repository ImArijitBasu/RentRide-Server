# RentRide - Server

## Purpose
The server-side of RentRide handles user authentication, car rental management, and communication with the MongoDB database. It provides secure APIs for interacting with the frontend, utilizing JWT for authentication, CORS for cross-origin requests, and MongoDB for data storage.

## Live URL
[RentRide Server Live](https://rentride-ecru.vercel.app/)  


## Key Features
- **JWT Authentication**: Secure user authentication and authorization using JSON Web Tokens (JWT).
- **MongoDB Integration**: Data storage and management for car listings, bookings, and user information.
- **CORS Handling**: Handles Cross-Origin Resource Sharing for frontend communication with the server.
- **Environment Configuration**: Use of `.env` files to securely manage environment variables.
- **Cookie Handling**: Use of `cookie-parser` for handling cookies in requests and responses.

## NPM Packages Used
  - `cookie-parser`: Middleware for parsing cookies in requests.
  - `cors`: Middleware for enabling CORS (Cross-Origin Resource Sharing).
  - `dotenv`: Loads environment variables from a `.env` file.
  - `express`: Web framework for building APIs.
  - `jsonwebtoken (jwt)`: Library for creating and verifying JSON Web Tokens.
  - `mongodb`: Official MongoDB Node.js driver for interacting with MongoDB databases.


  - `nodemon`: A utility that automatically restarts the server during development when file changes are detected.

