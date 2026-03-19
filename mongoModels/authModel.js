import mongoose from "mongoose"
import dbConnection from "../config/connectDB.js";

const { Schema } = mongoose;

const AuthSchema = new Schema(
  {
    playerName:String,
    playerID:String,
    authTokenFromClient:String,
    authTokenFromServer:String,
    isAuth:Boolean,
    error:String,
    encryptedData:String,
 },
  { timestamps: true }
);

AuthSchema.statics.add = async function (ludoData) {
    await this.create(ludoData);
};
const AuthModel = dbConnection.model("AuthFailed", AuthSchema);

export default AuthModel;