import _ from 'lodash'
import { CheckIfRoomExists, DeleteRoom, DeleteTurnList, GetRoomTurnList, SetRoomTurnList, savePlayerInPlayerModal } from "../managers/roomsManager.js"
import { SendDiceRollDisableData, SendGameOverInfo, SendMyTurnData, SendPlayerNotMatchedInfo, SendRemainingAutoplayChances, SendTimerModeLastTurnCall, SendTournamentMatchNotFound, SendTurnData, SendWaitForGameOverData, SendWaitForNoMatchFound } from "../listenersAndEmitters/emitters.js"
import redisClient from '../config/redisClient.js';
import { CHECK_FOR_USER_DETAILS, GLOBALPARAMS,LUDO_ROOM,LUDO_ROOM_PLAYER_DATA,MOVE_PATH, PLAYER_TOKENS_ID, SAFE_ZONES, TIMER_FUNCTIONS, TIMER_MODE_TIMER_COMPLTED, UNSAFE_TOKENS} from './gameConstants.js';
import TimerManager from '../managers/TimerManager.js';
import ApiManager from '../managers/apiManager.js';
import { LeaveGame } from '../managers/listenManager.js';
import UtilityFunctions, { GetDynamicYear } from '../utils/utilityFunctions.js';
import { GetDiceValue, GetNonTieMatchDiceValue, UpdateDiceRolledFlag } from '../managers/DiceRollManager.js';
import { StartAutoplay } from '../managers/autoPlayManager.js';
import { DisconnectAllSocketsInARoom, GetPlayerSocket } from '../managers/socketManager.js';
import { CreateAndSendRemainingMovesObject } from '../managers/tokenManager.js';
import LudoAllData from '../mongoModels/logsModel.js';
import { writeToLog } from '../logs/loggerManager.js';
import TurnList from '../utils/TurnList.js';
import MatchNotFoundData from '../mongoModels/matchNotFoundModel.js';
import { BotDiceRoll } from '../managers/botManager.js';
import Player from '../mongoModels/playerModel.js';
import redisClientWeb11 from '../config/redisClientForWeb11.js';

  // #region Timer Start Methods
  export async function StartWaitingTimer(roomID) 
  {
    
    try 
    {
      let waitingTimerDuration = await GetRoomVariable(roomID, 'waitingTimerDuration')
      writeToLog("While StartWaitingTimer xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx " +waitingTimerDuration,roomID,true);
      TimerManager.Add({ roomId: roomID, eventType: "StopWaitingTimer", timerDurartion: waitingTimerDuration, parentEvent: null, roomRef: this });
      if(GLOBALPARAMS.isDisposeObjects)
      {
        waitingTimerDuration = null;
      }
    } 
    catch (error) 
    {
      writeToLog("Error While StartWaitingTimer xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx " + error,roomID,true);
    }
  }
  export async function StartTimerModeTimer(roomID)
  {
    try
    {
      let timerModeTimerDuration = await GetRoomVariable(roomID,'timerModeTimerDuration');
      writeToLog("While StartTimerModeTimer xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx " +timerModeTimerDuration,roomID,true)
      TimerManager.Add({ roomId: roomID, eventType: "StopTimerModeTimer", timerDurartion: timerModeTimerDuration, parentEvent: null, roomRef: this });
      if(GLOBALPARAMS.isDisposeObjects)
      {
        timerModeTimerDuration = null;
      }
    }
    catch(error)
    {
      writeToLog("Error While StartTimerModeTimer xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx " + error,roomID,true);
    }
    // GLOBALPARAMS.isLogs && console.log("ENTER ROOM CHECKING INSIDE  TIMER_MODE_START_TIMER CALLING 0");
    
  }
  export async function StartTurnTimer(roomID,delayTime,tokenActive,diceActive) 
  {
    try
    {
      let isRoomExists = await CheckIfRoomExists(roomID);
      if(isRoomExists)
      {
        GLOBALPARAMS.isLogs && console.log("enter the tekken");
        await SetRoomVariable(roomID,"tokenEnabled",tokenActive);
        await SetRoomVariable(roomID,"diceEnabled",diceActive);
        await SetRoomVariable(roomID,"tokenStateUpdating",false);
        //console.log("StartTurnTimer call");
        await UpdateDiceRolledFlag(roomID,false);
        const gameMode = await GetRoomVariable(roomID,"gameMode");
        writeToLog("START TURN TIMER GAME MODE" + gameMode,roomID,true);
        setTimeout(async()=>
        {
          GLOBALPARAMS.isLogs && console.log("enter the tekken 1");
          let turnTimerDuration = await GetRoomVariable(roomID, 'turnTimerDuration');
          let turnList = GetRoomTurnList(roomID);
          let turnPlayerId = (turnList.GetCurrentTurnPlayerData()).toString();
          let changeTurn = true;
          let isTournament = await GetRoomVariable(roomID,"isTournament");
          let canMatchTie = true;

          if(gameMode === GLOBALPARAMS.gameMode.MOVES)
          {
            let remainingMoves = await GetPlayerVariable(roomID,turnPlayerId,"currentMovesLeft");
            if(+remainingMoves === 0)
            {
              changeTurn = false;
            }
            if(GLOBALPARAMS.isDisposeObjects)
            {
              remainingMoves = null;
            }
          }
          else if(gameMode === GLOBALPARAMS.gameMode.TIMER)
          {
            
            const isTimerModeTimerCompleted = await GetRoomVariable(roomID,"isTimerModeTimerCompleted");
            // const isTimerModeTimerCompleted = TIMER_MODE_TIMER_COMPLTED.get(roomID)
            writeToLog("isTimerModeTimerCompleted======>>>>>>>" + isTimerModeTimerCompleted,roomID,true);
            if(isTimerModeTimerCompleted)
            {
              const lastTimerModeTurnID = await GetRoomVariable(roomID,"lastTimerModeTurnID");
              writeToLog("Last lastTimerModeTurnID " + lastTimerModeTurnID,roomID,true);
              writeToLog("Current turnPlayerId" + turnPlayerId,roomID,true);
              if(lastTimerModeTurnID != turnPlayerId)
              {
                writeToLog("Last TurnModeTurn Id is not equal to turnPlayerID",roomID,true);
                writeToLog("CheckForGameOver Called" + isTimerModeTimerCompleted,roomID,true);
                GLOBALPARAMS.isLogs && console.log("lastTimerModeTurnID "+lastTimerModeTurnID);
                GLOBALPARAMS.isLogs && console.log("turnPlayerId "+turnPlayerId);
                GLOBALPARAMS.isLogs && console.log("lastTimerModeTurnID != turnPlayerId ");
                changeTurn = false;
                await CheckForGameOver(roomID);
              }
              else
              {
                writeToLog("Last lastTimerModeTurnID is equal to turnPlayerID",roomID,true);
                GLOBALPARAMS.isLogs && console.log("Time Over. This will be the last turn");
                if(isTournament)
                {
                  canMatchTie = false;
                  writeToLog("Can Match tie false sending manupulatied value",roomID,true);
                }
                await SendTimerModeLastTurnCall(roomID,"Time Over. This will be the last turn");
              }
            }
            else
            {
              writeToLog("isTimerModeTimerCompleted ELSE" + isTimerModeTimerCompleted,roomID,true);
            }
  
          }
          if(changeTurn)
          {
            TimerManager.Add({ roomId: roomID, eventType: "StopTurnTimer", timerDurartion: turnTimerDuration, parentEvent: null, roomRef: this });
          
            let turnTimerTimeStamp = await GetRoomVariable(roomID, "turnTimerTimeStamp");
            //let turnPlayerSocketID = await GetPlayerVariable(roomID, turnPlayerId, "socketID");
            let diceVal = 0;
            //let turnPlayerSocket = GetPlayerSocket(turnPlayerSocketID);
            let turnPlayerSocket = false;
            GLOBALPARAMS.isLogs && console.log("currentTurnPlayerId " + turnPlayerId);
    
            if(tokenActive)
            {
              diceVal = await GetRoomVariable(roomID,"currentDiceNo");
              GLOBALPARAMS.isLogs && console.log("RETURN DICE VAL when token active "+diceVal);
            }
            else
            {
              if(!canMatchTie)
              {
                diceVal = await GetNonTieMatchDiceValue(roomID,turnPlayerId);
                writeToLog("MATCH NOT TIE DICE VALUE xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx "+diceVal ,roomID,true);
                GLOBALPARAMS.isLogs && console.log("write match cannot tie code");
              }
              else
              {
                diceVal = await GetDiceValue(roomID,turnPlayerId,true);
                GLOBALPARAMS.isLogs && console.log("RETURN DICE VAL when token inactive "+diceVal);
              }
            }

            //sending turn data to all the players

      
            let moveableTokenArray = await GetPlayerMovableTokens(roomID,turnPlayerId,diceVal,false);
            let playerTokensAtBase = await GetPlayerTokenStatusArray(null,roomID,turnPlayerId,GLOBALPARAMS.tokenStatus.AT_BASE,false);
            let autoTokenMove = false;

            if((diceVal != GLOBALPARAMS.diceMaxVal) && (moveableTokenArray.length === 1))
            {
              autoTokenMove = true;
            }
            else if((diceVal === GLOBALPARAMS.diceMaxVal) && (moveableTokenArray.length === 1) && (playerTokensAtBase.length === 0))
            {
              autoTokenMove = true;
            }
    
            await SetRoomVariable(roomID,"autoTokenMove",autoTokenMove);
    
            GLOBALPARAMS.isLogs && console.log("NEW DICE VALUE "+diceVal);
            let turnObj = new Object();
            turnObj.turnPlayerID = turnPlayerId,
            turnObj.turnPlayerName = await GetPlayerVariable(roomID,turnPlayerId,"playerName"),
            turnObj.turnTimerDuration = turnTimerDuration.toString(),
            turnObj.turnTimerCurrentSeconds = TimerManager.GetCurrentTimerRemainingSeconds(turnTimerTimeStamp),
            turnObj.currentDiceValue = diceVal;
            turnObj.previosDiceVal = await GetPlayerVariable(roomID,turnPlayerId,"previousDiceVal"),
            turnObj.previousTurnId = await GetRoomVariable(roomID,"previousTurnId"),
            turnObj.isDiceRolled = await GetRoomVariable(roomID,"diceRolled"),
            turnObj.currentAutoplayChances = await GetPlayerVariable(roomID, turnPlayerId, "currentAutoplayChances"),
            turnObj.maxAutoplayChances = await GetRoomVariable(roomID, "gameMaxAutoplayChances"),
            turnObj.hasConsecutiveSixCount = await GetPlayerVariable(roomID,turnPlayerId,"consecutiveSixCount") > 0 ? true : false,
            turnObj.autoTokenMove = autoTokenMove,
            turnObj.aretokenActive = tokenActive,
            turnObj.isDiceActive = diceActive;
    
            await SendTurnData(roomID, turnObj);

            let isBot = await GetPlayerVariable(roomID,turnPlayerId,"isBot");
            if(isBot)
            {
              //console.log("BOT DICE ROLL ACTION CALLED");
              await BotDiceRoll(roomID,turnPlayerId,diceVal);
            }
          
            writeToLog("StartTurnTimer / "+turnPlayerId+" / "+turnObj.turnPlayerName+" xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx " +JSON.stringify(turnObj),roomID,true);
          }
          else
          {
            writeToLog("StartTurnTimer cannot change turn xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx "+"cannot change turn",roomID,true);
            GLOBALPARAMS.isLogs && console.log("cannot change turn ");
          }
        
        },delayTime);
      }
      else
      {
        writeToLog("StartTurnTimer room not exists in start waiting timer xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx "+"room not exists in start waiting timer",roomID,true);
        GLOBALPARAMS.isLogs && console.log("room not exists in start waiting timer");
        if(GLOBALPARAMS.isDisposeObjects)
        {
          isRoomExists = null;
        }
      }
    }
    catch(error)
    {
      writeToLog("ERROR StartTurnTimer xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx "+error,roomID,true);
    }
    
  }
  
  //#endregion

  // #region Timer Stop Methods
  export async function StopTimerModeTimer(roomID,timestamp)
  {
    try
    {
      let isRoomExists = await CheckIfRoomExists(roomID);
      // GLOBALPARAMS.isLogs && console.log("ENTER ROOM CHECKING INSIDE  TIMER_MODE_STOP_TIMER CALLING 0");
      if(isRoomExists)
      {
        // GLOBALPARAMS.isLogs && console.log("ENTER ROOM CHECKING INSIDE  TIMER_MODE_STOP_TIMER CALLING 1");
        await SetRoomVariable(roomID,"isTimerModeTimerCompleted",true);
        // TIMER_MODE_TIMER_COMPLTED.set(roomID, true)
        const turnList = GetRoomTurnList(roomID);
        await SetRoomVariable(roomID,"lastTimerModeTurnID",turnList.GetCurrentTurnPlayerData());
        await SendTimerModeLastTurnCall(roomID,"Time Over. This will be the last turn");
        //await CheckForGameOver(roomID);
        writeToLog("StopTimerModeTimer xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx ",roomID,true);
      }
      else
      {
        writeToLog("StopTimerModeTimer room not exists xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx ",roomID,true);
        // GLOBALPARAMS.isLogs && console.log("ENTER ROOM CHECKING INSIDE  TIMER_MODE_STOP_TIMER CALLING 3");
        // GLOBALPARAMS.isLogs && console.log("room not exists in stop timer mode timer");
      }
      if(GLOBALPARAMS.isDisposeObjects)
      {
        isRoomExists = null;
      }
    }
    catch(error)
    {
      writeToLog("ERROR StopTimerModeTimer xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx "+error,roomID,true);
    }
    
  }
  export async function StopWaitingTimer(roomID,timestamp) 
  {
    // try
    // {
      writeToLog("INSIDE STOP WAITING TIMER 1",roomID,true);
      let isRoomExists = await CheckIfRoomExists(roomID);
      if(isRoomExists)
      {
        writeToLog("INSIDE STOP WAITING TIMER 2",roomID,false);
        let isGameStarted = await GetRoomVariable(roomID, "isGameStarted")
        GLOBALPARAMS.isLogs && console.log("##################### STOP WAITING TIMER ###########");

        if (!isGameStarted) 
        {
          writeToLog("INSIDE STOP WAITING TIMER 3",roomID,false);
          const isTournament = await GetRoomVariable(roomID,"isTournament");

          GLOBALPARAMS.isLogs && console.log("No Match Found isTournament "+isTournament);
          if(isTournament)
          {
            writeToLog("INSIDE STOP WAITING TIMER 4",roomID,false);
            GLOBALPARAMS.isLogs && console.log("roomID in no match found "+roomID);
            let isExistRoom = await MatchNotFoundData.KeyExistsInMongo(roomID,'roomID');
            GLOBALPARAMS.isLogs && console.log("isExistRoom "+isExistRoom);
            if(!isExistRoom)
            {
              writeToLog("INSIDE STOP WAITING TIMER 5",roomID,false);
              GLOBALPARAMS.isLogs && console.log("player qualified in no match found");

              const objectForMongo = {}
              objectForMongo.roomID =  roomID,
              objectForMongo.playerID = await GetRoomVariable(roomID,"firstJoinedPlayerID"),
              objectForMongo.playerName =  await GetRoomVariable(roomID,"firstJoinedPlayerName"),
              objectForMongo.tournamentID =  await GetRoomVariable(roomID,"tournament_id"),
              objectForMongo.roundEndTime =  await GetRoomVariable(roomID,"round_end_time"),
              objectForMongo.roundStartTime =  await GetRoomVariable(roomID,"round_start_time"),
              objectForMongo.roundCount =  await GetRoomVariable(roomID,"round_count");

              GLOBALPARAMS.isLogs && console.log('>>>>>>>>Match Not Found Object Object',JSON.stringify(objectForMongo));

              await SendWaitForNoMatchFound(roomID,"waitForNoMatchFound");

              await MatchNotFoundData.add(objectForMongo);

              let allRoomPlayerData = await GetAllPlayersInRoom(roomID, '', '');
              allRoomPlayerData[0].rank = 1
              await ApiManager.endGameApiCall(roomID,allRoomPlayerData);
              GLOBALPARAMS.isLogs && console.log(">>>>Api End data2")

              let tournamentNotMatchedObject = new Object();
              tournamentNotMatchedObject.roomID = roomID,
              tournamentNotMatchedObject.tournamentID = await GetRoomVariable(roomID,"tournament_id"),
              tournamentNotMatchedObject.roundNo = await GetRoomVariable(roomID,"round_count"),
              tournamentNotMatchedObject.isPlayerQualified =  true,
              tournamentNotMatchedObject.responseFromTournamentApi = await GetRoomVariable(roomID,"responseFromTournamentApi"),
              tournamentNotMatchedObject.tournamentNextRoundName = await GetRoomVariable(roomID,"tournamentNextRoundName"),
              tournamentNotMatchedObject.apiNotWorking = await GetRoomVariable(roomID,"apiNotWorking"),
              tournamentNotMatchedObject.isTournamentOver = await GetRoomVariable(roomID,"isTournamentOver"),
              tournamentNotMatchedObject.rank = "",
              tournamentNotMatchedObject.winAmount = "";

              if(tournamentNotMatchedObject.isTournamentOver)
              {
                writeToLog("INSIDE STOP WAITING TIMER 6",roomID,false);
                GLOBALPARAMS.isLogs && console.log("MATCH NOT FOUND tournamentNotMatchedObject.isTournamentOver q"+tournamentNotMatchedObject.isTournamentOver);
                let winAmountArray = await CreateRankWiseWinningArray(roomID);
                if(winAmountArray.length > 0)
                {
                  writeToLog("INSIDE STOP WAITING TIMER 7",roomID,false);
                  tournamentNotMatchedObject.winAmount = winAmountArray[0].price;
                  tournamentNotMatchedObject.rank = "1";
                }
                else
                {
                  writeToLog("INSIDE STOP WAITING TIMER 8",roomID,false);
                  GLOBALPARAMS.isLogs && console.log("tournamentOver win amount array is empty");
                }
                

              }
              else
              {
                writeToLog("INSIDE STOP WAITING TIMER 9",roomID,false);
                GLOBALPARAMS.isLogs && console.log("MATCH NOT FOUND tournamentNotMatchedObject.isTournamentOver else"+tournamentNotMatchedObject.isTournamentOver);
              }

              await SendTournamentMatchNotFound(roomID,tournamentNotMatchedObject);

              await DeleteRoom(roomID);
              writeToLog("INSIDE STOP WAITING TIMER 10",roomID,false);
              GLOBALPARAMS.isLogs && console.log("tournamant no matched player qualified "+JSON.stringify(tournamentNotMatchedObject));

            }
            else
            {
              writeToLog("INSIDE STOP WAITING TIMER 11",roomID,false);
              GLOBALPARAMS.isLogs && console.log("player not qualified in no match found");
              //player Not Qualified

              let tournamentNotMatchedObject = new Object();
              tournamentNotMatchedObject.roomID = roomID,
              tournamentNotMatchedObject.tournamentID = await GetRoomVariable(roomID,"tournament_id"),
              tournamentNotMatchedObject.roundNo = await GetRoomVariable(roomID,"round_count"),
              tournamentNotMatchedObject.isPlayerQualified =  false,
              tournamentNotMatchedObject.responseFromTournamentApi = "",
              tournamentNotMatchedObject.tournamentNextRoundName = "",
              tournamentNotMatchedObject.apiNotWorking = false,
              tournamentNotMatchedObject.isTournamentOver = false,
              tournamentNotMatchedObject.rank = "",
              tournamentNotMatchedObject.winAmount = "";


              await SendTournamentMatchNotFound(roomID,tournamentNotMatchedObject);
              GLOBALPARAMS.isLogs && console.log("tournamant no matched player not qualified "+JSON.stringify(tournamentNotMatchedObject));
              if(!isTournament)
              {
                await ApiManager.startGameApiCall(roomID, true);
              }
              await DeleteRoom(roomID);
              writeToLog("INSIDE STOP WAITING TIMER 12",roomID,false);
            }
          }
          else
          {
            writeToLog("INSIDE STOP WAITING TIMER 13",roomID,false);
            GLOBALPARAMS.isLogs && console.log(" SendTournamentMatchNotFound "+isTournament);
            await SendPlayerNotMatchedInfo(null, "openNotMatchPanel", roomID, true);
            if(!isTournament)
            {
              await ApiManager.startGameApiCall(roomID, true);
            }
            await DeleteRoom(roomID);
            writeToLog("INSIDE STOP WAITING TIMER 14",roomID,false);
          }
        }
        if(GLOBALPARAMS.isDisposeObjects)
        {
          isGameStarted = null;
        }
      }
      else
      {
        writeToLog("INSIDE STOP WAITING TIMER 15",roomID,false);
        writeToLog("StopWaitingTimer room not exists in stop waiting timer xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx ",roomID,true);
        // GLOBALPARAMS.isLogs && console.log("room not exists in stop waiting timer");
      }
      if(GLOBALPARAMS.isDisposeObjects)
      {
        isRoomExists = null;
      }
    // }
    // catch(error)
    // {
    //   console.log("player not matched error "+error);
    //   // writeToLog("ERROR StopWaitingTimer xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx "+error,roomID,true);
    // }
  }
  export async function StopTurnTimer(roomID,timestamp) 
  {
    let isRoomExists = await CheckIfRoomExists(roomID);

    if(isRoomExists)
    {
      let turnTimerStamp = await GetRoomVariable(roomID,"turnTimerTimeStamp");
      writeToLog("StopTurnTimer xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",roomID,true);
      writeToLog("StopTurnTimer  turnTimerStamp "+turnTimerStamp,roomID);
      writeToLog("StopTurnTimer  timestamp "+timestamp,roomID);
      writeToLog("StopTurnTimer  timestamp "+(timestamp === turnTimerStamp) + typeof timestamp + typeof turnTimerStamp +timestamp,roomID);
      GLOBALPARAMS.isLogs && console.log((timestamp === turnTimerStamp) + typeof timestamp + typeof turnTimerStamp +timestamp,roomID);

      if(timestamp.toString() === turnTimerStamp.toString())
      {
        writeToLog("StopTurnTimer xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 1",roomID);
        // GLOBALPARAMS.isLogs && console.log("stopTurnTimer call 0");
        let turnList = GetRoomTurnList(roomID);
        let currentTurnPlayerID = turnList.GetCurrentTurnPlayerData();
        let currentDiceNo = await GetRoomVariable(roomID,"currentDiceNo");
        let gameMode = await GetRoomVariable(roomID,"gameMode");
        let currentTurn = turnList.GetCurrentTurnPlayerData(roomID);

        if(GLOBALPARAMS.autoPlayEnabled)
        {
          if(currentDiceNo !== GLOBALPARAMS.diceMaxVal)
          {
            await UpdatePlayerAutoplayChances(roomID,currentTurnPlayerID);
            if(gameMode === GLOBALPARAMS.gameMode.MOVES)
            {
              //console.log("INSIDE StopTurnTimer 0");
              await UpdatePlayerMoves(roomID,currentTurn);
              await CreateAndSendRemainingMovesObject(roomID,currentTurn);
            }
          }
    
        }
        else
        {
          await UpdatePlayerAutoplayChances(roomID,currentTurnPlayerID);
          if(gameMode === GLOBALPARAMS.gameMode.MOVES )
          {
            //console.log("INSIDE StopTurnTimer 1");
            await UpdatePlayerMoves(roomID,currentTurn);
            await CreateAndSendRemainingMovesObject(roomID,currentTurn);
          }
        }

        await SetRoomVariable(roomID,"previousTurnId",currentTurn);

        let playerCurrentAutoPlayChances = await GetPlayerVariable(roomID,currentTurnPlayerID,"currentAutoplayChances");

        if(playerCurrentAutoPlayChances < 1)
        {
          let playerLeftObj = new Object();
          playerLeftObj.playerID = currentTurnPlayerID,
          playerLeftObj.roomID = roomID
          
          writeToLog("LEAVE GAME CALL FROM OUR SIDE WHEN AUTOPLAY CHANCES FINISHED "+JSON.stringify(playerLeftObj),playerLeftObj.roomID,false);
          //turnList.ChangeTurn(roomID);
          await LeaveGame(playerLeftObj);
          if(GLOBALPARAMS.isDisposeObjects)
          {
            playerLeftObj = null;
          }

          //await StartTurnTimer(roomID,0,false,true);
        }
        else
        {
          if(GLOBALPARAMS.autoPlayEnabled)
          {
            await StartAutoplay(roomID,currentTurnPlayerID);
          }
          else
          {
            turnList.ChangeTurn(roomID);
            await StartTurnTimer(roomID,0,false,true);
          }
        }

        if(GLOBALPARAMS.isDisposeObjects)
        {
          turnList = null;
          currentTurnPlayerID = null;
          playerCurrentAutoPlayChances = null;
          currentTurn = null;
          gameMode = null;
        }
      }
      else
      {
        GLOBALPARAMS.isLogs && console.log("Time stamp not matched"+timestamp);
        writeToLog("Time stamp not matched xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx "+timestamp,roomID,true);
      }
      if(GLOBALPARAMS.isDisposeObjects)
      {
        turnTimerStamp = null;
      }

    }
    else
    {
      writeToLog("StopTurnTimer xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx "+"room not exists in stopturnTimer",roomID,true);
      GLOBALPARAMS.isLogs && console.log("room not exists in stopturnTimer");
    }
    if(GLOBALPARAMS.isDisposeObjects)
    {
      isRoomExists = null;
    }
    
  }
  export async function StopDiceRolling(roomID,timestamp)
  {
    let turnList = GetRoomTurnList(roomID);
    let currentTurnPlayerID = turnList.GetCurrentTurnPlayerData();
    let playerSocketID = await GetPlayerVariable(roomID, currentTurnPlayerID, "socketID");
    let turnPlayerSocket = GetPlayerSocket(playerSocketID);
    
    if(turnPlayerSocket)
    { 
      await SendDiceRollDisableData(turnPlayerSocket,"false");
      GLOBALPARAMS.isLogs && console.log("stop dice rolling called");
    }
    else
    {
      GLOBALPARAMS.isLogs && console.log("socket is null");
    }
    if(GLOBALPARAMS.isDisposeObjects)
    {
      turnList = null;
      currentTurnPlayerID = null;
      playerSocketID  = null;
      turnPlayerSocket = null;
    }
    
    
  }
  //#endregion

  // #region Get Player Details Methods
  export async function GetPlayerVariable(roomID, playerID, variableKey) 
  {
    let getKEy = await redisClient.get(`${LUDO_ROOM_PLAYER_DATA}:${roomID}:${playerID}`)
    const convertJson = JSON.parse(getKEy)
    if(GLOBALPARAMS.isDisposeObjects)
    {
      getKEy = null;
    }
    return convertJson[variableKey]
  }
  export async function GetPlayersCount(roomID) 
  {
    const allPlayer = []
    let getData = await redisClient.keys(`${LUDO_ROOM_PLAYER_DATA}:${roomID}:*`)
    for (var item of getData) 
    {
      let oneRedData = await redisClient.get(item)
      allPlayer.push(JSON.parse(oneRedData))
      if(GLOBALPARAMS.isDisposeObjects)
      {
        oneRedData = null;
      }
    }
    GLOBALPARAMS.isLogs && console.log(allPlayer.length, "count of player");
    if(GLOBALPARAMS.isDisposeObjects)
    {
      getData = null;
    }
    return +allPlayer.length;
  }
  export async function GetOpponentsPlayersID(roomID,playerID)
  {
    const empty = [];
    try
    { 
      let getData = await redisClient.keys(`${LUDO_ROOM_PLAYER_DATA}:${roomID}:*`);
      const opponents = [];
      let playerExists = false;
      for (var item of getData) 
      {
        let player = await redisClient.get(item)
        let parsedPlayer = JSON.parse(player);
        if(parsedPlayer.playerID != playerID)
        {
          opponents.push(parsedPlayer.playerID);
        }
        else
        {
          playerExists = true;
        }
        
      }
      if(playerExists)
      {
        return opponents;
      }
      else
      {
        GLOBALPARAMS.isLogs && console.log("your player not exist in room in GetOpponentsPlayersID");
        return empty;
      }
    }
    catch(error)
    { 
      console.log("error in GetOpponentsPlayersID "+error);
      return empty;
    }
  }
  export async function GetAllPlayersInRoom(roomID, excludedPlayerID, myPlayerID) 
  {
    try 
    {
      let getData = await redisClient.keys(`${LUDO_ROOM_PLAYER_DATA}:${roomID}:*`);

      if (_.isEmpty(excludedPlayerID)) 
      {
        GLOBALPARAMS.isLogs && console.log(">>>>Hey0");
        if (_.isEmpty(myPlayerID)) 
        {
          GLOBALPARAMS.isLogs && console.log(">>>>Hey1");
          const allPlayer = []
          for (var item of getData) 
          {
            let oneRedData = await redisClient.get(item)
            allPlayer.push(JSON.parse(oneRedData));
            if(GLOBALPARAMS.isDisposeObjects)
            {
              oneRedData = null;
            }
          }
          if(GLOBALPARAMS.isDisposeObjects)
          {
            getData = null;
          }
          return sortedData(allPlayer)
        }
        else 
        {
          GLOBALPARAMS.isLogs && console.log(">>>>Hey2");
          const allPlayer = []
          for (var item of getData) 
          {
            let oneRedData = await redisClient.get(item)
            allPlayer.push(JSON.parse(oneRedData))
            if(GLOBALPARAMS.isDisposeObjects)
            {
              oneRedData = null;
            }
          }
          for (let i = 0; i < allPlayer.length; i++) 
          {
            if (!(allPlayer[i].playerID === myPlayerID)) 
            {
              allPlayer[i].socketID = "";
            }
          }
          if(GLOBALPARAMS.isDisposeObjects)
          {
            getData = null;
          }
          return sortedData(allPlayer)
        }
      }
      else 
      {
        GLOBALPARAMS.isLogs && console.log(">>>>Hey4");
        let allPlayer = []
        for (var item of getData) 
        {
          if (item.playerID === excludedPlayerID) 
          {
            let oneRedData = await redisClient.get(item)
            allPlayer.push(JSON.parse(oneRedData))
            if(GLOBALPARAMS.isDisposeObjects)
            {
              oneRedData = null;
            }
          }
        }
        const newArray = allPlayer.filter((x) => !(x.playerID === excludedPlayerID))
        if(GLOBALPARAMS.isDisposeObjects)
        {
          getData = null;
          allPlayer = null;
        }
        return sortedData(newArray)
      }
    }
    catch (error) 
    {
      GLOBALPARAMS.isLogs && console.log(error, "while saving player in redis");
    }
  }
  export async function GetPlayerInRoom(roomID, playerID)
  {
    let getData = await redisClient.get(`${LUDO_ROOM_PLAYER_DATA}:${roomID}:${playerID}`)
    const convertJson = JSON.parse(getData)
    if(GLOBALPARAMS.isDisposeObjects)
    {
      getData = null;
    }
    return convertJson
  }
  // #endregion

  // #region Get room Details Methods
  export async function GetRoomVariable(roomID, variableKey) 
  {
    let getData = await redisClient.keys(`${LUDO_ROOM}:${roomID}*`)
    let data = getData.find((data)=> data === `${LUDO_ROOM}:${roomID}`)
    let getKEy = await redisClient.get(data);
    const convertJson = JSON.parse(getKEy)
    
    if(GLOBALPARAMS.isDisposeObjects)
    {
      getData = null;
      data = null;
      getKEy = null;
    }
    return convertJson[variableKey]
  }
  // #endregion

  // #region Set Player Details Methods
  export async function SetPlayerVariable(roomID, playerID, variableKey, value) 
  {
    let getData = await redisClient.get(`${LUDO_ROOM_PLAYER_DATA}:${roomID}:${playerID}`)
    let data = JSON.parse(getData)
    data[variableKey] = value
    let convertedData = JSON.stringify(data)
    await redisClient.set(`${LUDO_ROOM_PLAYER_DATA}:${roomID}:${playerID}`, convertedData)
    await redisClient.expire(`${LUDO_ROOM_PLAYER_DATA}:${roomID}:${playerID}`, GLOBALPARAMS.TtlTimeForOneDays)
    if(GLOBALPARAMS.isDisposeObjects)
    {
      getData = null;
      data = null;
      convertedData = null;
    }
  }
  // #endregion

  // #region Set Room Details Methods
  export async function SetRoomVariable(roomID, variableKey, value) 
  {
    try 
    {
      let getData = await redisClient.get(`${LUDO_ROOM}:${roomID}`)
      let data = JSON.parse(getData)
      data[variableKey] = value
      let convertedData = JSON.stringify(data)
      await redisClient.set(`${LUDO_ROOM}:${roomID}`, convertedData)
      await redisClient.expire(`${LUDO_ROOM}:${roomID}`, GLOBALPARAMS.TtlTimeForOneDays)
      if(GLOBALPARAMS.isDisposeObjects)
      {
        getData = null;
        data = null;
        convertedData = null;
      }
    }
    catch (error) 
    {
      GLOBALPARAMS.isLogs && console.log(">>>>>>>>when set Room variable", error);
    }
  }
  // #endregion

  //#region Token Methods
  export async function createTokens(token,roomID,playerID,myPath) 
  {
    const tokenInArray = []
    let gameMode = await GetRoomVariable(roomID,"gameMode");
    let tokenPos = -1;
    let currentIndex = -1;
    let tokenStatus = GLOBALPARAMS.tokenStatus.AT_BASE;

    if((gameMode === GLOBALPARAMS.gameMode.MOVES)||(gameMode === GLOBALPARAMS.gameMode.QUICK)||(gameMode === GLOBALPARAMS.gameMode.TIMER))
    {
      tokenPos = myPath[0];
      currentIndex = 0;
      tokenStatus = GLOBALPARAMS.tokenStatus.AT_RUNNING;
    }

    let objAdd = 
    {
      "playerID":playerID,
      "roomID":roomID,
      "tokenStatus": tokenStatus,
      "tokenPosition": tokenPos,
      "isAtSafePosition": true,
      "currentIndex": currentIndex,
      "tokenPreviosPosition" : tokenPos,
    }
    
    token.map(tokenID => {
      return tokenInArray.push({ "tokenID": tokenID, ...objAdd });
    });

    if(GLOBALPARAMS.isDisposeObjects)
    {
      gameMode = null;
      tokenPos = null;
      currentIndex = null;
      tokenStatus = null;
      objAdd =  null;
    }
    return tokenInArray
  }
  export async function SetPlayerTokenObj(roomID, playerID, tokenID, value) 
  {
    try 
    {
      let getData = await redisClient.get(`${LUDO_ROOM_PLAYER_DATA}:${roomID}:${playerID}`)
      let data = JSON.parse(getData)
      let foundToken = data?.myTokens?.find(x => x.tokenID === tokenID)
      if(foundToken) 
      {
        let index = data.myTokens.indexOf(foundToken);
        data.myTokens[index] = value;
        if(GLOBALPARAMS.isDisposeObjects)
        {
          index = null;
        }
      }
      let jsonData = JSON.stringify(data)
      await redisClient.set(`${LUDO_ROOM_PLAYER_DATA}:${roomID}:${playerID}`, jsonData)
      await redisClient.expire(`${LUDO_ROOM_PLAYER_DATA}:${roomID}:${playerID}`, GLOBALPARAMS.TtlTimeForOneDays)
      if(GLOBALPARAMS.isDisposeObjects)
      {
        getData = null;
        data = null;
        foundToken = null;
        jsonData = null;
      }
    }
    catch (error) 
    {
      GLOBALPARAMS.isLogs && console.log(">>>>>>>>when set Player Token variable", error);
    }
  }
  export async function GetTokenFromPlayer(roomID, playerID, tokenID) 
  {
    try 
    {
      let getData = await redisClient.get(`${LUDO_ROOM_PLAYER_DATA}:${roomID}:${playerID}`)
      let data = JSON.parse(getData);
      if(GLOBALPARAMS.isDisposeObjects)
      {
        getData = null;
      }
      return data?.myTokens?.find(x => x.tokenID === tokenID)
    }
    catch (error) 
    {
      GLOBALPARAMS.isLogs && console.log(">>>>>>>>when Get Token From Player", error);
    }
  }
  export async function AssignPlayerToken(roomID,playerID,isNewlyCreatedRoom,myPath) 
  {

    const tokens = [];
    let currentlyAssignedTokensCount = await GetRoomVariable(roomID,"currentlyAssignedTokensCount");
    let noOfTokensPerPlayer = await GetRoomVariable(roomID,"noOfTokensPerPlayer");

    for(let i=0;i<noOfTokensPerPlayer;i++)
    {
      tokens.push(PLAYER_TOKENS_ID[currentlyAssignedTokensCount]);
      currentlyAssignedTokensCount++;
    }
    await SetRoomVariable(roomID,"currentlyAssignedTokensCount",currentlyAssignedTokensCount)
    
    if(GLOBALPARAMS.isDisposeObjects)
    {
      currentlyAssignedTokensCount = null;
      noOfTokensPerPlayer = null;
    }

    return await createTokens(tokens,roomID,playerID,myPath);
  }
  export async function GetPlayerTokenStatusArray(playerData,roomID,playerID,tokenStatus,getPositionsOnly) 
  {
    try 
    {
      if (!_.isEmpty(playerData)) 
      {
        let jsonString = JSON.parse(getSinglePlayer)
        const list = jsonString.myTokens.filter((x => x.tokenStatus === tokenStatus))
        if(GLOBALPARAMS.isDisposeObjects)
        {
          jsonString = null;
        }
        return list
      } 
      else 
      {
        let getSinglePlayer = await redisClient.get(`${LUDO_ROOM_PLAYER_DATA}:${roomID}:${playerID}`)
        let jsonString = JSON.parse(getSinglePlayer);
        const list = jsonString.myTokens.filter((x => x.tokenStatus === tokenStatus));
        let positionOnlyTokensList = [];
        if(getPositionsOnly)
        {
          for(let i=0;i<list.length;i++)
          {
            let currentToken = list[i];
            let tokenObj = new Object();
            tokenObj.tokenID = currentToken.tokenID,
            tokenObj.tokenPosition = currentToken.tokenPosition;
            positionOnlyTokensList.push(tokenObj);
          }
          
        }
        if(GLOBALPARAMS.isDisposeObjects)
        {
          getSinglePlayer = null;
          jsonString = null;
        }
        if(getPositionsOnly)
        {
          return positionOnlyTokensList;
        }
        else
        {
          return list
        }
        
      }
    } 
    catch (error) 
    {
       GLOBALPARAMS.isLogs && console.log('If player All token At base',error);
    }
  }
  export async function GetOpponentsTokensPositions(roomID,playerID) 
  {
    let allRoomPlayerData = await GetAllPlayersInRoom(roomID, '', '');
    let opponentsTokens = [];
    let count = 0;
    for (let item of allRoomPlayerData) 
    {
      count++;
      let playerTokenObject  = new Object();
      playerTokenObject[count] = [];

      for(let token of item.myTokens)
      {
        playerTokenObject[count].push(token.tokenPosition);
      }
      if(playerID != item.playerID)
      {
        //myTokens = playerTokenObject;
        opponentsTokens.push(playerTokenObject);
      }
    }

    if(GLOBALPARAMS.isDisposeObjects)
    {
      allRoomPlayerData = null;
    }
    return opponentsTokens;
  }
  export async function GetOpponentsAllTokensSumOfIndex(roomID,playerID) 
  {
    try {
      let allTokens = await GetPlayerVariable(roomID,playerID,'myTokens')
      let sumOfTokens = allTokens.reduce((sum, token) => sum + (token.currentIndex > -1 ? token.currentIndex : 0), 0);
      return sumOfTokens
    } catch (error) {
      console.log('Error in GetOpponentsAllTokensSumOfIndex',error)
    }
   
  }

  export async function GetAllPlayerTokens(roomID) 
  {
    let allRoomPlayerData = await GetAllPlayersInRoom(roomID, '', '');
    let alltoken = [];
    for (let item of allRoomPlayerData) 
    {
      alltoken.push(...item.myTokens)
    }
    if(GLOBALPARAMS.isDisposeObjects)
    {
      allRoomPlayerData = null;
    }
    return _.groupBy(alltoken, 'playerID')
  }
  export async function CheckIfTokenExistForPlayer(roomID, playerID, tokenID) 
  {
    try {
      const getData = await redisClient.get(`${LUDO_ROOM_PLAYER_DATA}:${roomID}:${playerID}`)
      let data = JSON.parse(getData);
      return data?.myTokens?.some(x => x.tokenID === tokenID) ? true : false
    }
    catch (error) 
    {
       GLOBALPARAMS.isLogs && console.log(">>>>>>>>when Get Token From Player", error);
       return false;
    }
  }


  //#endregion

  export async function AssignPathtoPlayer(roomID, isNewlyCreatedRoom,inconsistantDataJoinedPlayerCount,maxPlayerCount) 
  {
    let joinedPlayerCount;
    let roomMaxPlayersCount;
    GLOBALPARAMS.isLogs && console.log(roomID, isNewlyCreatedRoom,inconsistantDataJoinedPlayerCount,maxPlayerCount,"roomID, isNewlyCreatedRoom,inconsistantDataJoinedPlayerCount");

    if(inconsistantDataJoinedPlayerCount > 0)
    {
      joinedPlayerCount = inconsistantDataJoinedPlayerCount;
      GLOBALPARAMS.isLogs && console.log("Enter the tekken 1 "+joinedPlayerCount);
    }
    else
    {
      //joinedPlayerCount = await GetPlayersCount(roomID);
      if (isNewlyCreatedRoom) 
      {
        joinedPlayerCount = 0;
      }
      else 
      {
        joinedPlayerCount = await GetPlayersCount(roomID);
      }
    }

    if(!_.isEmpty(maxPlayerCount))
    {
      roomMaxPlayersCount = maxPlayerCount;
      GLOBALPARAMS.isLogs && console.log("Enter the tekken 2 "+roomMaxPlayersCount);
    }
    else
    {
      roomMaxPlayersCount = await GetRoomVariable(roomID,"roomMaxPlayerCount");
    }
    

    if (roomMaxPlayersCount > 2) 
    {
      GLOBALPARAMS.isLogs && console.log("Enter the tekken 3 ");
      if (joinedPlayerCount === 0) 
      {
        return MOVE_PATH[0]
      }
      if (joinedPlayerCount === 1) 
      {
        return MOVE_PATH[1]
      }
      if (joinedPlayerCount === 2) 
      {
        return MOVE_PATH[2]
      }
      if (joinedPlayerCount === 3) 
      {
        return MOVE_PATH[3]
      }
    } 
    else 
    {
       GLOBALPARAMS.isLogs && console.log("Enter the tekken 4 ");
      
      if (joinedPlayerCount === 0) 
      {
        GLOBALPARAMS.isLogs && console.log("Enter the tekken 5");
        return MOVE_PATH[0]
      }
      if (joinedPlayerCount === 1) 
      {
        GLOBALPARAMS.isLogs && console.log("Enter the tekken 6 ");
        return MOVE_PATH[2]
      }
    }
  } 
  export async function SetPlayerLeaveRank(roomID,playerID,callforGameOver)
  {
    let nextLeaveRankToBeGiven = await GetRoomVariable(roomID,'nextLeaveRankToBeGiven')
    GLOBALPARAMS.isLogs && console.log(nextLeaveRankToBeGiven,"Next Leave Give First");
    let playerRank =  await GetPlayerVariable(roomID,playerID,'rank')
    GLOBALPARAMS.isLogs && console.log(playerRank,"playerRank On Set Player Leave Rank");
    if(playerRank === 0)
    {
      if(nextLeaveRankToBeGiven === 1)
      {
        await SetPlayerVariable(roomID,playerID,'rank',nextLeaveRankToBeGiven);
      }
      else
      {
        await SetPlayerVariable(roomID,playerID,'rank',nextLeaveRankToBeGiven);
        nextLeaveRankToBeGiven--
      }
      GLOBALPARAMS.isLogs && console.log(nextLeaveRankToBeGiven,"nextLeaveRankToBeGiven");
      await SetPlayerVariable(roomID,playerID,'isPlayerPlaying',false)
      await SetRoomVariable(roomID,'nextLeaveRankToBeGiven',nextLeaveRankToBeGiven);
      GLOBALPARAMS.isLogs && console.log("TEST CheckForGameOver From SetPlayerLeaveRank");
      if(callforGameOver)
      {
        await CheckForGameOver(roomID);
      }
      
    }
    if(GLOBALPARAMS.isDisposeObjects)
    {
      nextLeaveRankToBeGiven = null;
      playerRank = null;
    }

  }
  export async function CheckForGameOver(roomID) 
  {
    try 
    {
      GLOBALPARAMS.isLogs && console.log("Enter inside CHECKFORGAMEOVER 0");
      let PlayerPlayingCount = await GetPlayingPlayers(roomID);
      let gameOver  = await GetRoomVariable(roomID,"isGameOver");
      await LudoAllData.updateField(roomID,"isGameOver",true)
      let isTimerModeTimerCompleted = await GetRoomVariable(roomID,"isTimerModeTimerCompleted");
      // const isTimerModeTimerCompleted = TIMER_MODE_TIMER_COMPLTED.get(roomID)
      let gameModeVar;
      try
      {
        gameModeVar = await GetRoomVariable(roomID,"gameMode");
      }
      catch (error)
      {
        GLOBALPARAMS.isLogs && console.log("error in gameMode "+error);
      }
      writeToLog("CheckForGameOver Timer Mode isTimerModeTimerCompleted" + isTimerModeTimerCompleted,roomID,true);
      if((PlayerPlayingCount.length < 2 || isTimerModeTimerCompleted) && !gameOver)
      {
        GLOBALPARAMS.isLogs && console.log("Enter inside CHECKFORGAMEOVER 1");
        await SetRoomVariable(roomID,"isGameOver",true);
        if(!_.isEmpty(PlayerPlayingCount))
        {
          GLOBALPARAMS.isLogs && console.log("Enter inside CHECKFORGAMEOVER 2");
          await SetPlayerLeaveRank(PlayerPlayingCount[0]?.roomID,PlayerPlayingCount[0]?.playerID,false)
          await SetPlayerWinRank(PlayerPlayingCount[0]?.roomID,PlayerPlayingCount[0]?.playerID,false)
        }
        if(gameModeVar === GLOBALPARAMS.gameMode.TIMER)
        {
          writeToLog("CheckForGameOver Timer Mode" + JSON.stringify(GLOBALPARAMS.gameMode.TIMER),roomID,true);
          GLOBALPARAMS.isLogs && console.log("Enter inside CHECKFORGAMEOVER 3");
          let timerTimeStamp = await GetRoomVariable(roomID,"timerModeTimeStamp");
          TimerManager.StopTimer(timerTimeStamp,roomID,TIMER_FUNCTIONS.STOP_TIMER_MODE_TIMER);
          if(GLOBALPARAMS.isDisposeObjects)
          {
            timerTimeStamp = null;
          }
        }
        setTimeout(async()=>
        {
          GLOBALPARAMS.isLogs && console.log("Enter inside CHECKFORGAMEOVER 4");
          const isTournament = await GetRoomVariable(roomID,"isTournament");
          GLOBALPARAMS.isLogs && console.log("GAMEOVER DATA isTournament"+isTournament);
          let datatoSend = await GetPlayersWinData(roomID);
          GLOBALPARAMS.isLogs && console.log(">>>>>>>>>>IsGame Tied datatoSend",datatoSend)
          if(isTournament)
          {
            const data = datatoSend.find((x) => x.isGameTied);
            GLOBALPARAMS.isLogs && console.log(">>>>>>>>>>IsGame Tied Data",data)
            if(!_.isEmpty(data)){
              GLOBALPARAMS.isLogs && console.log(">>>>>>>>>>dataGetTiedScoreGivingRank",datatoSend)
              datatoSend = await GetTiedScoreGivingRank(datatoSend)
            }
          }
          let gameOverData = new Object();
          gameOverData.winData = datatoSend,
          gameOverData.isTournament = isTournament,
          gameOverData.tournamentID = "",
          gameOverData.roundCount = "",
          gameOverData.responseFromTournamentApi = "",
          gameOverData.tournamentNextRoundName = "",
          gameOverData.apiNotWorking = "";
          
          await SendWaitForGameOverData(roomID,"waitForGameOver");
          await ApiManager.endGameApiCall(roomID,datatoSend);
          if(isTournament)
          {
            GLOBALPARAMS.isLogs && console.log("GAMEOVER DATA isTournament 1"+isTournament);
            gameOverData.tournamentID = await GetRoomVariable(roomID,"tournament_id"),
            gameOverData.roundCount = await GetRoomVariable(roomID,"round_count"),
            gameOverData.responseFromTournamentApi = await GetRoomVariable(roomID,"responseFromTournamentApi"),
            gameOverData.tournamentNextRoundName = await GetRoomVariable(roomID,"tournamentNextRoundName"),
            gameOverData.apiNotWorking = await GetRoomVariable(roomID,"apiNotWorking");
            await LudoAllData.updateField(roomID,"roundCount",gameOverData.roundCount)
            await LudoAllData.updateField(roomID,"tournamentID",gameOverData.tournamentID)
            await LudoAllData.updateField(roomID,"responseFromTournamentApi",gameOverData.responseFromTournamentApi)
            gameOverData.responseFromTournamentApi = JSON.parse(gameOverData.responseFromTournamentApi),
            // gameOverData.responseFromTournamentApi = gameOverData.responseFromTournamentApi,
            await LudoAllData.updateField(roomID,"tournamentNextRoundName",_.isEmpty(gameOverData.tournamentNextRoundName) ? 'final': gameOverData.tournamentNextRoundName)
            // console.log('>>>gameOverData_----------------------',JSON.stringify(gameOverData))
          }
          await SendGameOverInfo(roomID, gameOverData);
          GLOBALPARAMS.isLogs && console.log("GAMEOVER DATA "+JSON.stringify(gameOverData));
          await savePlayerInPlayerModal(datatoSend);
          writeToLog("CheckForGameOver xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" + JSON.stringify(gameOverData),roomID,true);
          DeleteMyRoomAssociatedTokens(roomID);
          DisconnectAllSocketsInARoom(roomID);
          if(GLOBALPARAMS.isDisposeObjects)
          {
            datatoSend = null;
          }
        },500);
        setTimeout(async()=>
        {
          GLOBALPARAMS.isLogs && console.log("Enter inside CHECKFORGAMEOVER 5");
          await DeleteRoom(roomID);
          if(GLOBALPARAMS.isDisposeObjects)
          {
            PlayerPlayingCount = null;
            gameOver = null;
            isTimerModeTimerCompleted = null;
            gameModeVar = null;
          }
        },2000);
      }
      else
      {
        GLOBALPARAMS.isLogs && console.log("Game Not Over yet.");
        GLOBALPARAMS.isLogs && console.log("Enter inside CHECKFORGAMEOVER 6");
        if(GLOBALPARAMS.isDisposeObjects)
        {
          PlayerPlayingCount = null;
          gameOver = null;
          isTimerModeTimerCompleted = null;
          gameModeVar = null;
        }
      }
    } 
    catch (error) 
    {
      //writeToLog("Error While CheckForGameOver xxxxxxxxxxxxxxxxxxxxxxxxxxxxx" + error,roomID)
      console.log("Error in check for game over "+error);
    }
  }
  export async function DeleteMyRoomAssociatedTokens(roomID)
  {
    for (const [key, value] of UNSAFE_TOKENS.entries()) {
      if (value.roomID === roomID) {
        UNSAFE_TOKENS.delete(key);
      }
    }
     GLOBALPARAMS.isLogs && console.log(UNSAFE_TOKENS,"Deleted UNSAFE_TOKENS Tokens");
  }
  export async function GetPlayersWinData(roomID) 
  {
    /*let tokenBreakup = await CreateRankWiseWinningArray(roomID)
    //  GLOBALPARAMS.isLogs && console.log(tokenBreakup,"tokenBreakup---");
    const allRoomPlayerData = await GetAllPlayersInRoom(roomID, '', '')
    // GLOBALPARAMS.isLogs && console.log(allRoomPlayerData,"allRoomPlayerData");
    const sortedData = allRoomPlayerData.sort((a, b) => a.rank - b.rank);
    //  GLOBALPARAMS.isLogs && console.log(sortedData,"sortedData");
    let allPlayerRank = []
      for (let index = 0; index < sortedData.length; index++) {
        let winnerObject = 
            {
              "isWon": (tokenBreakup[index].price > 0 || sortedData[index].rank === 1) ? true : false,
              "rank": sortedData[index].rank,
              "playerWonAmount": tokenBreakup[index],
              "playerID": sortedData[index].playerID,
              "playerName": sortedData[index].playerName,
              "isPlayerLeft": sortedData[index].isPlayerLeft,
              "roomID": sortedData[index].roomID,
              "playerImageID": sortedData[index].playerImageID,
              "noOfPlayers": await GetRoomVariable(sortedData[index].roomID,"roomMaxPlayerCount"),
              "gameMode":await GetRoomVariable(sortedData[index].roomID,"gameMode"),
              "score":sortedData[index].score,
            }
        allPlayerRank.push(winnerObject)
        await SetPlayerVariable(sortedData[index].roomID,sortedData[index].playerID,'playerWinData',winnerObject)
      }
      // GLOBALPARAMS.isLogs && console.log(allPlayerRank,"allrankPlayer");
      return allPlayerRank*/




    let tokenBreakup = await CreateRankWiseWinningArray(roomID);
    let gameMode = await GetRoomVariable(roomID,"gameMode");
    let allRoomPlayerData = await GetAllPlayersInRoom(roomID, '', '')

    if((gameMode === GLOBALPARAMS.gameMode.MOVES) || (gameMode === GLOBALPARAMS.gameMode.TIMER))
    { 
      let data = await assignScoreWiseRank(allRoomPlayerData,tokenBreakup)
      if(GLOBALPARAMS.isDisposeObjects)
      {
        tokenBreakup = null;
        gameMode = null;
        allRoomPlayerData = null;
      }
      return data
    }
    else
    {
      let sortedData = allRoomPlayerData.sort((a, b) => a.rank - b.rank);
      let allPlayerRank = []
        for (let index = 0; index < sortedData.length; index++) 
        {
          let winnerObject = {
                "isWon": (tokenBreakup[index].price > 0 || sortedData[index].rank === 1) ? true : false,
                "rank": sortedData[index].rank,
                "playerWonAmount": tokenBreakup[index],
                "playerID": sortedData[index].playerID,
                "playerName": sortedData[index].playerName,
                "isPlayerLeft": sortedData[index].isPlayerLeft,
                "roomID": sortedData[index].roomID,
                "playerImageID": sortedData[index].playerImageID,
                "noOfPlayers": await GetRoomVariable(sortedData[index].roomID,"roomMaxPlayerCount"),
                "gameMode":await GetRoomVariable(sortedData[index].roomID,"gameMode"),
                "score":sortedData[index].score,
                "isGameTied":false
          }
          if(winnerObject.rank == 1)
          {
           let socketID = await GetPlayerVariable(sortedData[index].roomID,sortedData[index].playerID,'socketID')
           await SetRoomVariable(roomID,'firstRankPlayerSocketID',socketID);
          }
          allPlayerRank.push(winnerObject)
          await SetPlayerVariable(sortedData[index].roomID,sortedData[index].playerID,'playerWinData',winnerObject);
          if(GLOBALPARAMS.isDisposeObjects)
          {
            winnerObject = null;
          }
        }
        if(GLOBALPARAMS.isDisposeObjects)
        {
          tokenBreakup = null;
          gameMode = null;
          allRoomPlayerData = null;
          sortedData = null;
        }
        // GLOBALPARAMS.isLogs && console.log(allPlayerRank,"allrankPlayer");
        return allPlayerRank
    }
  }
  export async function CreateRankWiseWinningArray(roomID) 
  {
    let noOfPlayers = await GetPlayersCount(roomID)
    let rankWiseWinningAmount = await GetRoomVariable(roomID,'rankWiseWinningAmount')
    let newArray = [];
    GLOBALPARAMS.isLogs && console.log(rankWiseWinningAmount,"rankWiseWinningAmount");
    rankWiseWinningAmount.map((obj) => 
    {
      let { rank, price } = obj;
      if (rank.split("-").length > 1) 
      {
        let [start, end] = rank.split(" ")[1].split("-");
        let splitRankWisePlayers = UtilityFunctions.splitRankWiseData(start, end, price);
        newArray.splice(start - 1, 0, ...splitRankWisePlayers);
        if(GLOBALPARAMS.isDisposeObjects)
        {
          start = null;
          end = null;
          splitRankWisePlayers = null;
        }
      } 
      else 
      {
        newArray.push(obj);
      }
      if(GLOBALPARAMS.isDisposeObjects)
      {
        rank = null;
        price = null;
      }
    });  
    if (newArray.length < noOfPlayers) 
    {
      for (let index = newArray.length; index < noOfPlayers; index++) 
      {
        newArray.push({
          image: "",
          price: "0",
          rank: `RANK ${index + 1}`,
        });
      }
    }
    if(GLOBALPARAMS.isDisposeObjects)
    {
      noOfPlayers = null;
      rankWiseWinningAmount = null;
    }
   
    return newArray;
  };
  export function GetWaitingTimeForMovement(perUnitMovementTime, unitsToMove) 
  {
    return +perUnitMovementTime * +unitsToMove
  }
  export async function GetPlayerTotalTokenAtHome(roomID,playerID)
  {
    let homeTokensCount = await GetPlayerVariable(roomID,playerID,"myTokens");
    let findHomeToken = homeTokensCount.filter(x=>x.tokenStatus === GLOBALPARAMS.tokenStatus.AT_HOME);
    if(GLOBALPARAMS.isDisposeObjects)
    {
      homeTokensCount = null;
    }
    return findHomeToken
  }
  export async function SetPlayerWinRank(roomID,playerID,callforGameOver)
  {
    let nextWinRankToBeGiven = await GetRoomVariable(roomID,'nextWinRankToBeGiven');
    let playerRank =  await GetPlayerVariable(roomID,playerID,'rank');
    GLOBALPARAMS.isLogs && console.log("SetPlayerWinRank ");
    GLOBALPARAMS.isLogs && console.log("nextWinRankToBeGiven "+nextWinRankToBeGiven);
    GLOBALPARAMS.isLogs && console.log("playerRank "+playerRank);

    if(playerRank === 0)
    {
      GLOBALPARAMS.isLogs && console.log("SetPlayerWinRank 1");
      if(nextWinRankToBeGiven === 4)
      {
        GLOBALPARAMS.isLogs && console.log("SetPlayerWinRank 2");
        await SetPlayerVariable(roomID,playerID,'rank',nextWinRankToBeGiven);
      }
      else
      {
        GLOBALPARAMS.isLogs && console.log("SetPlayerWinRank 3");
        await SetPlayerVariable(roomID,playerID,'rank',nextWinRankToBeGiven);
        nextWinRankToBeGiven++;
      }
      await SetRoomVariable(roomID,'nextWinRankToBeGiven',nextWinRankToBeGiven);
      await SetPlayerVariable(roomID,playerID,'isPlayerPlaying',false);
      
      if(callforGameOver)
      {
        GLOBALPARAMS.isLogs && console.log("SetPlayerWinRank 4");
        await CheckForGameOver(roomID);
      }
      if(GLOBALPARAMS.isDisposeObjects)
      {
        nextWinRankToBeGiven = null;
        playerRank= null;
      }
      
    }
  }
  export async function UpdatePlayerAutoplayChances(roomID,playerID)
  {
    let playerCurrentAutoPlayChances = await GetPlayerVariable(roomID,playerID,"currentAutoplayChances");

    writeToLog("playerCurrentAutoPlayChances=##########################--"+playerCurrentAutoPlayChances,roomID);

    playerCurrentAutoPlayChances--;

    writeToLog("playerCurrentAutoPlayChances=##########################--Decrease"+playerCurrentAutoPlayChances,roomID)
    
    await SetPlayerVariable(roomID,playerID,"currentAutoplayChances",playerCurrentAutoPlayChances);
    await SetRoomVariable(roomID,"lastTurnPlayerMissedChance",playerID);

    let remainingAutoplayChancesObj = new Object();
    remainingAutoplayChancesObj.playerID = playerID,
    remainingAutoplayChancesObj.currentAutoplayChances = playerCurrentAutoPlayChances;

    writeToLog("playerCurrentAutoPlayChances=##########################--Sending Data To Unity"+JSON.stringify(remainingAutoplayChancesObj),roomID)
    await SendRemainingAutoplayChances(roomID,remainingAutoplayChancesObj);

  }
  export async function UpdatePlayerMoves(roomID,playerID)
  {
    const playerData = await GetPlayerInRoom(roomID,playerID);
    
    let currentMovesLeft  = await GetPlayerVariable(roomID,playerID,"currentMovesLeft");
    currentMovesLeft-- ;
    
    await SetPlayerVariable(roomID,playerID,"currentMovesLeft",currentMovesLeft);
    let areAllPlayersMovesFinished = await AllPlayersMovesFinished(roomID);

    if(currentMovesLeft === 0)
    {
      await SetPlayerVariable(roomID,playerID,"isPlayerPlaying",false);
    }
    if(areAllPlayersMovesFinished)
    {
      await CheckForGameOver(roomID);
    }
    if(GLOBALPARAMS.isDisposeObjects)
    {
      currentMovesLeft = null;
      areAllPlayersMovesFinished = null;
    }
  }
  export async function UpdatePlayerScore(roomID,playerID,UpdationVal,addition)
  {
    let currentPlayerScore = await GetPlayerVariable(roomID,playerID,"score");
    if(addition)
    {
      currentPlayerScore += UpdationVal;
    }
    else
    {
      currentPlayerScore -= UpdationVal;
    }
    await SetPlayerVariable(roomID,playerID,"score",currentPlayerScore);
    if(GLOBALPARAMS.isDisposeObjects)
    {
      currentPlayerScore = null;
    }
  }
  export async function GetPlayingPlayers(roomID)
  {
    let allRoomPlayerData = await GetAllPlayersInRoom(roomID, '', '');
    let isPlayerPlaying  = allRoomPlayerData.filter(x=>x.isPlayerPlaying);
    if(GLOBALPARAMS.isDisposeObjects)
    {
      allRoomPlayerData = null;
    }
    return isPlayerPlaying
  }
  export async function GetPlayerMovableTokens(roomID,playerID,diceValue,getPositionsOnly)
  {
    let singlePlayer  = await GetPlayerInRoom(roomID,playerID);
    let playerPath = singlePlayer.myPath;
    let movableTokensList = [];
    let positionOnlyTokensList = [];

    GLOBALPARAMS.isLogs && console.log("TOTAL TOKENS "+singlePlayer.playerName+" HAVE "+singlePlayer.myTokens.length);
    for(let i=0;i<singlePlayer.myTokens.length;i++)
    {
       GLOBALPARAMS.isLogs && console.log("singlePlayer.myTokens[i].tokenStatus "+singlePlayer.myTokens[i].tokenStatus);
      if(singlePlayer.myTokens[i].tokenStatus === GLOBALPARAMS.tokenStatus.AT_RUNNING)
      {
        
        let currentToken = singlePlayer.myTokens[i];
        let currentIndex = parseInt(currentToken.currentIndex);
        let diceVal = parseInt(diceValue);
        
        currentIndex += diceVal;

        if(currentIndex <= GLOBALPARAMS.tokenPathLastIndex)
        {
          if(getPositionsOnly)
          {
            let tokenObj = new Object();
            tokenObj.tokenID = currentToken.tokenID,
            tokenObj.tokenPosition = currentToken.tokenPosition;
            positionOnlyTokensList.push(tokenObj);
          }
          else
          {
            let tokenPosition = playerPath[currentIndex];
            if(SAFE_ZONES.has(tokenPosition + currentToken.tokenID + currentToken.roomID))
            {
              currentToken.isAtSafePosition = true;
            }
            else
            {
              currentToken.isAtSafePosition = false;
            }
            
            movableTokensList.push(currentToken);
            if(GLOBALPARAMS.isDisposeObjects)
            {
              tokenPosition = null;
            }
          }
          
        }
        if(GLOBALPARAMS.isDisposeObjects)
        {
          currentToken = null;
          currentIndex = null;
          diceVal = null;
        }
      }
      
    }
    if(GLOBALPARAMS.isDisposeObjects)
    {
      singlePlayer = null;
      playerPath = null;
    }
    
    if(getPositionsOnly)
    {
      return positionOnlyTokensList;
    }
    else
    {
      return movableTokensList;
    }
    
  }
  export const AllPlayersMovesFinished = async (roomID) => 
  {
    let allRoomPlayerData = await GetAllPlayersInRoom(roomID, '', '');
    const data = allRoomPlayerData.find((data) => data.currentMovesLeft > 0) ? false : true
    if(GLOBALPARAMS.isDisposeObjects)
    {
      allRoomPlayerData = null;
    }
    return data
  }
  export const assignScoreWiseRank = async (data,tokenBreakup) => 
  {
    const returnArray = []
    const playingData1 = data.filter((data)=>!data.isPlayerLeft)
    if(!_.isEmpty(playingData1))
    {
      const flattenedData = [].concat(...playingData1);
      const  sortedData = flattenedData.sort((a, b) => b.score - a.score);
       GLOBALPARAMS.isLogs && console.log(sortedData,"sortedData")
      let rank = 1;
      sortedData[0].rank = 1;
      for (let i = 1; i < sortedData.length; i++) {
        if (sortedData[i].score === sortedData[i - 1].score) {
          sortedData[i].rank = sortedData[i - 1].rank;
        } else {
          rank++;
          sortedData[i].rank =  rank;
        }
      }
      returnArray.push(...playingData1)
      const leftData = data.filter((data)=>data.isPlayerLeft)
      const  sortedLeftData = leftData.sort((a, b) => b.score - a.score);
      const leftDataArray = []
      for(var index = 0 ;sortedLeftData.length > index ; index++){
        var obj = {
            "isWon": false,
            "rank": +rank + +index+1,
            "playerWonAmount": null,
            "playerID": sortedLeftData[index].playerID,
            "playerName": sortedLeftData[index].playerName,
            "isPlayerLeft": sortedLeftData[index].isPlayerLeft,
            "roomID": sortedLeftData[index].roomID,
            "playerImageID": sortedLeftData[index].playerImageID,
            "noOfPlayers": await GetRoomVariable(sortedLeftData[index].roomID,"roomMaxPlayerCount"),
            "gameMode":await GetRoomVariable(sortedLeftData[index].roomID,"gameMode"),
            "score":sortedLeftData[index].score,
        }
        if(obj.rank == 1)
        {
          socketID = await GetPlayerVariable(sortedData[index].roomID,sortedData[index].playerID,'socketID')
          await SetRoomVariable(roomID,'firstRankPlayerSocketID',socketID);
        }
        leftDataArray.push(obj)
        const sameScoreData = hasSameScore(leftDataArray)
        //  GLOBALPARAMS.isLogs && console.log(sameScoreData,"sameScoreData",!_.isEmpty(leftData))
        if(!_.isEmpty(leftData)){
          for(let item of leftDataArray){
            item.isGameTied = false
          }
        }else{
          if(sameScoreData){
            GLOBALPARAMS.isLogs && console.log("Am i 2")
            for(let item of leftDataArray){
              item.isGameTied = true;
            }
          }else{
            for(let item of leftDataArray){
              item.isGameTied = false
            }
          }
        }
      }
      
      returnArray.push(...leftDataArray)
      let createdObject = [];
      for (let i = 0; i < returnArray.length; i++) 
      {
          if (returnArray[i].rank == 1) 
          {
            returnArray[i].isWon = true;
          }
          else
          {
            returnArray[i].isWon = false;
          }
          GLOBALPARAMS.isLogs && console.log("enter2")
          var obj = {
            "isWon": returnArray[i].isWon,
            "rank": returnArray[i].rank,
            "playerWonAmount": tokenBreakup[+returnArray[i].rank-1],
            "playerID": returnArray[i].playerID,
            "playerName": returnArray[i].playerName,
            "isPlayerLeft": returnArray[i].isPlayerLeft,
            "roomID": returnArray[i].roomID,
            "playerImageID": returnArray[i].playerImageID,
            "noOfPlayers": await GetRoomVariable(returnArray[i].roomID,"roomMaxPlayerCount"),
            "gameMode":await GetRoomVariable(returnArray[i].roomID,"gameMode"),
            "score":returnArray[i].score,
          }
        if(obj.rank == 1)
        {
          let socketID = await GetPlayerVariable(obj.roomID,obj.playerID,'socketID')
          await SetRoomVariable(obj.roomID,'firstRankPlayerSocketID',socketID);
        }
        createdObject.push(obj)
      }
      const sameScoreData = hasSameScore(createdObject)
      if(!_.isEmpty(leftData))
      {
        for(let item of createdObject)
        {
          item.isGameTied = false
        }
      }
      else
      {
        if(sameScoreData)
        {
          const JoiningAmount = await GetRoomVariable(sortedData[0].roomID,'gameJoinAmount')
          const gameMode = await GetRoomVariable(sortedData[0].roomID,'gameMode')
          const obj = { image: '', price: JoiningAmount, rank: 'Rank 1' }
          GLOBALPARAMS.isLogs && console.log('gameMode === GLOBALPARAMS.gameMode.MOVES',gameMode === GLOBALPARAMS.gameMode.MOVES)
          GLOBALPARAMS.isLogs && console.log("Am i 1")
          for(let item of createdObject)
          {
            item.isGameTied = true
            if(gameMode === GLOBALPARAMS.gameMode.MOVES){
              item.playerWonAmount = obj
            }
          }
        }
        else
        {
          for(let item of createdObject)
          {
            item.isGameTied = false
          }
        }
      }
      return createdObject.sort((a, b) => a.rank - b.rank)
    }
    else
    {
      const leftDataArray = []
      const allPlayerLeftData = data.filter((data)=>data.isPlayerLeft)
      const  sortedLeftData = allPlayerLeftData.sort((a, b) => b.score - a.score);
      for(var index = 0 ;sortedLeftData.length > index ; index++){
        GLOBALPARAMS.isLogs && console.log("enter3")
        var obj = {
            "isWon": false,
            "rank": 0,
            "playerWonAmount": null,
            "playerID": sortedLeftData[index].playerID,
            "playerName": sortedLeftData[index].playerName,
            "isPlayerLeft": sortedLeftData[index].isPlayerLeft,
            "roomID": sortedLeftData[index].roomID,
            "playerImageID": sortedLeftData[index].playerImageID,
            "noOfPlayers": await GetRoomVariable(sortedLeftData[index].roomID,"roomMaxPlayerCount"),
            "gameMode":await GetRoomVariable(sortedLeftData[index].roomID,"gameMode"),
            "score":sortedLeftData[index].score,
        }
        leftDataArray.push(obj)
      }
      const sameScoreData = hasSameScore(leftDataArray)
      if(sameScoreData){
        for(let item of leftDataArray){
          item.isGameTied = true
        }
      }else{
        for(let item of leftDataArray){
          item.isGameTied = false
        }
      }
      return leftDataArray
    }
  }
  export async function CheckForDataInconsistancy(roomID) 
  {
    try
    {
      let playerInRooms = await GetAllPlayersInRoom(roomID);
      function haveSameBaseID(playerInRooms)
      {
        let baseIDCount = new Map();
      
        for (const item of playerInRooms) 
        {
          let baseID = item.baseID;
          if (baseIDCount.has(baseID)) 
          {
            if(GLOBALPARAMS.isDisposeObjects)
            {
              baseID = null;
              baseIDCount = null;
              playerInRooms = null;
            }
            return true;
          }
          baseIDCount.set(baseID, true);
          if(GLOBALPARAMS.isDisposeObjects)
          {
            baseID = null;
          }
        }
        if(GLOBALPARAMS.isDisposeObjects)
        {
          baseIDCount = null;
          playerInRooms = null;
        }
        return false;
      }
      
      let result = haveSameBaseID(playerInRooms);
      if(result)
      {
        DeleteTurnList(roomID);
        let turnList = new TurnList();
        SetRoomTurnList(roomID,turnList);
        GLOBALPARAMS.isLogs && console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< DATA IS INCONSISTANT  >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
        
        for(let i = 0 ; playerInRooms.length > i ; i++)
        {
          let path = await AssignPathtoPlayer(roomID,true,i,playerInRooms.length);
          GLOBALPARAMS.isLogs && console.log("path "+path);
          await SetPlayerVariable(roomID,playerInRooms[i].playerID,"myPath",path);
          await SetPlayerVariable(roomID,playerInRooms[i].playerID,"joinOrderofPlayer",i+1);
          await SetPlayerVariable(roomID,playerInRooms[i].playerID,"baseID",path[0]);
          turnList.AppendNode(playerInRooms[i].playerID);
          if(GLOBALPARAMS.isDisposeObjects)
          {
            path = null;
          }
        }
        if(GLOBALPARAMS.isDisposeObjects)
        {
          turnList = null;
        }

      }
      else
      {
        GLOBALPARAMS.isLogs && console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< DATA IS OK  >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
      }
      writeToLog("CheckForDataInconsistancy xxxxxxxxxxxxxxxxxxxxxxxxxxxxx is dataINCONSISTANT "+result,roomID,true);
      if(GLOBALPARAMS.isDisposeObjects)
      {
        result = null;
        playerInRooms = null;
        baseIDCount = null;
      }
      return false;
    }
    catch(error)
    {
      writeToLog("ERROR CheckForDataInconsistancy xxxxxxxxxxxxxxxxxxxxxxxxxxxxx "+error,roomID,true);
    }
      
      /*if(result)
      {
        DeleteTurnList(roomID);
        const turnList = new TurnList();
        SetRoomTurnList(roomID,turnList);
        GLOBALPARAMS.isLogs && console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< DATA IS INCONSISTANT  >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
        for(let i = 0 ; playerInRooms.length > i ; i++)
        {
          const path = await AssignPathtoPlayer(roomID,true,i,playerInRooms.length);
          GLOBALPARAMS.isLogs && console.log("path "+path);
          await SetPlayerVariable(roomID,playerInRooms[i].playerID,"myPath",path);
          await SetPlayerVariable(roomID,playerInRooms[i].playerID,"joinOrderofPlayer",i+1);
          await SetPlayerVariable(roomID,playerInRooms[i].playerID,"baseID",path[0]);
          turnList.AppendNode(playerInRooms[i].playerID);
        }

      }
      else
      {
        GLOBALPARAMS.isLogs && console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< DATA IS OK  >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
      }*/
  }
  const sortedData = (data) => 
  {
    return data.sort((a, b) => a.joinOrderofPlayer - b.joinOrderofPlayer)
  }
  export const hasSameScore = (data) => 
  {
    let uniqueScores = new Set();
    
    for (const user of data) 
    {
      if (uniqueScores.has(user.score)) 
      {
        if(GLOBALPARAMS.isDisposeObjects)
        {
          uniqueScores = null;
        }
        return true; // Found the same score
      }
      uniqueScores.add(user.score);
    }
    if(GLOBALPARAMS.isDisposeObjects)
    {
      uniqueScores = null;
    }

    return false; // No same score found

  }
  export async function GetAnotherPlayerID(roomID,playerID)
  {
    let gameMaxPlayerCount = await GetRoomVariable(roomID,"roomMaxPlayerCount");
    if(gameMaxPlayerCount == 2)
    {
      let playerInRooms = await GetAllPlayersInRoom(roomID);
      let otherPlayerID = "";
      for (const item of playerInRooms) 
      {
        otherPlayerID = item.playerID;
        if (otherPlayerID != playerID) 
        {
          break;
        }
      }
      if(GLOBALPARAMS.isDisposeObjects)
      {
        gameMaxPlayerCount = null;
      }
      return  otherPlayerID;
    }
    else
    {
      GLOBALPARAMS.isLogs && console.log("PLAYER LIMIT EXCEEDS");
    }
  }
  export const GetEachPlayerTokens = async (roomID,playerID) => {
    let getData = await redisClient.get(`${LUDO_ROOM_PLAYER_DATA}:${roomID}:${playerID}`)
    const convertJson = JSON.parse(getData).myTokens
    if(GLOBALPARAMS.isDisposeObjects)
    {
      getData = null;
    }
    return convertJson
}
export const EachLeftPlayerTokensDelete = async (roomID,playerID) =>{
  const arrayofTokens  = await GetEachPlayerTokens(roomID,playerID)
  for(var item of arrayofTokens)
  {
        const objAdd = {
          "tokenID": item.tokenID,
          "playerID": item.playerID,
          "roomID": item.roomID,
          "tokenStatus": GLOBALPARAMS.tokenStatus.AT_BASE,
          "tokenPosition": -1,
          "isAtSafePosition": true,
          "currentIndex": -1,
          "tokenPreviosPosition": item.tokenPosition,
      }
      SetPlayerTokenObj(objAdd.roomID, objAdd.playerID, objAdd.tokenID, objAdd)
  }
}

export const GetTiedScoreGivingRank = async (dataToSend) => {
  try {
    let firstLossing = true
  let tokenBreakup = await CreateRankWiseWinningArray(dataToSend[0].roomID);
  GLOBALPARAMS.isLogs && console.log('>>>>tokenBreakup',tokenBreakup)
  
  let lastTurnPlayerMissedChance = await GetRoomVariable(dataToSend[0].roomID,"lastTurnPlayerMissedChance");
  let currentRoundName = await GetRoomVariable(dataToSend[0].roomID,"currentRoundName");
  GLOBALPARAMS.isLogs && console.log('lastTurnPlayerMissedChance',lastTurnPlayerMissedChance)
  if(_.isEmpty(lastTurnPlayerMissedChance)){
    for (var item of dataToSend) 
    {
        let playerCurrentAutoPlayChances = await GetPlayerVariable(item.roomID,item.playerID,"currentAutoplayChances");
        if(firstLossing){
          if(playerCurrentAutoPlayChances > 0) {
            const obj = { image: '', price: tokenBreakup[1].price, rank: 'RANK 2' }
            item.rank = 2
            item.isWon = false
            firstLossing = false
            item.playerWonAmount = obj
          }else {
            item.isWon = true
            if(currentRoundName != 'Final'){
              const obj = { image: '', price: 0, rank: 'RANK 1' }
              item.playerWonAmount = obj
            }else{
              const obj = { image: '', price: tokenBreakup[0].price, rank: 'RANK 1' }
              item.playerWonAmount = obj
            }
            item.rank = 1
          }
        }else {
          if(currentRoundName != 'Final'){
            const obj = { image: '', price: 0, rank: 'RANK 1' }
            item.playerWonAmount = obj
          }else{
            const obj = { image: '', price: tokenBreakup[0].price, rank: 'RANK 1' }
            item.playerWonAmount = obj
          }
        }
        item.isGameTied = false
      }
      return dataToSend.sort((a, b) => a.rank - b.rank)
  }else{
    // console.log('>>>>>>>>>>>>> Calling Last Turn Player Missed Chance')
    // for (var item of dataToSend) 
    // {
    //   console.log('item>>>>>>>>>>>item',item)
    //   if(item.playerID === lastTurnPlayerMissedChance){
    //     const obj = { image: '', price: tokenBreakup[1].price, rank: 'RANK 2' }
    //     item.rank = 2
    //     item.isWon = false
    //     firstLossing = false
    //     item.isGameTied = false
    //     item.playerWonAmount = obj
    //     console.log('?>>>>>>latturnPlayerMissedChance',lastTurnPlayerMissedChance,item)
    //     }else{
    //       item.isWon = true
    //       if(currentRoundName != 'Final'){
    //         const obj = { image: '', price: 0, rank: 'RANK 1' }
    //         item.playerWonAmount = obj
    //         item.isGameTied = false
    //         console.log("item1 ",item)
    //       }else{
    //         const obj = { image: '', price: tokenBreakup[0].price, rank: 'RANK 1' }
    //         item.playerWonAmount = obj
    //         item.isGameTied = false
    //         console.log("item244 ",item)
    //       }
    //     item.rank = 1
    //     console.log(">>>>poppoppitem",item)
    //   }
    //   item.isGameTied = false
    //   console.log('>>>dataToSend',dataToSend)
    //   return dataToSend.sort((a, b) => a.rank - b.rank)
    // }
    for (var item of dataToSend) 
    {
        if(firstLossing){
          if(item.playerID === lastTurnPlayerMissedChance) {
            const obj = { image: '', price: tokenBreakup[1].price, rank: 'RANK 2' }
            item.rank = 2
            item.isWon = false
            firstLossing = false
            item.playerWonAmount = obj
          }else {
            item.isWon = true
            if(currentRoundName != 'Final'){
              const obj = { image: '', price: 0, rank: 'RANK 1' }
              item.playerWonAmount = obj
              GLOBALPARAMS.isLogs && console.log("item1 ",item)
            }else{
              const obj = { image: '', price: tokenBreakup[0].price, rank: 'RANK 1' }
              GLOBALPARAMS.isLogs && console.log('>>>>playerCurrentAutoPlayChances > 0)FinalOne',tokenBreakup[0].price)
              item.playerWonAmount = obj
              GLOBALPARAMS.isLogs && console.log("item2 ",item)
            }
            item.rank = 1
          }
        }else {
          if(currentRoundName != 'Final'){
            const obj = { image: '', price: 0, rank: 'RANK 1' }
            item.playerWonAmount = obj
            GLOBALPARAMS.isLogs && console.log('>>>Item 3',item)
          }else{
            const obj = { image: '', price: tokenBreakup[0].price, rank: 'RANK 1' }
            GLOBALPARAMS.isLogs && console.log('>>>>playerCurrentAutoPlayChances > 0)Final333',tokenBreakup[0].price)
            item.playerWonAmount = obj
            GLOBALPARAMS.isLogs && console.log('>>>Item 4',item)
          }
        }
        item.isGameTied = false
      }
      GLOBALPARAMS.isLogs && console.log(">>>>>>>>>>dataGetTiedScoreGivingRank2222",dataToSend)
      return dataToSend.sort((a, b) => a.rank - b.rank)
  }
  } catch (error) {
    console.log('>>>>>>Error while Get tied Case',error)
  }
}
export const GetProfileOfEachPlayer = async (playerID,gameMode) => {
  const data = await Player.GetAllPlayerDataByPlayerID(playerID,gameMode)
  return data
}

export const GetUserDetailsFromRedis = async (playerID) => {
  let userDetailsDoj = await redisClientWeb11.get(`${CHECK_FOR_USER_DETAILS}${playerID}`);
  userDetailsDoj = JSON.parse(userDetailsDoj)
  let userDetails = userDetailsDoj && userDetailsDoj.created && userDetailsDoj.created.substr(0, 4)
  return  userDetails ? userDetails : '2021'
}
