import express, { NextFunction } from "express";
import cors from "cors";
import mongooseconnect from "../src/configs/mongoose";
import routes from "../src/routes";
require("dotenv").config();

const app = express();
let port = process.env.PORT;
const PORT = 5000;

mongooseconnect();

var corsOptions = {
  origin: "http://localhost:4200",
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(routes);

app.get('/', (req, res)=>{
  res.send('succes get backendAss4 , Go ahead')
})

app.listen(PORT, () => console.log(`server running on localhost://${PORT}`));
// taskkill /F /IM node.exe
