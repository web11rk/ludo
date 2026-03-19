import * as dotenv from 'dotenv'
import mongoose from "mongoose"
dotenv.config()
let dbConnection;
try {
   dbConnection = mongoose.createConnection(process.env.MONGO_DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
   console.log("<-<-<-<-<-<-<-<- LUDO successfully LUDO ->->->->->->->->")
} catch (error) {
   console.log(error,"<-<-<-<-<-<-<-<- LUDO successfully LUDO ->->->->->->->->")
}

export default dbConnection
