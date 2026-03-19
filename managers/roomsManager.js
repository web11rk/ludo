/* The above code is a JavaScript module that exports a class called `RoomsManager`. This class is
responsible for managing rooms and performing various operations related to the rooms. */
import Player from "../mongoModels/playerModel.js"
import RoomModel from "../mongoModels/roomModel.js"
import timerManager from "./TimerManager.js";
import redisClient from '../config/redisClient.js';
import { GLOBALPARAMS, JOINING_OBJECT_CLASSES, LUDO_ROOM, LUDO_ROOM_PLAYER_DATA, TIMER_MODE_TIMER_COMPLTED} from '../common/gameConstants.js';
import { GetRoomVariable } from "../common/room.js"
import _ from 'lodash'
import utilityFunctions, { DeleteJoiningObjectClass } from "../utils/utilityFunctions.js";
import { DeleteRoomFromSocketServer, DisconnectAllSocketsInARoom } from "./socketManager.js";
import LudoAllData from "../mongoModels/logsModel.js";
import { writeToLog } from "../logs/loggerManager.js";


  export const roomsTurnList = new Map();
  export async function DeleteRoom(roomID) 
  {
    try 
    {
      let getKeysofPlayer = await redisClient.keys(`${LUDO_ROOM_PLAYER_DATA}:${roomID}:*`)
      GLOBALPARAMS.isLogs && console.log(getKeysofPlayer,"getKeysofPlayer");
      await redisClient.del(`${LUDO_ROOM}:${roomID}`)
      await LudoAllData.updateField(roomID,'DeleteRoomCalled',true)
      writeToLog('Delete Room getKeysofPlayer' + getKeysofPlayer,roomID)
      getKeysofPlayer.length > 0 ? (await redisClient.del(getKeysofPlayer)) : ''
      DeleteTurnList(roomID);
      // TIMER_MODE_TIMER_COMPLTED.delete(roomID)
      DeleteJoiningObjectClass(roomID);
      DisconnectAllSocketsInARoom(roomID);
      DeleteRoomFromSocketServer(roomID);

      if(GLOBALPARAMS.isDisposeObjects)
      {
        getKeysofPlayer = null;
      }
      // writeToLog("DeleteRoom called xxxxxxxxxxxxxxxxxxxx",roomID,true);
    }
    catch (error)
    {
     
      DisconnectAllSocketsInARoom(roomID);
      DeleteRoomFromSocketServer(roomID);
      // writeToLog("ERROR DeleteRoom xxxxxxxxxxxxxxxxxxxxxxxxxxx"+error,roomID,true);
      GLOBALPARAMS.isLogs && console.log(error,"errooooooor");
    }
    console.log("delete room called");
  }
  export function DeleteTurnList(roomID)
  {
    let turnList =  GetRoomTurnList(roomID)
    if(!_.isEmpty(turnList))
    {
      roomsTurnList.delete(turnList);
      if(GLOBALPARAMS.isDisposeObjects)
      {
        turnList = null;
      }
    }
  }

  /**
   * The function `GetPlayerContestDetailsFromServer` retrieves contest details for a specific player
   * from the server.
   * @param roomId - The roomId parameter is the unique identifier of the room in which the player is
   * participating in a contest.
   * @param playerID - The `playerID` parameter is the unique identifier of a player in a game room.
   * @returns an object called `playerData` which contains the following properties:
   */

  
  export async function GetPlayerContestDetailsFromServer(roomId, playerID) 
  {
    GLOBALPARAMS.isLogs && console.log("roomID " + roomId);
    GLOBALPARAMS.isLogs && console.log("playerID " + playerID);

    let roomExists = await RoomModel.exists({ roomId });
    if (!roomExists)
    {
      GLOBALPARAMS.isLogs && console.log("room does not exists in GetPlayerContestDetailsFromServer function");
      return;
    }
    
    let { playerWinningAmount, playerWinningFormattedAmount, rank } = await RoomModel.getPlayerByIdInRoom(roomId, playerID);

    const playerData = {
      isWon: playerWinningAmount > 0 ? true : false,
      playerWinningAmount,
      playerWinningFormattedAmount,
      rank,
    };

     GLOBALPARAMS.isLogs && console.log("playerdataroommanager " + JSON.stringify(playerData));
    if(GLOBALPARAMS.isDisposeObjects)
    {
      roomExists = null;
      playerWinningAmount = null;
      playerWinningFormattedAmount = null;
      rank = null;
    }
    return playerData;
  }

  /**
   * The function saves players in a room to a database.
   * @param players - The "players" parameter is an array of player objects that you want to save in
   * the database.
   */
  export async function savePlayerInPlayerModal(players) 
  {
    await Player.add(players);
    GLOBALPARAMS.isLogs && console.log("savePlayersInRoom func to save in databse has been called");
  }
  export async function getRoomPlayerData(roomID,playerID)
  {
    GLOBALPARAMS.isLogs && console.log(" getRoomPlayerData func to get in databse has been called");
    const data = await Player.getPlayersData(roomID,playerID);
    GLOBALPARAMS.isLogs && console.log(data,"data in the house");
    return data
  }
  /**
   * The function retrieves a player by their ID in a specific room.
   * @param roomId - The roomId parameter is the unique identifier of the room where the player is
   * located.
   * @param playerId - The playerId parameter is the unique identifier of the player you want to
   * retrieve from the room.
   */
  export async function getPlayerByIdInRoom(roomId, playerId)
  {
    await RoomModel.getPlayerByIdInRoom(roomId, playerId);
  }
  /* The `CheckIfGameExists` function is checking if a game exists in a specific room. It takes three
  parameters: `roomId`, `userID`, and `noOfPlayers`. */
  export async function CheckIfGameExists(roomId, playerID, noOfPlayers) 
  {
    let data = await Player.GetMongoRoomExist(roomId);
    // GLOBALPARAMS.isLogs && console.log(data[0],"-----data");

    let roomExists = data[0] ? true : false
    if (!roomExists)
    {
      GLOBALPARAMS.isLogs && console.log(`Room Does not exists in room ${roomId}`);
      if(GLOBALPARAMS.isDisposeObjects)
      {
        data = null;
        roomExists = null;
      }
      return false;
    }
  
    if (+data[0].noOfPlayers !== +noOfPlayers) 
    {
       GLOBALPARAMS.isLogs && console.log("No of Players in mongo room"+data[0].noOfPlayers);
       GLOBALPARAMS.isLogs && console.log(`No of players ${noOfPlayers } does not match in ${roomId } `);
      if(GLOBALPARAMS.isDisposeObjects)
      {
        data = null;
        roomExists = null;
      }
      return false;
    }


    let playerExistsInRoom = data.find((id)=> id === playerID) ? true : false

    if(playerExistsInRoom) 
    {
      GLOBALPARAMS.isLogs && console.log(`Player with id ${playerID} Does not exist in ${roomId }`);
      if(GLOBALPARAMS.isDisposeObjects)
      {
        data = null;
        roomExists = null;
        playerExistsInRoom = null;
      }
      return false;
    }
    if(GLOBALPARAMS.isDisposeObjects)
    {
      data = null;
      roomExists = null;
      playerExistsInRoom = null;
    }
    return true;
  }
  export async function CheckIfRoomExists(roomID)
  {
    let isExist = false;
    let isRoomExist = await redisClient.exists(`${LUDO_ROOM}:${roomID}`);
    let roomData = await redisClient.get(`${LUDO_ROOM}:${roomID}`);

    //console.log("roomData "+JSON.stringify(roomData));
    //console.log(isRoomExist,"---isRoomExist");
    if(isRoomExist > 0)
    {
      isExist = true;
      //console.log("room exist in redis");
    }
    if(JOINING_OBJECT_CLASSES.has(roomID))
    {
      isExist = true;
      //console.log("room exist in joining object class");
    }
     //console.log("roomID in CHECKFOR ROOM EXIST "+roomID);
     //console.log(isRoomExist,`${LUDO_ROOM}:${roomID}`,"CheckIfRoomExist");
     //console.log("Room Exist "+isExist);

     if(GLOBALPARAMS.isDisposeObjects)
     {
      isRoomExist = null;
      roomData = null;
     }
    // writeToLog("?????????? CheckIfRoomExists "+isExist,roomID)
    return isExist;
   
  }
  export function CheckIfJoinedPlayerGameStarted(joiningObject)
  {
    const gameStarted = utilityFunctions.BoolParser(joiningObject.isStart);
     GLOBALPARAMS.isLogs && console.log("JOINED_PLAYER_GAME_STARTED "+gameStarted);
    // writeToLog("?????????? gameStarted "+gameStarted,joiningObject.roomID)
    return gameStarted;
  }
  export function CheckIfJoinedPlayerWaitingTimerStarted(joiningObject)
  {
    const waitingTimerStarted = utilityFunctions.BoolParser(joiningObject.isWaitingTimerStarted);
    GLOBALPARAMS.isLogs && console.log("CHECK_IF_JOINED_PLAYER_WAITING_TIMER_STARTED "+waitingTimerStarted);
    return waitingTimerStarted;
  }
  export function GetRoomTurnList(roomID)
  {
    const turnList = roomsTurnList.get(roomID);
    return turnList;
  }
  export function SetRoomTurnList(roomID,turnList)
  {
    try 
    {
      roomsTurnList.set(roomID,turnList)
      writeToLog("while setRoomTurnList "  + JSON.stringify(turnList),roomID)
    }
    catch (error) 
    {
      writeToLog("Error while setRoomTurnList "  + error,roomID)
    }
  }
  export async function CanJoinRoom(roomID)
  {
    let canJoinRoom = false;
    let waitingTimerTimeStamp = await GetRoomVariable(roomID,"waitingTimerTimeStamp");
    let timerCompletionRemianingSeconds = parseInt(timerManager.GetCurrentTimerRemainingSeconds(waitingTimerTimeStamp));
    GLOBALPARAMS.isLogs && console.log("timerCompletionRemianingSeconds "+timerCompletionRemianingSeconds);
    GLOBALPARAMS.isLogs && console.log("GLOBALPARAMS.roomJoiningMinWaitingTimerLimit "+GLOBALPARAMS.roomJoiningMinWaitingTimerLimit);

    if(timerCompletionRemianingSeconds > GLOBALPARAMS.roomJoiningMinWaitingTimerLimit)
    {
      canJoinRoom = true;
    }

    if(GLOBALPARAMS.isDisposeObjects)
    {
      waitingTimerTimeStamp = null;
      timerCompletionRemianingSeconds = null;
    }
    // writeToLog("??????????"+canJoinRoom,roomID)
    return canJoinRoom;

  }
  export async function CheckIfPlayerExistInRoom(roomID,playerID)
  {
    let isExist = false;
    let isPlayerExists = await redisClient.exists(`${LUDO_ROOM_PLAYER_DATA}:${roomID}:${playerID}`);
    GLOBALPARAMS.isLogs && console.log(isPlayerExists,"---isPlayerExist");
    if(isPlayerExists > 0)
    {
      isExist = true
    }
    GLOBALPARAMS.isLogs && console.log(isPlayerExists,`${LUDO_ROOM_PLAYER_DATA}:${roomID}:${playerID}`,"CheckIfPlayerExistInRoom");
    // writeToLog("???????????"+isPlayerExists,roomID)
    if(GLOBALPARAMS.isDisposeObjects)
    {
      isPlayerExists = null;
    }
    
    return isExist;
  } 

