import mongoose from "mongoose"
import dbConnection from "../config/connectDB.js";

const { Schema } = mongoose;

const TournamentCancelled = new Schema(
  {
    roomID:String,
    user_id:String,
    round_count:String,
    tournament_id:String,
    requestApi:String,
    responseApi:String,
    status:Boolean,
 },
  { timestamps: true }
);

TournamentCancelled.statics.add = async function (ludoData) {
    await this.create(ludoData);
};
const TournamentCancelledModel = dbConnection.model("tournament_cancelled_before_match_start", TournamentCancelled);

export default TournamentCancelledModel;