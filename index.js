const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
const app = express();

app.use(cors({
    origin: ["http://localhost:5173"],
    credentials: true,
}));
app.use(express.json());




















app.get('/' , (req , res)=>{
    res.send('গাড়ীর দোকান রেডি')
})
app.listen(port , ()=>{
    console.log("server is running in the port : " , port);
})