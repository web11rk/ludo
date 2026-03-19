import mongoose from "mongoose"
import dbConnection from "../config/connectDB.js";

const { Schema } = mongoose;

const PlayerNotAssociatedWithRoom = new Schema(
  {
    roomID:String,
    user_id:String,
    requestApi:String,
    responseApi:String,
    status:Boolean,
    redisKeyMissMatch:String
 },
  { timestamps: true }
);
PlayerNotAssociatedWithRoom.statics.Add = async function (ludoData) {
    await this.create(ludoData);
};
PlayerNotAssociatedWithRoom.statics.CheckAndAdd = async function (roomID,playerID,data) 
{
  const query = { roomID:roomID,user_id:playerID };
  const updateData = { $set: data };
  // GLOBALPARAMS.isLogs && console.log("23");
  // Perform upsert operation
  let result=await this.updateOne(query, updateData, { upsert: true });
  // GLOBALPARAMS.isLogs && console.log("26",result);
  // await this.create(ludoData);
};
const PlayerNotAssociatedWithRoomModel = dbConnection.model("player_associated_with_room", PlayerNotAssociatedWithRoom);

export default PlayerNotAssociatedWithRoomModel;