import _ from 'lodash'
import { CanJoinRoom, CheckIfGameExists, CheckIfJoinedPlayerGameStarted, CheckIfJoinedPlayerWaitingTimerStarted, CheckIfPlayerExistInRoom, CheckIfRoomExists, DeleteRoom, GetRoomTurnList, SetRoomTurnList, getRoomPlayerData } from "./roomsManager.js"
import { SendAuthsStatus, SendContestCancelled, SendCurrentGameState, SendGameAlreadyCompletedInfo, SendGameAlreadyStartedInfo, SendPlayerLeftData, SendPlayerMovableTokensData, SendPlayerNotMatchedInfo, SendPlayerWaitingTimerFinished, SendReconnectionData, SendRoomJoinedInfo, SendSomenthingWentWrongStatus, SendStartGameCall, SendTimerModeRemainingTime, SendTournamentMatchNotFound, SendWaitingTimeReconnectionData } from "../listenersAndEmitters/emitters.js"
import { AssignPathtoPlayer, AssignPlayerToken, CheckForDataInconsistancy, EachLeftPlayerTokensDelete, GetAllPlayersInRoom, GetOpponentsPlayersID, GetPlayerMovableTokens, GetPlayerTokenStatusArray, GetPlayerTotalTokenAtHome, GetPlayerVariable, GetPlayersCount, GetProfileOfEachPlayer, GetRoomVariable, SetPlayerLeaveRank, SetPlayerVariable, SetRoomVariable, StartTimerModeTimer, StartTurnTimer, StartWaitingTimer } from "../common/room.js"
import timerManager from "./TimerManager.js";
import redisClient from '../config/redisClient.js';
import { API_ERROR_CODES, CHECK_FOR_USER_ID_AUTH, DEFAULT_RANKING, GLOBALPARAMS, JOINING_OBJECT_CLASSES, LUDO_ROOM, LUDO_ROOM_PLAYER_DATA, TIMER_FUNCTIONS, TIMER_MODE_TIMER_COMPLTED } from '../common/gameConstants.js';
import TurnList from "../utils/TurnList.js";
import ApiManager from './apiManager.js';
import TimerManager from './TimerManager.js';
import { DisconnectSocket, JoinPlayerSocketInARoom  } from './socketManager.js';
import UtilityFunctions, { DeleteJoiningObjectClass, isValidObjectId } from '../utils/utilityFunctions.js';
import LudoAllData from '../mongoModels/logsModel.js';
import { roomLogs, writeToLog } from '../logs/loggerManager.js';
import JoiningObjectClass from '../utils/joiningObjectClass.js';
import redisClientWeb11 from '../config/redisClientForWeb11.js';
import AuthModel from '../mongoModels/authModel.js';
import MatchNotFoundData from '../mongoModels/matchNotFoundModel.js';


//ListnerMethods


export async function JoinGame(socket,joiningObject,io)
{
    GLOBALPARAMS.isLogs && console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$ JOIN GAME ENTER ");
    try
    {
        writeToLog("JOINING Game First OBJECT"+JSON.stringify(joiningObject),joiningObject.roomID)
        // console.log("joiningObject>>> Game First Object",joiningObject);
        GLOBALPARAMS.isLogs && console.log("SOCKETID "+socket.id);
        
        let roomExists = await CheckIfRoomExists(joiningObject.roomID);
       
        if (!roomExists)
        {
            GLOBALPARAMS.isLogs && console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$ ROOM NOT EXITS");
            
            // check if player game is already started
            if (!JOINING_OBJECT_CLASSES.has(joiningObject.roomID) && !CheckIfJoinedPlayerGameStarted(joiningObject) && !CheckIfJoinedPlayerWaitingTimerStarted(joiningObject)) 
            {
                
                GLOBALPARAMS.isLogs && console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$ new room created");
                let joiningClass = new JoiningObjectClass();
                JOINING_OBJECT_CLASSES.set(joiningObject.roomID,joiningClass);
                await CreateNewRoom(io,socket,joiningObject);
                if(GLOBALPARAMS.isDisposeObjects)
                {
                    joiningClass = null;
                }
                
                
            }
            else if(CheckIfJoinedPlayerWaitingTimerStarted(joiningObject) && !await CheckIfGameExists(joiningObject.roomID,joiningObject.playerID,joiningObject.roomMaxPlayerCount))
            {
                GLOBALPARAMS.isLogs && console.log("CheckIfJoinedPlayerWaitingTimerStarted(joiningObject) "+CheckIfJoinedPlayerWaitingTimerStarted(joiningObject));
                GLOBALPARAMS.isLogs &&console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$ match not found");
                const objectForMongo = {}
                objectForMongo.roomID =  joiningObject.roomID
                objectForMongo.playerID =  joiningObject.playerID
                objectForMongo.playerName =  joiningObject.playerName
                objectForMongo.tournamentID =  joiningObject.tournamentID
                objectForMongo.roundEndTime =  joiningObject.roundEndTime
                objectForMongo.roundStartTime =  joiningObject.roundStartTime
                GLOBALPARAMS.isLogs && console.log('Out Of Logs objectForMongo',objectForMongo)
                if (isValidObjectId(joiningObject.playerId)) 
                {
                    GLOBALPARAMS.isLogs && console.log('>>>>>>>>Match Not Found Object Object',JSON.stringify(objectForMongo))
                    await MatchNotFoundData.add(objectForMongo)
                } 
                else 
                {
                    GLOBALPARAMS.isLogs &&console.log('>>>>>>>>Match Not Found Object Object NOT VAlidated');
                    writeToLog(">>>>>>>>>>>>>>>>>>> PlayerId is not ObjectiD "+JSON.stringify(objectForMongo),joiningObject.roomID)
                }
                await SendPlayerNotMatchedInfo(socket,"openNotMatchPanel","roomID",false);
            }
            else
            {
                let isDataInConsistencyContestCancel = await LudoAllData.getLogsField(joiningObject.roomID,"isDataInConsistencyContestCancel");
                //console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$ GameAlreadyCompleted?>");
                if(isDataInConsistencyContestCancel)
                {
                    GLOBALPARAMS.isLogs &&console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$ ContestCancelled");
                    await SendContestCancelled(joiningObject.roomID,socket,"contestCancelled",false);
                }
                else
                {   
                    GLOBALPARAMS.isLogs &&console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$ GameAlreadyCompleted");
                    await GameAlreadyCompleted(socket,joiningObject);
                }

                if(GLOBALPARAMS.isDisposeObjects)
                {
                    isDataInConsistencyContestCancel = null;
                }
            }
        }
        else
        {
            GLOBALPARAMS.isLogs && console.log('###########Room Joining Else Calling');
            writeToLog("Room Joining Else Calling ===>"+ JSON.stringify(joiningObject),joiningObject.roomID,true);
            
            let isGameStarted = await GetRoomVariable(joiningObject.roomID,'isGameStarted');
            writeToLog(">>>>>>>>>>>>IS Game Starrted "+isGameStarted,joiningObject.roomID)
            if(!isGameStarted)
            {
                GLOBALPARAMS.isLogs && console.log("########### game not started");
                writeToLog("Room Joining Else Game not started ===>"+ JSON.stringify(joiningObject),joiningObject.roomID);
                let canJoinRoom = await CanJoinRoom(joiningObject.roomID);
                //Game not started
                if(canJoinRoom)
                {
                    GLOBALPARAMS.isLogs && console.log('###########canJoinRoom');
                    let isPlayerExistInRoom = await CheckIfPlayerExistInRoom(joiningObject.roomID,joiningObject.playerID);
                    if (!isPlayerExistInRoom) 
                    {
                        GLOBALPARAMS.isLogs && console.log("########### JoinPlayerInRoom");
                        writeToLog("Room Joining Else JoinPlayerInRoom ===>"+ JSON.stringify(joiningObject),joiningObject.roomID);
                        let joiningObj = JOINING_OBJECT_CLASSES.get(joiningObject.roomID);
                        joiningObj.AddPlayerInList(joiningObject,socket);
                        //await JoinPlayerInRoom(joiningObject,socket,false);
                    }
                    else
                    {
                        GLOBALPARAMS.isLogs && console.log("########### waiting TIMER player Reconnection");
                        writeToLog("Room Joining Else waiting TIMER player Reconnection ===>"+ JSON.stringify(joiningObject),joiningObject.roomID);
                        await WaitingTimerPlayerReconnection(socket,joiningObject);
                    }

                    if(GLOBALPARAMS.isDisposeObjects)
                    {
                        isPlayerExistInRoom = null;
                    }   
                    
                }
                else
                {
                    GLOBALPARAMS.isLogs && console.log('###########isTournament playerCannotJoin');
                    const isTournament = await GetRoomVariable(joiningObject.roomID,"isTournament");
                    if(isTournament)
                    {
                        GLOBALPARAMS.isLogs && console.log('###########isTournament playerCannotJoin 0');
                        let tournamentNotMatchedObject = new Object();
                        tournamentNotMatchedObject.roomID = joiningObject.roomID,
                        tournamentNotMatchedObject.tournamentID = await GetRoomVariable(joiningObject.roomID,"tournament_id"),
                        tournamentNotMatchedObject.roundNo = await GetRoomVariable(joiningObject.roomID,"round_count"),
                        tournamentNotMatchedObject.isPlayerQualified =  false,
                        tournamentNotMatchedObject.responseFromTournamentApi = "",
                        tournamentNotMatchedObject.tournamentNextRoundName = "",
                        tournamentNotMatchedObject.apiNotWorking = false;
                        await SendTournamentMatchNotFound(joiningObject.roomID,tournamentNotMatchedObject);
                       
                    }
                    else
                    {
                        GLOBALPARAMS.isLogs && console.log('###########isTournament playerCannotJoin 1');
                        await SendPlayerWaitingTimerFinished(socket,"playerCannotJoin");
                    }
                    
                    DisconnectSocket(socket.id,1000);
                    writeToLog("Room Joining Else player cannot join ROOM NOT EXISTS ===>"+ JSON.stringify(joiningObject),joiningObject.roomID);
                    GLOBALPARAMS.isLogs && console.log('player cannot join ROOM NOT EXISTS');
                }
                if(GLOBALPARAMS.isDisposeObjects)
                {
                    canJoinRoom = null;
                } 
                
            }
            else
            {
                GLOBALPARAMS.isLogs && console.log("########### game started");
                writeToLog("Room Joining Else game started"+ JSON.stringify(joiningObject),joiningObject.roomID);
                //Game Started
                let isPlayerExistInRoom = await CheckIfPlayerExistInRoom(joiningObject.roomID,joiningObject.playerID);
                if (isPlayerExistInRoom) 
                {
                    GLOBALPARAMS.isLogs && console.log("###########  player Reconnection");
                    writeToLog("Room Joining Else player Reconnection"+ JSON.stringify(joiningObject),joiningObject.roomID);
                    await PlayerReconnection(socket,joiningObject,false);
                }
                else
                {
                    GLOBALPARAMS.isLogs && console.log("###########  player GameAlreadyStarted");
                    writeToLog("Room Joining Else player GameAlreadyStarted"+ JSON.stringify(joiningObject),joiningObject.roomID);
                    await SendGameAlreadyStartedInfo(socket,"gameAlreadyStarted");
                }
                if(GLOBALPARAMS.isDisposeObjects)
                {
                    isPlayerExistInRoom = null;
                }
            }
            writeToLog("Room Joining xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"+ JSON.stringify(joiningObject),joiningObject.roomID);
            if(GLOBALPARAMS.isDisposeObjects)
            {
                isGameStarted = null;
            }
    
        }
        
        if(GLOBALPARAMS.isDisposeObjects)
        {
            roomExists = null;
            joiningObject = null;
        }
        
    }
    catch(error)
    {
        console.log("joining error "+error);
    }
    //De-Referencing
    if(GLOBALPARAMS.isDisposeObjects)
    {
        socket = null;
        data = null;
        io = null;
    }
        
}
export async function GameStart(roomID)
{
    try 
    {
        let isRoomExists = await CheckIfRoomExists(roomID);
        if(isRoomExists)
        {
            //checking if players in room reached to the max limit allowed to start the game
            let currentPlayersInRoomCount = await GetPlayersCount(roomID);
            let roomMaxPlayerCount = await GetRoomVariable(roomID,"roomMaxPlayerCount");
            GLOBALPARAMS.isLogs && console.log("currentRoomSize "+currentPlayersInRoomCount);
            GLOBALPARAMS.isLogs && console.log("gameMaxPlayerLimit "+roomMaxPlayerCount);

            if (+currentPlayersInRoomCount === +roomMaxPlayerCount) 
            {   
                writeToLog("Game Start Calling ===>"+ "",roomID,true);
                let waitingTimerTimeStamp = await GetRoomVariable(roomID,"waitingTimerTimeStamp");

                await SetRoomVariable(roomID,'isWaitingTimerRunning',false);
                await SetRoomVariable(roomID,"isGameStarted",true);
                await LudoAllData.updateField(roomID,"isGameStarted",true);

                let contestCancelled = await CheckForDataInconsistancy(roomID)
                if(!contestCancelled)
                {
                    writeToLog("Game Start contest not Cancelled ===>"+ " ",roomID);
                    setTimeout(async()=>
                    {
                        let startObject = new Object();
                        startObject.roomID = roomID,
                        startObject.gameMode = await GetRoomVariable(roomID,"gameMode"),
                        startObject.noOfTokensPerPlayer = await GetRoomVariable(roomID,"noOfTokensPerPlayer"),
                        startObject.noOfMovesEachPlayerInitiallyHave = await GetRoomVariable(roomID,"noOfMovesEachPlayerInitiallyHave"),
                        startObject.roomMaxAutoplayChances = await GetRoomVariable(roomID,"roomMaxAutoplayChances"),
                        startObject.timerModeTimerDuration = await GetRoomVariable(roomID,"timerModeTimerDuration"),
                        startObject.playersInRoom = await GetAllPlayersInRoom(roomID);

                        // GLOBALPARAMS.isLogs && console.log("Players After "+JSON.stringify(startObject.playersInRoom));
                        
                        await SendStartGameCall(roomID,startObject);
                        writeToLog("Game Start socket call send ===>"+ JSON.stringify(startObject),startObject.roomID);

                        //If timer mode is enabled
                        if(startObject.gameMode === GLOBALPARAMS.gameMode.TIMER)
                        {
                            await StartTimerModeTimer(roomID);
                            let timerModeTimeStamp = await GetRoomVariable(roomID,"timerModeTimeStamp");
                            let remainingTime = TimerManager.GetCurrentTimerRemainingSeconds(timerModeTimeStamp);
                            await SendTimerModeRemainingTime(roomID,remainingTime);
                            writeToLog("Game Start Timer MODE ===>"+ JSON.stringify(startObject),startObject.roomID);
                            if(GLOBALPARAMS.isDisposeObjects)
                            {
                                timerModeTimeStamp = null;
                                remainingTime = null;
                            }
                        }

                        let isTournament =  await GetRoomVariable(roomID,"isTournament");
                        if(!isTournament)
                        {
                            await ApiManager.startGameApiCall(roomID,false);
                        }

                        let turnList = GetRoomTurnList(roomID);
                        let currentTurn = turnList.GetCurrentTurnPlayerData(roomID);
                        await SetRoomVariable(roomID,"previousTurnId",currentTurn);
                        TimerManager.StopTimer(waitingTimerTimeStamp,roomID,TIMER_FUNCTIONS.STOP_WAITING_TIMER);
                        await StartTurnTimer(roomID,0,false,true);
                        DeleteJoiningObjectClass(roomID);
                        writeToLog("Game Start call send ===>"+ JSON.stringify(startObject),startObject.roomID);
                        GLOBALPARAMS.isLogs && console.log("<******START GAME CALL******>");

                        if(GLOBALPARAMS.isDisposeObjects)
                        {
                            startObject = null;
                            turnList = null;
                            currentTurn = null;
                        }
                        
                    },1500) 

                
                }
                else
                {
                    writeToLog("Game Start contest Cancelled ===>"+ " ",roomID);
                    await SendContestCancelled(roomID,null,"contestCancelled",true);
                    await SetRoomVariable(roomID,"contestCancelled",true);
                    await LudoAllData.updateField(roomID,"isDataInConsistencyContestCancel",true);
                    await DeleteRoom(roomID);
                    writeToLog("Game Start xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"+ " ",roomID);
                }
            }
            else 
            {   
                GLOBALPARAMS.isLogs && console.log("room is not full waiting for players to join");
            }
        
        }
        else
        {
            let isDataInConsistencyContestCancel = await LudoAllData.getLogsField(roomID,"isDataInConsistencyContestCancel");
            if(isDataInConsistencyContestCancel)
            {
                await SendContestCancelled(roomID,null,"contestCancelled",true);
            }
        }
       
        
        
    } 
    catch (error) 
    {
        writeToLog("Error while Game Start xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx===>"+error,roomID,true);
    }
}
export async function GetCurrentGameState(socket,currentGameStateObj)
{
    let roomID = currentGameStateObj.roomID;
    let playerID = currentGameStateObj.playerID;
    let isRoomExists = await CheckIfRoomExists(roomID);
    
    if (isRoomExists) 
    {

        let gameMode = await GetRoomVariable(roomID,"gameMode");
        let timerModeRemainingTime = 0;
        if(gameMode === GLOBALPARAMS.gameMode.TIMER)
        {
            let timerModeTimeStamp = await GetRoomVariable(roomID,"timerModeTimeStamp");
            timerModeRemainingTime = TimerManager.GetCurrentTimerRemainingSeconds(timerModeTimeStamp);
            GLOBALPARAMS.isLogs && console.log("TIMER MODE REMAINING TIME "+timerModeRemainingTime);
        }
        let turnList = GetRoomTurnList(roomID);
        let turnTimerTimeStamp = await GetRoomVariable(roomID,"turnTimerTimeStamp");
        let waitingTimerTimeStamp = await GetRoomVariable(roomID,"waitingTimerTimeStamp");
        let PlayerInRoomArray = await GetAllPlayersInRoom(roomID,null,playerID);
        var gameCurrentStateObj = new Object();

        gameCurrentStateObj.roomID  = roomID,
        gameCurrentStateObj.turnPlayerID = turnList.GetCurrentTurnPlayerData(),
        gameCurrentStateObj.gameMode = gameMode,
        gameCurrentStateObj.timerModeRemainingTime = timerModeRemainingTime,
        gameCurrentStateObj.currentTurnTimerTime = TimerManager.GetCurrentTimerRemainingSeconds(turnTimerTimeStamp),
        gameCurrentStateObj.playersInRoom = PlayerInRoomArray,
        gameCurrentStateObj.currentWaitingTimerTime = timerManager.GetCurrentTimerRemainingSeconds(waitingTimerTimeStamp);
        
        await SendCurrentGameState(socket,gameCurrentStateObj);

        //Derefrencing
        if(GLOBALPARAMS.isDisposeObjects)
        {
            turnList = null;
            turnTimerTimeStamp = null;
            waitingTimerTimeStamp = null;
            PlayerInRoomArray = null;
            gameCurrentStateObj = null;
        }
        
    } 
    else 
    {
        GLOBALPARAMS.isLogs && console.log("room not found in current game state");
    }
    
    if(GLOBALPARAMS.isDisposeObjects)
    {
        currentGameStateObj = null
        roomID = null;
        playerID = null;
        isRoomExists = null;
        socket = null;
        data = null;
    }
    
}
export async function LeaveGame(leaveGameObj)
{

    let ifRoomExists = await CheckIfRoomExists(leaveGameObj.roomID);
    if (ifRoomExists) 
    {
        writeToLog("Leave Game Starting ==> "+ JSON.stringify(leaveGameObj),leaveGameObj.roomID,true);  
        let IsGameStarted = await GetRoomVariable(leaveGameObj.roomID,'isGameStarted');
        let isWaitingTimerRunning = await GetRoomVariable(leaveGameObj.roomID,'isWaitingTimerRunning');
        
        // game is not started yet
        if(isWaitingTimerRunning && !IsGameStarted)
        {
            writeToLog("Leave Game condition not possible as player cannot leave with its own consent before game start ==> "+ JSON.stringify(leaveGameObj),leaveGameObj.roomID);  
            GLOBALPARAMS.isLogs && console.log("condition not possible as player cannot leave with its own consent before game start");
        }
        else
        {
            writeToLog("Leave Game else condition ==> "+ JSON.stringify(leaveGameObj),leaveGameObj.roomID);  
            await SetPlayerVariable(leaveGameObj.roomID,leaveGameObj.playerID,'isPlayerLeft',true)
            await SetPlayerLeaveRank(leaveGameObj.roomID,leaveGameObj.playerID,true);
            let currentTurnList = GetRoomTurnList(leaveGameObj.roomID);
            let turnTimerTimeStamp = await GetRoomVariable(leaveGameObj.roomID,"turnTimerTimeStamp");
            if(currentTurnList.GetCurrentTurnPlayerData() === leaveGameObj.playerID)
            {
                TimerManager.StopTimer(turnTimerTimeStamp,leaveGameObj.roomID,TIMER_FUNCTIONS.STOP_TURN_TIMER);
            }
            currentTurnList.DeleteNode(leaveGameObj.playerID);
            await SendPlayerLeftData(leaveGameObj.roomID,leaveGameObj.playerID);
            EachLeftPlayerTokensDelete(leaveGameObj.roomID,leaveGameObj.playerID);
            let opponentPlayerID = await GetOpponentsPlayersID(leaveGameObj.roomID,leaveGameObj.playerID)
            writeToLog("opponentPlayerID"+ opponentPlayerID ,leaveGameObj.roomID);  
            let GetPlayerTokenAtHome = await GetPlayerTotalTokenAtHome(leaveGameObj.roomID,opponentPlayerID)
            writeToLog("OpponentPlayerID Token In Home"+ GetPlayerTokenAtHome ,leaveGameObj.roomID); 
            if (GetPlayerTokenAtHome.length == await GetRoomVariable(leaveGameObj.roomID,'noOfTokensPerPlayer')){  
                writeToLog("I am leaving the game when Opponent Have Token in Home"+ opponentPlayerID ,leaveGameObj.roomID);
                return true;
            }else{
                writeToLog("I am leaving the game when Opponent Have Not All Token in Home"+ opponentPlayerID ,leaveGameObj.roomID);
                if(currentTurnList.GetPLayersInGameCount() < 2)
                {
                    writeToLog("PLAYER LEFT RANK SET",leaveGameObj.roomID);
                    TimerManager.StopTimer(turnTimerTimeStamp,leaveGameObj.roomID,TIMER_FUNCTIONS.STOP_TURN_TIMER);
                    await SetPlayerVariable(leaveGameObj.roomID,currentTurnList.GetCurrentTurnPlayerData(),'rank',1);
                }
                else
                {
                    await StartTurnTimer(leaveGameObj.roomID,0,false,true);
                }
            }
            writeToLog("OPponnent PLayer ",leaveGameObj.roomID);

            if(GLOBALPARAMS.isDisposeObjects)
            {
                currentTurnList = null;
                turnTimerTimeStamp = null;
            }
            
        
        }

        if(GLOBALPARAMS.isDisposeObjects)
        {
            IsGameStarted = null;
            isWaitingTimerRunning = null;
        }
        
        
    } 
    else 
    {
        GLOBALPARAMS.isLogs && console.log("room not found in game leave");
    }


    if(GLOBALPARAMS.isDisposeObjects)
    {
        leaveGameObj = null;
        ifRoomExists = null;
        data = null;
    }
    
    
}
export async function CreateNewRoom(io,socket,roomObject)
{
    roomLogs(roomObject);
    if(parseInt(roomObject.roomMaxAutoplayChances) < 1 || parseInt(roomObject.roomMaxAutoplayChances) === NaN)
    {
        roomObject.gameMaxAutoplayChances = "1";
    } 
    try 
    {
        //room Object creation
        let roomDetails = new Object();
        roomDetails.roomID  = roomObject.roomID,
        roomDetails.roomMaxPlayerCount = parseInt(roomObject.roomMaxPlayerCount),
        roomDetails.roomCurrentPlayerCount = 1,
        //TO BE DELETED
        GLOBALPARAMS.isLogs && console.log(roomObject.rankWiseWinningAmount,"roomObject.rankWiseWinningAmount>>>>>")

        roomDetails.rankWiseWinningAmount = (!_.isEmpty(roomObject.rankWiseWinningAmount)) ? roomObject.rankWiseWinningAmount : DEFAULT_RANKING,
        
        roomDetails.gameMaxAutoplayChances = parseInt(roomObject.roomMaxAutoplayChances),
        roomDetails.isGameOver = false,
        roomDetails.isGameStarted = false,
        roomDetails.diceRollingDisabledTimeStamp = "",
        roomDetails.startAutoPlayTimeStamp = "",
        roomDetails.turnTimerTimeStamp = "",
        roomDetails.waitingTimerTimeStamp = "",
        roomDetails.autoPlayTimerTimeStamp = "",
        roomDetails.stopDiceRollingTimeStamp = "",
        roomDetails.timerModeTimeStamp = "",
        roomDetails.waitingTimerDuration = 60,//parseInt(roomObject.waitingTimerDuration),
        roomDetails.turnTimerDuration = GLOBALPARAMS.turnTimerDuration,
        roomDetails.autoPlayTimerDuration =  +roomDetails.waitingTimerDuration - 1,
        roomDetails.currentPlayerTurnID = "",
        roomDetails.currentTurnPlayerSocketID = "",
        roomDetails.isWaitingTimerRunning = true,
        roomDetails.nextLeaveRankToBeGiven = parseInt(roomObject.roomMaxPlayerCount),
        roomDetails.nextWinRankToBeGiven = 1,
        roomDetails.match_id = roomObject.match_id,
        roomDetails.diceRolled = false,
        roomDetails.diceEnabled = false,
        roomDetails.tokenEnabled = false,
        roomDetails.autoTokenMove = false,
        roomDetails.currentDiceNo = 1,
        roomDetails.nextDiceNo = 0,
        roomDetails.previousTurnId = "",
        roomDetails.lastTimerModeTurnID = "",
        roomDetails.gameMode = roomObject.gameMode,
        roomDetails.roomMaxAutoplayChances = roomObject.roomMaxAutoplayChances,
        roomDetails.timerModeTimerDuration = parseInt(roomObject.timerModeTimerDuration),
        roomDetails.noOfTokensPerPlayer = parseInt(roomObject.noOfTokensPerPlayer),
        // roomDetails.noOfTokensPerPlayer = 4,
        roomDetails.noOfMovesEachPlayerInitiallyHave = parseInt(roomObject.noOfMovesEachPlayerInitiallyHave),
        roomDetails.currentlyAssignedTokensCount = 0,
        roomDetails.devModeEnabled = UtilityFunctions.BoolParser(roomObject.devModeEnabled),
        roomDetails.tokenKillingScoreAdditionalPoints = parseInt(roomObject.tokenKillingScoreAdditionalPoints),
        roomDetails.homeReachingScoreAdditionalPoints = parseInt(roomObject.homeReachingScoreAdditionalPoints),
        roomDetails.isTimerModeTimerCompleted = false,
        roomDetails.currentJoiningOrderOfPlayer = 0,
        roomDetails.contestCancelled = false,
        roomDetails.tokenStateUpdating = false,
        roomDetails.oppositePlayerId = '',
        roomDetails.firstRankPlayerSocketID = ""
        roomDetails.responseFromTournamentApi = "No Data",
        roomDetails.tournamentNextRoundName = "",
        roomDetails.apiNotWorking = false,
        roomDetails.isTournament = roomObject.isTournament,
        roomDetails.firstJoinedPlayerID = roomObject.playerID,
        roomDetails.firstJoinedPlayerName = roomObject.playerName,
        roomDetails.isTournamentOver = false,
        roomDetails.lastTurnPlayerMissedChance = '',
        roomDetails.gameJoinAmount = parseInt(roomObject.gameJoinAmount)
        if(roomObject.isGroupContest)
        {
            roomDetails.contestId = roomObject.contestId
            roomDetails.contest_id = roomObject.contest_id,
            roomDetails.isGroupContest = roomObject.isGroupContest,
            roomDetails.player_data = roomObject.player_data,
            roomDetails.join_id  = roomObject.join_id
        }
        if(roomObject.isTournament)
        {
            roomDetails.tournament_id = roomObject.tournamentID,
            roomDetails.round_count = roomObject.roundCount,
            roomDetails.round_start_time = roomObject.roundStartTime,
            roomDetails.round_end_time = roomObject.roundEndTime,
            roomDetails.currentRoundName = roomObject.currentRoundName;
            GLOBALPARAMS.isLogs && console.log("isTournament room join "+roomObject.isTournament);
        }

        GLOBALPARAMS.isLogs && console.log("roomObject.noOfMovesEachPlayerInitiallyHave "+roomObject.noOfMovesEachPlayerInitiallyHave);

        let obj = {
            roomID:roomDetails.roomID,
            roomMaxPlayerCount:roomDetails.roomMaxPlayerCount,
            roomCurrentPlayerCount:roomDetails.roomCurrentPlayerCount,
            rankWiseWinningAmount:roomDetails.rankWiseWinningAmount,
            isGameStarted:roomDetails.isGameStarted,
            match_id:roomDetails.match_id,
            gameMode:roomDetails.gameMode,
            roomMaxAutoplayChances:roomDetails.roomMaxAutoplayChances,
            StartApiCallData:'',
            EndApiCallData:'',
            DeleteRoomCalled:false,
            isGameOver:false,
            isDataInConsistencyContestCancel:false,
            apiNotWorking:'',
            unityError:'',
            isTournament:false
        }
        await LudoAllData.add(obj)
        if(roomObject.isTournament)
        {
            await LudoAllData.updateField(roomObject.roomID,"isTournament",true)
        }
        //set room data in redis
        // TIMER_MODE_TIMER_COMPLTED.set(roomDetails.roomID, false)

        let roomData = JSON.stringify(roomDetails)
        await redisClient.set(`${LUDO_ROOM}:${roomDetails.roomID}`, roomData);
        await redisClient.expire(`${LUDO_ROOM}:${roomDetails.roomID}`, GLOBALPARAMS.TtlTimeForOneDays)
        let turnList = new TurnList();
        SetRoomTurnList(roomDetails.roomID,turnList);
        await StartWaitingTimer(roomDetails.roomID);

        let playerObject = new Object();
        playerObject.roomID = roomObject.roomID,
        playerObject.playerID = roomObject.playerID,
        playerObject.playerName =roomObject.playerName,
        playerObject.playerImageID = roomObject.playerImageID,
        playerObject.socketID = socket.id,
        playerObject.authToken = roomObject.authToken;
        
        await JoinPlayerInRoom(playerObject,socket,true);
        writeToLog("Create Room Call ==>>xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"+ JSON.stringify(roomDetails),roomDetails.roomID,true);

        if(GLOBALPARAMS.isDisposeObjects)
        {
            roomDetails = null;
            obj = null;
            roomData = null;
            turnList = null;
            playerObject = null;
        }
        
    } 
    catch (error) 
    {
        writeToLog("Error Create Room Call ==>>xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"+error,roomObject.roomID,true)
    }
    if(GLOBALPARAMS.isDisposeObjects)
    {
        roomObject = null;
        socket = null;
        io = null;
    }
}
export async function GameAlreadyCompleted(socket,playerObject)
{
    GLOBALPARAMS.isLogs && console.log("GameCompletedObj "+JSON.stringify(playerObject));
    let gameAlreadyCompletedObj = await getRoomPlayerData(playerObject.playerID,playerObject.roomID);
    let isTournament = await LudoAllData.getLogsField(playerObject.roomID,'isTournament')
    if(isTournament){   
        let tournamentID = await LudoAllData.getLogsField(playerObject.roomID,'tournamentID')
        let roundCount = await LudoAllData.getLogsField(playerObject.roomID,'roundCount')
        let responseFromTournamentApi = await LudoAllData.getLogsField(playerObject.roomID,'responseFromTournamentApi')
        let tournamentNextRoundName = await LudoAllData.getLogsField(playerObject.roomID,'tournamentNextRoundName')
        gameAlreadyCompletedObj._doc['isTournament'] = isTournament
        gameAlreadyCompletedObj._doc['tournamentID'] = tournamentID
        gameAlreadyCompletedObj._doc['roundCount'] = roundCount
        gameAlreadyCompletedObj._doc['responseFromTournamentApi'] = JSON.parse(responseFromTournamentApi)
        gameAlreadyCompletedObj._doc['tournamentNextRoundName'] = tournamentNextRoundName
    }
    await SendGameAlreadyCompletedInfo(socket,gameAlreadyCompletedObj);
    GLOBALPARAMS.isLogs && console.log("game completed socket disconnected "+JSON.stringify(gameAlreadyCompletedObj));
    if(GLOBALPARAMS.isDisposeObjects)
    {
        gameAlreadyCompletedObj = null;
        playerObject = null;
        socket = null;

    }
}
export async function JoinPlayerInRoom(playerObject,socket,isNewlyCreatedRoom)
{

    let turnList = GetRoomTurnList(playerObject.roomID);
    if(!_.isEmpty(turnList) && !turnList.CheckIfPlayerAlreadyExistsInTurnList(playerObject.playerID))
    {
        turnList.AppendNode(playerObject.playerID);
        let playerDetails = new Object();
        let myPath = await AssignPathtoPlayer(playerObject.roomID,isNewlyCreatedRoom,null,null);
        GLOBALPARAMS.isLogs && console.log(playerObject.playerName+" *************************ASSIGNED PATH*********************** "+myPath);
        let arrayOfToken = await AssignPlayerToken(playerObject.roomID,playerObject.playerID,isNewlyCreatedRoom,myPath)
        playerDetails.playerID = playerObject.playerID,
        playerDetails.playerName = playerObject.playerName,
        playerDetails.playerImageID = playerObject.playerImageID,
        playerDetails.myPath = myPath,
        playerDetails.baseID = parseInt(playerDetails?.myPath[0]),
        playerDetails.consecutiveSixCount = 0,
        playerDetails.isPlayerLeft = false,
        playerDetails.currentAutoplayChances = parseInt(await GetRoomVariable(playerObject.roomID,"roomMaxAutoplayChances")),
        playerDetails.rank = 0,
        playerDetails.myTokens = arrayOfToken,
        playerDetails.roomID = playerObject.roomID,
        playerDetails.socketID = playerObject.socketID,
        playerDetails.isWaitingTimerStarted = true,
        playerDetails.isPlayerPlaying = true,
        playerDetails.playerWinData = {},
        playerDetails.previousDiceVal = 1,
        playerDetails.score = 0,
        playerDetails.currentMovesLeft = await GetRoomVariable(playerObject.roomID,"noOfMovesEachPlayerInitiallyHave"),
        playerDetails.joinOrderofPlayer = (await GetRoomVariable(playerObject.roomID,"currentJoiningOrderOfPlayer"))+1,
        playerDetails.notSixCount = 0,
        playerDetails.authToken = playerObject.authToken,
        playerDetails.isBot = false
        playerDetails.countLastTokenAtHome = 0,
        playerDetails.playerProfile = await GetProfileOfEachPlayer(playerObject.playerID,await GetRoomVariable(playerDetails.roomID,'gameMode'))
        playerDetails.before20IndexIsWin = false,
        playerDetails.turnForWin = 0,
        
        await SetRoomVariable(playerObject.roomID,"currentJoiningOrderOfPlayer",playerDetails.joinOrderofPlayer);
        await LudoAllData.update(playerDetails.roomID,playerDetails)

        let playerData = JSON.stringify(playerDetails)
        delete playerObject.socket;
        if(!_.isEmpty(playerObject.roomID))
        {
            try 
            {
                await redisClient.set(`${LUDO_ROOM_PLAYER_DATA}:${playerObject.roomID}:${playerObject.playerID}`,playerData);
                await redisClient.expire(`${LUDO_ROOM_PLAYER_DATA}:${playerObject.roomID}:${playerObject.playerID}`, GLOBALPARAMS.TtlTimeForOneDays)
                writeToLog("while calling PLAYER SAVED IN REDIS" + JSON.stringify(playerObject),playerObject.roomID);
                GLOBALPARAMS.isLogs && console.log("PLAYER SAVED IN REDIS "+playerObject.playerName);
            } 
            catch (error) 
            {
                writeToLog("while calling  ERROR PLAYER SAVED IN REDIS" + JSON.stringify(playerObject),playerObject.roomID);
                GLOBALPARAMS.isLogs && console.log(error,"while saving player in redis");
            }
        }
        
        //Informing Player that he is joined in the room

        JoinPlayerSocketInARoom(socket,playerObject.socketID,playerObject.roomID);

        //preparing Data of roomJoinInfo to send to the Player

        let playersInRoomArray = await GetAllPlayersInRoom(playerObject.roomID);
        let roomWaitingTimerTimeStamp = await GetRoomVariable(playerObject.roomID,"waitingTimerTimeStamp");

        let playerJoinedObj = new Object();
        playerJoinedObj.playersInRoomList = playersInRoomArray,
        playerJoinedObj.waitingTimerTime = timerManager.GetCurrentTimerRemainingSeconds(roomWaitingTimerTimeStamp);

        // Sending roomJoined info to the player
        await SendRoomJoinedInfo(playerObject.roomID,playerJoinedObj);

        //GameStarting Call check

        await GameStart(playerObject.roomID);
        GLOBALPARAMS.isLogs && console.log("PLAYER JOINED IN ROOM "+playerObject.playerName);
        GLOBALPARAMS.isLogs && console.log(JSON.stringify(playerObject),"playerObjectplayerObjectplayerObjectplayerObject", typeof playerObject);
        writeToLog("while calling joinPlayerInRoom INFO SEND xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" + JSON.stringify(playerObject),playerObject.roomID)

        if(GLOBALPARAMS.isDisposeObjects)
        {
            playerDetails = null;
            myPath = null;
            arrayOfToken = null;
            playerData = null;
            playersInRoomArray = null;
            roomWaitingTimerTimeStamp = null;
            playerJoinedObj = null;
        }

    }
    else
    {
        delete playerObject.socket;
        writeToLog("while calling joinPlayerInRoom PLAYER ALREADY EXIST IN TURN LIST xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" + JSON.stringify(playerObject),playerObject.roomID)
        GLOBALPARAMS.isLogs && console.log("PLAYER ALREADY EXIST IN TURN LIST "+playerObject.playerName);
    }
    if(GLOBALPARAMS.isDisposeObjects)
    {
        turnList = null;
    }

    
    if(GLOBALPARAMS.isDisposeObjects)
    {
        playerObject = null;
        socket = null;
        isNewlyCreatedRoom = null;
    }
    
}
export async function WaitingTimerPlayerReconnection(socket,joiningObject)
{
    try 
    {
        GLOBALPARAMS.isLogs && console.log("waitingTimer reconnection req "+JSON.stringify(joiningObject));
        let playerSocketID = await GetPlayerVariable(joiningObject.roomID,joiningObject.playerID,"socketID");
        await DisconnectSocket(playerSocketID,0);
        await SetPlayerVariable(joiningObject.roomID,joiningObject.playerID,"socketID",socket.id.toString());
        JoinPlayerSocketInARoom(socket,socket.id,joiningObject.roomID);

        let waitingTimerTimerStamp = await GetRoomVariable(joiningObject.roomID,"waitingTimerTimeStamp");

        var waitingTimerReconnectionObj = new Object();
        waitingTimerReconnectionObj.roomID = joiningObject.roomID,
        waitingTimerReconnectionObj.playerID = joiningObject.playerID,
        waitingTimerReconnectionObj.currentWaitingTimerTime = TimerManager.GetCurrentTimerRemainingSeconds(waitingTimerTimerStamp),
        waitingTimerReconnectionObj.maxWaitingTimerTime = await GetRoomVariable(joiningObject.roomID,"waitingTimerDuration"),
        waitingTimerReconnectionObj.gameMode = await GetRoomVariable(joiningObject.roomID,"gameMode"),
        waitingTimerReconnectionObj.noOfTokensPerPlayer = await GetRoomVariable(joiningObject.roomID,"noOfTokensPerPlayer"),
        waitingTimerReconnectionObj.noOfMovesEachPlayerInitiallyHave = await GetRoomVariable(joiningObject.roomID,"noOfMovesEachPlayerInitiallyHave"),
        waitingTimerReconnectionObj.roomMaxAutoplayChances = await GetRoomVariable(joiningObject.roomID,"roomMaxAutoplayChances"),
        waitingTimerReconnectionObj.timerModeTimerDuration = await GetRoomVariable(joiningObject.roomID,"timerModeTimerDuration"),
        waitingTimerReconnectionObj.isGameStarted = await GetRoomVariable(joiningObject.roomID,"isGameStarted"),
        waitingTimerReconnectionObj.contestCancelled = await GetRoomVariable(joiningObject.roomID,"contestCancelled");

        await SendWaitingTimeReconnectionData(socket,waitingTimerReconnectionObj);
        writeToLog("while waitingTimerPlayerReconnection calling xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" + JSON.stringify(waitingTimerReconnectionObj),waitingTimerReconnectionObj.roomID,true)
        if(GLOBALPARAMS.isDisposeObjects)
        {
            playerSocketID = null;
            waitingTimerTimerStamp = null;
            waitingTimerReconnectionObj = null;
        }
    } 
    catch (error) 
    {
        writeToLog("Error while waitingTimerPlayerReconnection calling xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" +error,waitingTimerReconnectionObj.roomID,true)
    }   

    if(GLOBALPARAMS.isDisposeObjects)
    {
        joiningObject = null;
        socket = null;
    }
    
}
export async function PlayerReconnection(socket,joiningObject,isCurrentGameState)
{
    try 
    {
        if(!isCurrentGameState)
        {   
            let playerSocketID = await GetPlayerVariable(joiningObject.roomID,joiningObject.playerID,"socketID");
            DisconnectSocket(playerSocketID,0);
            await SetPlayerVariable(joiningObject.roomID,joiningObject.playerID,"socketID",socket.id.toString());
            JoinPlayerSocketInARoom(socket,socket.id,joiningObject.roomID);
        }
        
        
        let currentAutoplayChances = null;
        let movableTokensArray = [];
        let playerTokensAtBase =[]; 
        let maxAutoplayChances = await GetRoomVariable(joiningObject.roomID,"gameMaxAutoplayChances");
        let turnList = GetRoomTurnList(joiningObject.roomID);
        let currentTurnPlayer = turnList.GetCurrentTurnPlayerData();
        let currentDiceVal = await GetRoomVariable(joiningObject.roomID,"currentDiceNo");

        if(joiningObject.playerID === currentTurnPlayer)
        {
            currentAutoplayChances = await GetPlayerVariable(joiningObject.roomID,joiningObject.playerID,"currentAutoplayChances");
            movableTokensArray =  await GetPlayerMovableTokens(joiningObject.roomID,joiningObject.playerID,currentDiceVal,false);
            if(currentDiceVal === GLOBALPARAMS.diceMaxVal)
            {
                playerTokensAtBase = await GetPlayerTokenStatusArray(null,joiningObject.roomID,joiningObject.playerID,GLOBALPARAMS.tokenStatus.AT_BASE,false);
                if(playerTokensAtBase.length > 0)
                {
                    movableTokensArray = [...movableTokensArray,...playerTokensAtBase];
                }
            }
        }
        
        let currentTurnTimerTimeStamp = await GetRoomVariable(joiningObject.roomID,"turnTimerTimeStamp");
        let waitingTimerTimerStamp = await GetRoomVariable(joiningObject.roomID,"waitingTimerTimeStamp");
        let timerModeRemainingTime;
        let timerModeDuration;
        let gameMode = await GetRoomVariable(joiningObject.roomID,"gameMode");
        if(gameMode === GLOBALPARAMS.gameMode.TIMER)
        {
            let timerModeTimeStamp = await GetRoomVariable(joiningObject.roomID,"timerModeTimeStamp");
            timerModeDuration = await GetRoomVariable(joiningObject.roomID,"timerModeTimerDuration");
            timerModeRemainingTime = TimerManager.GetCurrentTimerRemainingSeconds(timerModeTimeStamp);
            setTimeout(async()=>
            {
                timerModeRemainingTime = TimerManager.GetCurrentTimerRemainingSeconds(timerModeTimeStamp);
                if(parseInt(timerModeRemainingTime) > 5)
                {
                    await SendTimerModeRemainingTime(joiningObject.roomID,timerModeRemainingTime);
                }
                timerModeTimeStamp = null;
            },1000)
        }
        else
        {
            timerModeDuration = "0";
            timerModeRemainingTime = "0";
        }
        
        var reconnectionObj = new Object();
        reconnectionObj.playersInRoom = await GetAllPlayersInRoom(joiningObject.roomID,null,joiningObject.playerID);
        reconnectionObj.currentTurnPlayerID = currentTurnPlayer,
        reconnectionObj.turnTimerMaxTime = GLOBALPARAMS.turnTimerDuration,
        reconnectionObj.currentTurnTimerSeconds = TimerManager.GetCurrentTimerRemainingSeconds(currentTurnTimerTimeStamp),
        reconnectionObj.waitingTimerCurrentSeconds = TimerManager.GetCurrentTimerRemainingSeconds(waitingTimerTimerStamp),
        reconnectionObj.currentAutoplayChances = currentAutoplayChances,
        reconnectionObj.maxAutoplayChances = maxAutoplayChances,
        reconnectionObj.diceRollingDisabled = false,
        reconnectionObj.isPlayerLeft = await GetPlayerVariable(joiningObject.roomID,joiningObject.playerID,"isPlayerLeft"),
        reconnectionObj.isGameStarted = await GetRoomVariable(joiningObject.roomID,"isGameStarted"),
        reconnectionObj.diceEnabled = await GetRoomVariable(joiningObject.roomID,"diceEnabled"),
        reconnectionObj.tokenEnabled = await GetRoomVariable(joiningObject.roomID,"tokenEnabled"),
        reconnectionObj.autoTokenMove = await GetRoomVariable(joiningObject.roomID,"autoTokenMove"),
        reconnectionObj.currentDiceNo = currentDiceVal,
        reconnectionObj.turnPlayerPreviosDiceNo = await GetPlayerVariable(joiningObject.roomID,currentTurnPlayer,"previousDiceVal"),
        reconnectionObj.previousTurnId = await GetRoomVariable(joiningObject.roomID,"previousTurnId"),
        reconnectionObj.gameMode = gameMode,
        reconnectionObj.timerModeRemainingTime = timerModeRemainingTime,
        reconnectionObj.timerModeDuration = timerModeDuration,
        reconnectionObj.contestCancelled = await GetRoomVariable(joiningObject.roomID,"contestCancelled"),
        reconnectionObj.isDiceRolled = await GetRoomVariable(joiningObject.roomID,"diceRolled");

        if(isCurrentGameState)
        {  
            await SendCurrentGameState(socket,reconnectionObj);
            writeToLog("CURRENT GAME STATE ????????????? "+reconnectionObj.playerName+' '+reconnectionObj.playerID+' '+JSON.stringify(reconnectionObj),joiningObject.roomID,true)
        }
        else
        {
            await SendReconnectionData(socket,reconnectionObj);
            GLOBALPARAMS.isLogs && console.log("RECCONECTION DATA "+JSON.stringify(reconnectionObj));
            writeToLog("RECONNECTION ????????????? "+reconnectionObj.playerName+' '+reconnectionObj.playerID+' '+JSON.stringify(reconnectionObj),joiningObject.roomID,true)
        }

       
        if(movableTokensArray.length > 0 && !reconnectionObj.diceEnabled && reconnectionObj.tokenEnabled)
        {
            let movableTokensObj = new Object();
            movableTokensObj.roomID = joiningObject.roomID,
            movableTokensObj.currentTurnPlayerID = currentTurnPlayer,
            movableTokensObj.movableTokkenArray = movableTokensArray;
            await SendPlayerMovableTokensData(socket,joiningObject.roomID,movableTokensObj,true);
            if(isCurrentGameState)
            {  
                writeToLog("while PlayerCurrentGameState xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" + JSON.stringify(reconnectionObj),joiningObject.roomID);
            }
            else
            {
                writeToLog("while PlayerReconnection xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" + JSON.stringify(reconnectionObj),joiningObject.roomID);
            }
            
            if(GLOBALPARAMS.isDisposeObjects)
            {
                movableTokensObj = null;
            }
        }

        if(GLOBALPARAMS.isDisposeObjects)
        {
            playerSocketID = null;
            currentAutoplayChances = null;
            movableTokensArray = null;
            playerTokensAtBase = null;
            maxAutoplayChances= null;
            turnList = null;
            currentTurnPlayer= null;
            currentDiceVal = null;
            reconnectionObj = null;
        }
    } 
    catch (error) 
    {
        writeToLog("Error while PlayerReconnection xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" + error,joiningObject.roomID,true)
    }

    if(GLOBALPARAMS.isDisposeObjects)
    {
        joiningObject = null;
        socket  = null;
    }
}
export async function AuthPlayerToken (socket,authData)
{
    GLOBALPARAMS.isLogs && console.log("Enter inside authPlayerToken 0");
    try 
    {
        GLOBALPARAMS.isLogs && console.log("Enter inside authPlayerToken 1");
        if(GLOBALPARAMS.authEnabled)
        {
            GLOBALPARAMS.isLogs && console.log("Enter inside authPlayerToken 2");
            const {playerID,playerName,authToken} = authData;
            let isAuthneticated = false;
            const isPlayerExist = await redisClientWeb11.get(`${CHECK_FOR_USER_ID_AUTH}${playerID}`);
            if(authToken === JSON.parse(isPlayerExist)?.token)
            {
                
                GLOBALPARAMS.isLogs && console.log("Enter inside authPlayerToken 3");
                let apiSendObj = new Object();
                apiSendObj.room_id = authData.roomID,
                apiSendObj.user_id = authData.playerID;
                let isAuthenticatedObj = await ApiManager.CheckIfPlayerAssociatedWithRoom(apiSendObj);
                if(isAuthenticatedObj.authenticated)
                {
                    GLOBALPARAMS.isLogs && console.log("Enter inside authPlayerToken 4");
                    isAuthneticated = true;
                    await SendAuthsStatus(socket,true);
                    
                }
                else if(isAuthenticatedObj.apiWorking && !isAuthenticatedObj.authenticated)
                {
                    GLOBALPARAMS.isLogs && console.log("Enter inside authPlayerToken 5");
                    isAuthneticated = false;
                    await SendAuthsStatus(socket,false);
                    DisconnectSocket(socket.id);
                    
                }
                else if(!isAuthenticatedObj.apiWorking)
                {
                    GLOBALPARAMS.isLogs && console.log("Enter inside authPlayerToken 6");
                    isAuthneticated = false;
                    await SendSomenthingWentWrongStatus(socket,API_ERROR_CODES.PLAYER_ASSOCIATED_WITH_GAME_API_ERROR_CODE);
                    DisconnectSocket(socket.id);
                }
            }
            else
            {
                GLOBALPARAMS.isLogs && console.log("Enter inside authPlayerToken 7");
                const data = {
                    playerName:playerName,
                    playerID:playerID,
                    authTokenFromClient:authToken,
                    authTokenFromServer: JSON.stringify(isPlayerExist),
                    isAuth:false,
                    error:'None',
                    encryptedData:JSON.stringify(authData)
                }
                isAuthneticated = false;
                await AuthModel.add(data)
                await SendAuthsStatus(socket,false);
                DisconnectSocket(socket.id);
            }


            GLOBALPARAMS.isLogs && console.log(isAuthneticated,"isAuthneticated===>>>")
            return isAuthneticated;
        }
        else
        {
            GLOBALPARAMS.isLogs && console.log("Enter inside authPlayerToken 8");
            await SendAuthsStatus(socket,true);
            return true;

        }  
    } 
    catch (error) 
    {
        GLOBALPARAMS.isLogs && console.log("Enter inside authPlayerToken 9 "+error);
        const data = {
            playerName:'Not Found',
            playerID:'Not Found',
            authTokenFromClient:'Not Found',
            authTokenFromServer: 'Not Found',
            isAuth:false,
            error:error,
            encryptedData:JSON.stringify(authData)
        }
        
        await AuthModel.add(data)
        await SendAuthsStatus(socket,false);
        DisconnectSocket(socket.id);
        return false;
    }
    
}
