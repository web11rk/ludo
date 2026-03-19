import mongoose from "mongoose"
import dbConnection from "../config/connectDB.js";
import { GLOBALPARAMS } from "../common/gameConstants.js";

const { Schema } = mongoose;

const logSchema = new Schema(
  {
    roomID:String,
    roomMaxPlayerCount:Number,
    roomCurrentPlayerCount:Number,
    isGameStarted:Boolean,
    match_id:String,
    gameMode:String,
    roomMaxAutoplayChances:String,
    roomMessage:String,
    playerDetails:Array,
    StartApiCallData:String,
    EndApiCallData:String,
    checkTournamentCancelledApi:String,
    isGameOver:Boolean,
    DeleteRoomCalled:Boolean,
    isDataInConsistencyContestCancel:Boolean,
    isCheat:Array,
    apiNotWorking:String,
    unityError:String,
    isTournament:Boolean,
    tournamentID:String,
    roundCount:String,
    responseFromTournamentApi:String,
    tournamentNextRoundName:String,
 },
  { timestamps: true }
);

logSchema.statics.add = async function (ludoData) {
    await this.create(ludoData);
};
logSchema.statics.update = async function (roomID,playerData){
    await this.updateMany(
        { "roomID":roomID }, // Filter to find the document
         { 
            $push: {
              "playerDetails": playerData,
            }
        }
    )
}

logSchema.statics.updateField = async function(roomID,fieldName,fieldValue)
{
  if(fieldName === 'isCheat')
  {
    await this.updateMany(
      { "roomID":roomID }, // Filter to find the document
       { 
          $push: {
            "isCheat": fieldValue,
          }
      }
  )
  }
  else
  {
    const updateObject = {};
    updateObject[fieldName] = fieldValue;
    
    const data = await this.updateOne({ "roomID":roomID},{
      $set: updateObject
    })
  }
}

logSchema.statics.getLogsField = async function (roomID,feildName) {
  const data = await this.find({roomID:roomID});
  GLOBALPARAMS.isLogs && console.log("GetLogsFielddata",data[0][feildName])
  return data[0][feildName]
};

logSchema.statics.KeyExistsInMongo = async function (roomID,feildName) {
  let ieExistKey = false
  const isExist = await this.find({ [feildName]: { $exists: true }});

  if(isExist){
    const isFieldValue = await this.find({roomID:roomID});
    if (isFieldValue.length > 0 && isFieldValue[0][feildName] === true) {
      ieExistKey = true;
    } else {
      ieExistKey = false;
    }
  }else{
    ieExistKey = false;
  }
  return ieExistKey
};

const LudoAllData = dbConnection.model("ludoData", logSchema);

export default LudoAllData;