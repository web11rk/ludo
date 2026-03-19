import mongoose from "mongoose"
import Player from "./playerModel.js"
import { GLOBALPARAMS } from "../common/gameConstants.js";

const { Schema } = mongoose;

const roomSchema = new Schema(
  {
    roomId: String,
    playersInRoom: [{ type: Schema.Types.ObjectId, ref: "Player" }],
  },
  { timestamps: true }
);

roomSchema.statics.add = async function (players) {
  const { roomId } = players[0];
  const { _id: roomObjId } = await this.create({ roomId });
  players = players.map((player) => ({
    ...player,
    roomObjId,
  }));

  //  GLOBALPARAMS.isLogs && console.log(players);
  const { insertedIds } = await Player.insertMany(players, {
    rawResult: true,
  });
  //  GLOBALPARAMS.isLogs && console.log(insertedIds);
  //  GLOBALPARAMS.isLogs && console.log(Object.values(insertedIds));
  const { modifiedCount } = await this.updateOne(
    { roomId },
    { playersInRoom: Object.values(insertedIds) }
  );
  //  GLOBALPARAMS.isLogs && console.log({ modifiedCount });
  if (modifiedCount)  GLOBALPARAMS.isLogs && console.log("Room has been saved");
  else  GLOBALPARAMS.isLogs && console.log("Room has not been saved");
};

roomSchema.statics.getPlayerByIdInRoom = async function (roomId, playerId) {
  const roomExists = await this.exists({ roomId });
  if (!roomExists) return  GLOBALPARAMS.isLogs && console.log("room does not exists");
  let room = await this.findOne({ roomId })
    .populate("playersInRoom")
    .select("playersInRoom");
  let addedPlayersInRoom = room.playersInRoom.filter(
    (player) => player.userID === playerId
  );
  // GLOBALPARAMS.isLogs && console.log({ addedPlayersInRoom });
  return addedPlayersInRoom[0];
};

roomSchema.statics.deleteRoom = function (roomId) {
  this.deleteOne({ roomId });
};

const RoomModel = mongoose.model("RoomModel", roomSchema);

export default RoomModel;
