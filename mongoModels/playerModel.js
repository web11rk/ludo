import mongoose from "mongoose"
import dbConnection from "../config/connectDB.js";
import { GetUserDetailsFromRedis } from "../common/room.js";

const { Schema } = mongoose;

const playerSchema = new Schema(
  {
    isWon: Boolean,
    rank: String,
    playerWonAmount: {
       rank: String,
       image: String,
       price: Number
    },
    playerID: String,
    playerName: String,
    isPlayerLeft: Boolean,
    roomID: String,
    playerImageID: String,
    noOfPlayers:Number,
    score:Number,
    gameMode:String,
    isGameTied:Boolean
 },
  { timestamps: true }
);

playerSchema.statics.add = async function (userData) {
  for(var item of userData){
     await this.create(item);
  }
};

playerSchema.statics.delete = async function (userID) {
  await this.deleteOne({ userID });
};

playerSchema.statics.getPlayersByRoomId = async function (roomId) {
  await this.find({ roomId });
};

playerSchema.statics.getPlayersData = async function (playerID,roomID) {
  // GLOBALPARAMS.isLogs && console.log("I am called",playerID,roomID);
  const data = await this.find({playerID:playerID,roomID:roomID});
  // GLOBALPARAMS.isLogs && console.log(data[0],"=====dataOne");
  return data[0]
};

playerSchema.statics.GetMongoRoomExist = async function (roomID) {
  const data = await this.find({roomID:roomID});
  // GLOBALPARAMS.isLogs && console.log(data,"->>>>>>>>>>>>>>>>>>>Data");
  return data
};

playerSchema.statics.GetAllPlayerDataByPlayerID = async function (playerID,gameMode) {
  let lastFiveGameStatus = await this.find({gameMode:gameMode,playerID:playerID})
                .sort({ _id: -1 })
                .limit(5)
                .select('rank -_id');
                
  lastFiveGameStatus = lastFiveGameStatus.map(status => {
    if (status.rank === '2') {
      return  'L' ;
    } else if (status.rank === '1') {
      return 'W' ;
    } else {
      return status;
    }
  });
  const TotalGames = await this.countDocuments({gameMode:gameMode,playerID: playerID});
  const winnigData = await this.countDocuments({gameMode:gameMode,playerID: playerID,rank:1});
  const doj = await GetUserDetailsFromRedis(playerID);
  let winingPercetage = (winnigData / TotalGames) * 100;
      if (TotalGames > 10) {
        winingPercetage = Math.floor(winingPercetage);
        winingPercetage = winingPercetage == null ? 0 : winingPercetage;
        if (winingPercetage >= 0 && winingPercetage <= 20) {
          winingPercetage = "Beginner";
        } else if (winingPercetage > 20 && winingPercetage <= 30) {
          winingPercetage = "Learner";
        } else if (winingPercetage > 30 && winingPercetage <= 40) {
          winingPercetage = "Good";
        } else if (winingPercetage > 40 && winingPercetage <= 50) {
          winingPercetage = "Skilled";
        } else if (winingPercetage > 50 && winingPercetage <= 60) {
          winingPercetage = "Advanced";
        } else if (winingPercetage > 60 && winingPercetage <= 70) {
          winingPercetage = "Expert";
        } else if (winingPercetage > 70 && winingPercetage <= 80) {
          winingPercetage = "Champion";
        } else if (winingPercetage > 80 && winingPercetage <= 100) {
          winingPercetage = "Legend";
        } else {
          winingPercetage = "Beginner";
        }
      } else {
        winingPercetage = "Beginner";
      }
       

        return { lastFiveGameStatus, TotalGames, winingPercetage, doj };
};

const Player = dbConnection.model("Player", playerSchema);

export default Player;
