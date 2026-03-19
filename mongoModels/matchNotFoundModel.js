import mongoose from "mongoose"
import dbConnection from "../config/connectDB.js";
import { GLOBALPARAMS } from "../common/gameConstants.js";

const { Schema } = mongoose;

const MatchNotFound = new Schema(
  {
    roomID:String,
    playerID:mongoose.Types.ObjectId,
    playerName:String,
    tournamentID:String,
    roundEndTime:String,
    roundStartTime:String,
    roundCount:String,
 },
  { timestamps: true }
);

MatchNotFound.statics.add = async function (data) {
    await this.create(data);
};

// MatchNotFound.statics.KeyExistsInMongo = async function (roomID,feildName) {
//   console.log('>>>roomID,feildName',roomID,feildName)
//   let ieExistKey = false
//   const isExist = await this.find({ [feildName]: { $exists: true } });
//   console.log('>>>isExist',isExist)

//   if(isExist.length > 0){
//     ieExistKey = true;
//   }else{
//     ieExistKey = false;
//   }
//   console.log('>>>isFieldValueieExistKey',ieExistKey)
//   return ieExistKey
// };

MatchNotFound.statics.KeyExistsInMongo = async function (roomID,feildName) {
  GLOBALPARAMS.isLogs &&  console.log('>>>roomID,feildName',roomID,feildName)
  let ieExistKey = false
    const isFieldValue = await this.find({'roomID':roomID});
    if (isFieldValue?.length > 0) {
      ieExistKey = true;
    } else {
      ieExistKey = false;
    }
  GLOBALPARAMS.isLogs &&  console.log('>>>isFieldValueieExistKey',ieExistKey)
  return ieExistKey
};

const MatchNotFoundData = dbConnection.model("MatchNotFound", MatchNotFound);

export default MatchNotFoundData;