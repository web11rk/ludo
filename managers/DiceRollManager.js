
import { GLOBALPARAMS, LUDO_ROOM_PLAYER_DATA, TIMER_FUNCTIONS } from '../common/gameConstants.js';
import { GetOpponentsAllTokensSumOfIndex, GetOpponentsPlayersID, GetOpponentsTokensPositions, GetPlayerInRoom, GetPlayerMovableTokens, GetPlayerTokenStatusArray, GetPlayerVariable, GetRoomVariable, SetPlayerVariable, SetRoomVariable, StartTurnTimer, UpdatePlayerMoves } from '../common/room.js';
import { SendDiceData, SendKilledTokenData, SendPlayerMovableTokensData } from '../listenersAndEmitters/emitters.js';
import { CreateAndSendRemainingMovesObject, MoveToken, OpenToken } from './tokenManager.js';
import TimerManager from './TimerManager.js';
import { GetRoomTurnList } from './roomsManager.js';
import { writeToLog } from '../logs/loggerManager.js';
import redisClient from '../config/redisClient.js';


export function RollDice(minDiceValue, maxDiceValue) 
{
    return Math.floor(Math.random() * (maxDiceValue - minDiceValue + 1)) + minDiceValue;
    //return Math.floor(Math.random() * (6 - 5 + 1)) + 5;
    //  return 5;
}
export async function GetDiceValue(roomID,playerID,haveSix) 
{
    GLOBALPARAMS.isLogs && console.log("Enter GetDiceValue *1");
    try
    {
        let diceValue;
        let playerDetails = await GetPlayerInRoom(roomID, playerID);
        let notSixCount = await GetPlayerVariable(roomID,playerID,"notSixCount");
        let gameMode = await GetRoomVariable(roomID,"gameMode");
        let nextDiceValue = await GetRoomVariable(roomID,"nextDiceNo");
        const previousDiceNo = await GetRoomVariable(roomID,"currentDiceNo");

        GLOBALPARAMS.isLogs && console.log("Enter GetDiceValue 1");
        if(gameMode === GLOBALPARAMS.gameMode.CLASSIC){
            await ThreeTokenAtHome(roomID,playerID)
        }
        // let playerTokensAtHome = await GetPlayerTokenStatusArray(null,roomID,playerID,GLOBALPARAMS.tokenStatus.AT_HOME,false);
        // console.log('Player Token At Home',playerTokensAtHome)
        
        if(notSixCount <= GLOBALPARAMS.maxChancesToHaveASix)
        {
            GLOBALPARAMS.isLogs && console.log("Enter GetDiceValue 2");
            if ((playerDetails.consecutiveSixCount >= GLOBALPARAMS.turnMaxSixCount) || !haveSix) 
            {
                GLOBALPARAMS.isLogs && console.log("Enter GetDiceValue 3");
                if(nextDiceValue < 1)
                {
                    // console.log("Enter RollDice 1");
                    // let isWinnigDiceValue = await GetRoomVariable(roomID,'before20IndexIsWin')
                    // console.log('||||||||||||isWinnigDiceValue RollDice 1',isWinnigDiceValue)
                    diceValue = RollDice(GLOBALPARAMS.diceMinVal, GLOBALPARAMS.consecutiveTripleSixMaxVal)
                }
                else
                {
                    diceValue = nextDiceValue;
                }
                
                if(gameMode === GLOBALPARAMS.gameMode.CLASSIC)
                {
                    GLOBALPARAMS.isLogs && console.log("Enter GetDiceValue 4");
                    notSixCount++;
                    await SetPlayerVariable(roomID, playerID, "notSixCount", notSixCount);
                }
                
            }
            else
            {
                GLOBALPARAMS.isLogs && console.log("Enter GetDiceValue 5");
                if(nextDiceValue < 1)
                {
                    // console.log("Enter RollDice 2");
                    if(gameMode === GLOBALPARAMS.gameMode.CLASSIC){
                        let isWinnigDiceValue = await GetPlayerVariable(roomID,playerID,'before20IndexIsWin')
                        // console.log('||||||||||||isWinnigDiceValue RollDice 4',isWinnigDiceValue)
                        if(isWinnigDiceValue){
                            let getSinglePlayer = await redisClient.get(`${LUDO_ROOM_PLAYER_DATA}:${roomID}:${playerID}`)
                            let jsonString = JSON.parse(getSinglePlayer);
                            const list = jsonString?.myTokens?.filter((x => x.tokenStatus != GLOBALPARAMS.tokenStatus.AT_HOME));
                            // console.log('=======list',list)
                            let currentIndexOfLastToken = list[0].currentIndex
                            // console.log('=======currentIndexOfLastToken',currentIndexOfLastToken)
                            let lastDiceNumber =  Number(GLOBALPARAMS.tokenPathLastIndex) - Number(currentIndexOfLastToken)
                            // console.log('||||||||||||isWinnigDiceValue RollDice 2',isWinnigDiceValue,lastDiceNumber)
                            diceValue = lastDiceNumber
                        }else{
                            diceValue = RollDice(GLOBALPARAMS.diceMinVal, GLOBALPARAMS.diceMaxVal);
                        }
                    }else{
                        diceValue = RollDice(GLOBALPARAMS.diceMinVal, GLOBALPARAMS.diceMaxVal);
                    }
                }
                else
                {
                    diceValue = nextDiceValue;
                }
                
                //diceValue = RollDice(GLOBALPARAMS.diceMinVal, GLOBALPARAMS.consecutiveTripleSixMaxVal)
        
                if(diceValue === GLOBALPARAMS.diceMaxVal)
                {
                    GLOBALPARAMS.isLogs && console.log("Enter GetDiceValue 6");
                    let playerConsecutiveSixCount = +playerDetails.consecutiveSixCount + 1;
                    await SetPlayerVariable(roomID, playerID, "consecutiveSixCount", playerConsecutiveSixCount);
                    if(gameMode === GLOBALPARAMS.gameMode.CLASSIC)
                    {
                        GLOBALPARAMS.isLogs && console.log("Enter GetDiceValue 7");
                        await SetPlayerVariable(roomID, playerID, "notSixCount", 0);
                    }
                    if(GLOBALPARAMS.isDisposeObjects)
                    {
                        GLOBALPARAMS.isLogs && console.log("Enter GetDiceValue 8");
                        playerConsecutiveSixCount = null;
                    }
                    
                }
                else
                {
                    GLOBALPARAMS.isLogs && console.log("Enter GetDiceValue 9");
                    if(gameMode === GLOBALPARAMS.gameMode.CLASSIC)
                    {
                        GLOBALPARAMS.isLogs && console.log("Enter GetDiceValue 10");
                        notSixCount++;
                        await SetPlayerVariable(roomID, playerID, "notSixCount", notSixCount);
                    }
                    
                }
                GLOBALPARAMS.isLogs && console.log("Enter GetDiceValue 11");
                
            }
            
        }  
        else
        {
            GLOBALPARAMS.isLogs && console.log("Enter GetDiceValue 12");
            if(gameMode === GLOBALPARAMS.gameMode.CLASSIC)
            {
                GLOBALPARAMS.isLogs && console.log("Enter GetDiceValue 13");
                diceValue = 6;
                await SetPlayerVariable(roomID, playerID, "notSixCount", 0);
                let playerConsecutiveSixCount = +playerDetails.consecutiveSixCount + 1;
                await SetPlayerVariable(roomID, playerID, "consecutiveSixCount", playerConsecutiveSixCount);
                if(GLOBALPARAMS.isDisposeObjects)
                {
                    GLOBALPARAMS.isLogs && console.log("Enter GetDiceValue 14");
                    playerConsecutiveSixCount = null;
                }
            }
            
        } 


        await SetPlayerVariable(roomID,playerID,"previousDiceVal",previousDiceNo);
        await SetRoomVariable(roomID,"currentDiceNo",diceValue);
        
        writeToLog("CURRENT DICE VALUE ****************** "+diceValue,roomID,true);
        if(GLOBALPARAMS.isDisposeObjects)
        {
            GLOBALPARAMS.isLogs && console.log("Enter GetDiceValue 15");
            playerDetails = null;
            notSixCount = null;
            gameMode= null;

        }
        GLOBALPARAMS.isLogs && console.log("Enter GetDiceValue 16 "+diceValue);
    
        return diceValue; 
    }
    catch(error)
    {
        writeToLog("ERROR GetDiceValue xxxxxxxxxxxxxxxxxxxxx "+error,roomID,true);
        GLOBALPARAMS.isLogs && console.log("Enter GetDiceValue *2");
    }
}
export async function GetNonTieMatchDiceValue(roomID,playerID)
{
    writeToLog("INSIDE GetNonTieMatchDiceValue 0 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx " ,roomID,true);
    let myScore = await GetPlayerVariable(roomID,playerID,"score");
    writeToLog("MyScore  "+myScore,roomID,false);
    let previousDiceNo = await GetRoomVariable(roomID,"currentDiceNo");
    let totalPlayersInGame = await GetRoomVariable(roomID,"roomMaxPlayerCount");
    let opponentsPlayerID = await GetOpponentsPlayersID(roomID,playerID);
    let opponentScore;
    let diffrenceInScore;
    let diceVal = 1;
    
    if(totalPlayersInGame === 2)
    {
        writeToLog("INSIDE GetNonTieMatchDiceValue 1 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx ",roomID,false);
        if(opponentsPlayerID.length > 0)
        {
            writeToLog("INSIDE GetNonTieMatchDiceValue 2 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx ",roomID,false);
            opponentScore = await GetPlayerVariable(roomID,opponentsPlayerID[0],"score");
            writeToLog("opponentScore  "+opponentScore,roomID,false);
            if(opponentScore > myScore)
            {
                writeToLog("INSIDE GetNonTieMatchDiceValue 3 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx ",roomID,false);
                diffrenceInScore = myScore-opponentScore;
                writeToLog("diffrenceInScore  "+diffrenceInScore,roomID,false);
                if(diffrenceInScore >= 6)
                {
                    writeToLog("INSIDE GetNonTieMatchDiceValue 4 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx ",roomID,false);
                    console.log("Enter RollDice 3");
                    diceVal =  RollDice(GLOBALPARAMS.diceMinVal, GLOBALPARAMS.consecutiveTripleSixMaxVal);
                }
                else
                {
                    writeToLog("INSIDE GetNonTieMatchDiceValue 5 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx ",roomID,false);
                    let adjustedMaxDiceVal = diffrenceInScore >= GLOBALPARAMS.diceMinVal && diffrenceInScore < GLOBALPARAMS.consecutiveTripleSixMaxVal ? GLOBALPARAMS.consecutiveTripleSixMaxVal - 1 : GLOBALPARAMS.consecutiveTripleSixMaxVal;
                    writeToLog("adjustedMaxDiceVal  "+adjustedMaxDiceVal,roomID,false);
                    console.log("Enter RollDice 4");
                    diceVal =  RollDice(GLOBALPARAMS.diceMinVal,adjustedMaxDiceVal); 
                    writeToLog("diceVal  a "+diceVal,roomID,false);                  
                    if (diceVal >= diffrenceInScore) 
                    {
                        writeToLog("INSIDE GetNonTieMatchDiceValue 6 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx ",roomID,false);
                        diceVal++;
                        writeToLog("diceVal  b "+diceVal,roomID,false); 
                    }
                }
            }
            else
            {
                writeToLog("INSIDE GetNonTieMatchDiceValue 7 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx ",roomID,false);
                diceVal =  RollDice(GLOBALPARAMS.diceMinVal, GLOBALPARAMS.consecutiveTripleSixMaxVal);
            }
            
        }
        else
        {
            writeToLog("INSIDE GetNonTieMatchDiceValue 8 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx ",roomID,false);
            console.log("Enter RollDice 6");
            diceVal =  RollDice(GLOBALPARAMS.diceMinVal, GLOBALPARAMS.consecutiveTripleSixMaxVal);
        }
        await SetPlayerVariable(roomID,playerID,"previousDiceVal",previousDiceNo);
        await SetRoomVariable(roomID,"currentDiceNo",diceVal);
        writeToLog("diceVal  return "+diceVal,roomID,false); 
        return diceVal;
    }
    else
    {
        writeToLog("INSIDE GetNonTieMatchDiceValue 9 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx ",roomID,false);
        return diceVal;
    }

}
export async function DiceRollActions(socket,diceObject)
{
    try
    {
        let turnList = GetRoomTurnList(diceObject.roomID);
        GLOBALPARAMS.isLogs && console.log("currentTurnPlayerID "+turnList.GetCurrentTurnPlayerData());
        GLOBALPARAMS.isLogs && console.log("diceObject.playerID "+diceObject.playerID);
        //console.log("dice roll actions 0");
        writeToLog("DiceRollActions 1",diceObject.roomID,true);
        if(turnList.GetCurrentTurnPlayerData() === diceObject.playerID)
        {
            
            //console.log("dice roll actions 1");
            let currentDiceVal = await GetRoomVariable(diceObject.roomID,"currentDiceNo");
            await SendDiceData(socket,diceObject.roomID,diceObject,false);
            writeToLog("DiceRollActions 2"+JSON.stringify(diceObject),diceObject.roomID);
            let turnList = GetRoomTurnList(diceObject.roomID);
            let moveableTokenArray = await GetPlayerMovableTokens(diceObject.roomID,diceObject.playerID,currentDiceVal,false);
            let playerTokensAtBase = await GetPlayerTokenStatusArray(null,diceObject.roomID,diceObject.playerID,GLOBALPARAMS.tokenStatus.AT_BASE,false);
            GLOBALPARAMS.isLogs && console.log("moveableTokenArray "+moveableTokenArray);
            GLOBALPARAMS.isLogs && console.log("playerTokensAtBase "+playerTokensAtBase);
    
            if(currentDiceVal != GLOBALPARAMS.diceMaxVal)
            {
                writeToLog("DiceRollActions 3",diceObject.roomID);
                //console.log("dice roll actions 2");
                if(moveableTokenArray.length < 1) 
                {
                    //console.log("dice roll actions 3");

                    writeToLog("DiceRollActions 4",diceObject.roomID);
                    let turnTimerTimeStamp = await GetRoomVariable(diceObject.roomID,"turnTimerTimeStamp");
                    TimerManager.StopTimer(turnTimerTimeStamp,diceObject.roomID,TIMER_FUNCTIONS.STOP_TURN_TIMER);
                    let currentTurn = turnList.GetCurrentTurnPlayerData(diceObject.roomID);
                    await SetRoomVariable(diceObject.roomID,"previousTurnId",currentTurn);
                    let gameMode = await GetRoomVariable(diceObject.roomID,"gameMode");
                    if(gameMode === GLOBALPARAMS.gameMode.MOVES)
                    {
                        GLOBALPARAMS.isLogs && console.log("dice roll actions 4");
                        
                        await UpdatePlayerMoves(diceObject.roomID,currentTurn);
                        await CreateAndSendRemainingMovesObject(diceObject.roomID,currentTurn);
                    }
                    turnList.ChangeTurn(diceObject.roomID);
                    //await UpdateDiceRolledFlag(diceObject.roomID,true);
                    await StartTurnTimer(diceObject.roomID,1000,false,true);
                    //console.log("dice roll actions 3");
                    
                    if(GLOBALPARAMS.isDisposeObjects)
                    {
                        turnTimerTimeStamp = null;
                        currentTurn = null;
                        gameMode = null;
                    }
                    
                    return false;
                    
                }
                else if(moveableTokenArray.length === 1)
                {
                    writeToLog("DiceRollActions 5",diceObject.roomID);
                    //console.log("dice roll actions 5");
                    let token = moveableTokenArray[0];
                    let tokenPlayer = await GetPlayerInRoom(token.roomID,token.playerID);
                    AutoMoveToken(token,tokenPlayer,currentDiceVal,token.roomID);
                    if(GLOBALPARAMS.isDisposeObjects)
                    {
                        token = null;
                        tokenPlayer= null;
                    }
                    return false;
                }
                else
                {
                    writeToLog("DiceRollActions 6",diceObject.roomID);
                    //console.log("dice roll actions 6");
                    let allMovableTokens = moveableTokenArray;
                    let turnTimerTimeStamp = await GetRoomVariable(diceObject.roomID,"turnTimerTimeStamp");
                    TimerManager.StopTimer(turnTimerTimeStamp,diceObject.roomID,TIMER_FUNCTIONS.STOP_TURN_TIMER);
                    setTimeout(async()=>
                    {
                        //console.log("dice roll actions 7");
                        writeToLog("DiceRollActions 7",diceObject.roomID);
                        let movableTokensObj = new Object();
                        movableTokensObj.roomID = diceObject.roomID,
                        movableTokensObj.currentTurnPlayerID = diceObject.playerID,
                        movableTokensObj.movableTokkenArray = allMovableTokens;
                        await StartTurnTimer(diceObject.roomID,0,true,false);
                        //console.log("dice roll actions 6");
                        await UpdateDiceRolledFlag(diceObject.roomID,true);
                        await SendPlayerMovableTokensData(socket,diceObject.roomID,movableTokensObj,true);
                        GLOBALPARAMS.isLogs && console.log("you have to move your token yourself");
                        if(GLOBALPARAMS.isDisposeObjects)
                        {
                            allMovableTokens = null;
                            turnTimerTimeStamp= null;
                            movableTokensObj = null;
                        }
                    },100)
                    
                    return true;
                }
            }
            else
            {
                //console.log("dice roll actions 8");
                writeToLog("DiceRollActions 8",diceObject.roomID);
                GLOBALPARAMS.isLogs && console.log("moveableTokenArray.length "+moveableTokenArray.length);
                GLOBALPARAMS.isLogs && console.log(" playerTokensAtBase.length "+ playerTokensAtBase.length);
                if(moveableTokenArray.length < 1 && playerTokensAtBase.length === 0)
                {
                    //console.log("dice roll actions 9");
                    writeToLog("DiceRollActions 9",diceObject.roomID);
                    let turnTimerTimeStamp = await GetRoomVariable(diceObject.roomID,"turnTimerTimeStamp");
                    TimerManager.StopTimer(turnTimerTimeStamp,diceObject.roomID,TIMER_FUNCTIONS.STOP_TURN_TIMER);
                    let currentTurn = turnList.GetCurrentTurnPlayerData(diceObject.roomID);
                    await SetRoomVariable(diceObject.roomID,"previousTurnId",currentTurn);
                    let gameMode = await GetRoomVariable(diceObject.roomID,"gameMode");
                    if(gameMode === GLOBALPARAMS.gameMode.MOVES)
                    {
                        //console.log("dice roll actions 10");
                        writeToLog("DiceRollActions 10",diceObject.roomID);
                        GLOBALPARAMS.isLogs && console.log("INSIDE DiceRollActions 10");
                        await UpdatePlayerMoves(diceObject.roomID,currentTurn);
                        await CreateAndSendRemainingMovesObject(diceObject.roomID,currentTurn);
                    }
                    turnList.ChangeTurn(diceObject.roomID);
                    await StartTurnTimer(diceObject.roomID,1000,false,true);
                    //console.log("dice roll actions 8");
                    await UpdateDiceRolledFlag(diceObject.roomID,true);
                    if(GLOBALPARAMS.isDisposeObjects)
                    {
                        turnTimerTimeStamp = null;
                        currentTurn = null;
                        gameMode = null;
                    }
                    
                    return false;
                }
                else if(moveableTokenArray.length < 1 && playerTokensAtBase.length === 1)
                {
                    //console.log("dice roll actions 11");
                    writeToLog("DiceRollActions 11",diceObject.roomID);
                    let tokenPlayer = await GetPlayerInRoom(diceObject.roomID,diceObject.playerID);
                    setTimeout(async()=>
                    {
                        GLOBALPARAMS.isLogs && console.log("dice roll actions 12");
                        writeToLog("DiceRollActions 12",diceObject.roomID);
                        await OpenToken(playerTokensAtBase[0],tokenPlayer);
                        if(GLOBALPARAMS.isDisposeObjects)
                        {
                            tokenPlayer = null;
                        }
                
                    },500)
                    return false;
                    
                }
                else if(moveableTokenArray.length === 1 && playerTokensAtBase.length === 0)
                {
                    //console.log("dice roll actions 14");
                    let token = moveableTokenArray[0];
                    writeToLog("DiceRollActions 13",diceObject.roomID);
                    let tokenPlayer = await GetPlayerInRoom(token.roomID,token.playerID);
                    AutoMoveToken(token,tokenPlayer,currentDiceVal,token.roomID);
                    if(GLOBALPARAMS.isDisposeObjects)
                    {
                        token = null;
                        tokenPlayer = null;
                    }
                    return false;
                }
                else 
                {
                    //console.log("dice roll actions 15");
                    writeToLog("DiceRollActions 14",diceObject.roomID);
                    let turnTimerTimeStamp = await GetRoomVariable(diceObject.roomID,"turnTimerTimeStamp");
                    TimerManager.StopTimer(turnTimerTimeStamp,diceObject.roomID,TIMER_FUNCTIONS.STOP_TURN_TIMER);
                    setTimeout(async()=>
                    {
                        
                        GLOBALPARAMS.isLogs && console.log("dice roll actions 16 "+JSON.stringify(diceObject));
                        writeToLog("DiceRollActions 15",diceObject.roomID);
                        let allMovableTokens = [...moveableTokenArray,...playerTokensAtBase];
                        let movableTokensObj = new Object();
                        movableTokensObj.roomID = diceObject.roomID,
                        movableTokensObj.currentTurnPlayerID = diceObject.playerID,
                        movableTokensObj.movableTokkenArray = allMovableTokens;
                        await StartTurnTimer(diceObject.roomID,0,true,false);
                        //console.log("dice roll actions 15");
                        await UpdateDiceRolledFlag(diceObject.roomID,true);
                        await SendPlayerMovableTokensData(socket,diceObject.roomID,movableTokensObj,true);
                        GLOBALPARAMS.isLogs && console.log("dice max value condition");
                        if(GLOBALPARAMS.isDisposeObjects)
                        {
                            turnTimerTimeStamp = null;
                            allMovableTokens= null;
                            movableTokensObj= null;
                        }
                       
                    },200)
                    
                    return true;
                    
                    
                }
                
            } 
            if(GLOBALPARAMS.isDisposeObjects)
            {
                currentDiceVal = null;
                moveableTokenArray = null;
                playerTokensAtBase = null;
                turnList = null;
            }
        }
        else
        {
            writeToLog("DiceRollActions 16 "+"cannot roll dice",diceObject.roomID);
            //console.log("dice roll actions 17");
            GLOBALPARAMS.isLogs && console.log("cannot roll dice");
        }
        if(GLOBALPARAMS.isDisposeObjects)
        {
            turnList = null;
        }
    }
    catch(error)
    {
        writeToLog("ERROR DiceRollActions  "+error,diceObject.roomID,true);
    }
    if(GLOBALPARAMS.isDisposeObjects)
    {
        //diceObject = null;
    }

}
export async function UpdateDiceRolledFlag(roomID,flagValue)
{
    await SetRoomVariable(roomID,"diceRolled",flagValue);
    //console.log("diceRolled updated "+flagValue);
    
}
export async function AutoMoveToken(token,tokenPlayer,diceValue,roomID)
{
    setTimeout(async()=>
    {
        GLOBALPARAMS.isLogs && console.log("inside auto move token");
        await MoveToken(token,tokenPlayer,false); 
    },500) 
}
export async function ChangeTurnAndStartTimer(turnList,playerID,roomID,deletePlayer)
{
    try
    {
        let currentTurn = turnList.GetCurrentTurnPlayerData(roomID);
        await SetPlayerVariable(roomID, playerID, "consecutiveSixCount", 0);
        await SetRoomVariable(roomID,"previousTurnId",currentTurn);
        if(deletePlayer)
        {
            turnList.DeleteNode(currentTurn) 
        }
        else
        {
            turnList.ChangeTurn(roomID);
        }
        await StartTurnTimer(roomID,0,false,true);
        writeToLog("ChangeTurnAndStartTimer xxxxxxxxxxxxxxxxxxxxxxxxxx",roomID,true);
        if(GLOBALPARAMS.isDisposeObjects)
        {
            currentTurn = null;
        }
    }
    catch(error)
    {
        writeToLog("ERROR ChangeTurnAndStartTimer xxxxxxxxxxxxxxxxxxxxxxx"+error,roomID,true);
    }
    
    /*if(gameMode === GLOBALPARAMS.gameMode.MOVES)
    {
        let movesLeft = 0;
        const noOfPlayers = await GetRoomVariable(roomID,"roomMaxPlayerCount");
        let currentChangeTurnCount = 0;
        while((movesLeft < 1) && (currentChangeTurnCount < noOfPlayers))
        {
            currentTurn = turnList.GetCurrentTurnPlayerData(roomID);
            movesLeft = await GetPlayerVariable(roomID,currentTurn,"currentMovesLeft");
            if(movesLeft < 1)
            {   
                turnList.ChangeTurn();
                currentChangeTurnCount++;
            }
        }
        
       
    }
    await SetPlayerVariable(roomID, playerID, "consecutiveSixCount", 0);
    await StartTurnTimer(roomID,0,false,true);*/
    
}
export async function SendKilledTokenBackToBase(waitingTime,roomID,killedToken,isCurrentTurnPlayerTokenKilled,turnList)
{
    GLOBALPARAMS.isLogs && console.log("Inside killed token back to base "+JSON.stringify(killedToken));
    let turnTimerTimeStamp = await GetRoomVariable(roomID,"turnTimerTimeStamp");
    if(isCurrentTurnPlayerTokenKilled)
    {
        let currentTurn = turnList.GetCurrentTurnPlayerData(roomID);
        await SetRoomVariable(roomID,"previousTurnId",currentTurn);
        TimerManager.StopTimer(turnTimerTimeStamp,roomID,TIMER_FUNCTIONS.STOP_TURN_TIMER);
        turnList.ChangeTurn(roomID);
        if(GLOBALPARAMS.isDisposeObjects)
        {
            currentTurn = null;
        }
    }
    // GLOBALPARAMS.isLogs && console.log(" Return Time inside SendKilledTokenBackToBase "+waitingTime);
    await SendKilledTokenData(roomID, killedToken);
    setTimeout(async()=>
    {   
        await StartTurnTimer(roomID,0,false,true);
        if(GLOBALPARAMS.isDisposeObjects)
        {
            turnTimerTimeStamp = null;
        }
        
    },waitingTime)
    
}

export const ThreeTokenAtHome  = async (roomID,playerID) => {
   try {
    let playerTokensAtHome = await GetPlayerTokenStatusArray(null,roomID,playerID,GLOBALPARAMS.tokenStatus.AT_HOME,false);
    let noOfTokensPerPlayer = await GetRoomVariable(roomID,'noOfTokensPerPlayer')
    // console.log('PlayerTokensAtHome Length',playerTokensAtHome.length)
    if(playerTokensAtHome.length >= (Number(noOfTokensPerPlayer)-1)){
        let getSinglePlayer = await redisClient.get(`${LUDO_ROOM_PLAYER_DATA}:${roomID}:${playerID}`)
        // console.log('>>>>getSinglePlayer',getSinglePlayer)
        let jsonString = JSON.parse(getSinglePlayer);
        // console.log('>>>>jsonString',jsonString)
        const list = jsonString?.myTokens?.filter((x => x.tokenStatus != GLOBALPARAMS.tokenStatus.AT_HOME));

        // console.log('>>>>jsonString',list)
        let lastTokenIndex = list[0].currentIndex
        // console.log('---------->lastTokenIndex1',lastTokenIndex)
        if(lastTokenIndex > 51){
            // console.log('---------->lastTokenIndex2',lastTokenIndex)
            let opponentsPlayerID = await GetOpponentsPlayersID(roomID,playerID);
            let totalOppositeTokenIndex = await GetOpponentsAllTokensSumOfIndex(roomID,opponentsPlayerID);
            // console.log('---------.......totalOppositeTokenIndex',totalOppositeTokenIndex)
            let totalIndex = Number(GLOBALPARAMS.tokenPathLastIndex)*Number(noOfTokensPerPlayer)-25
            // console.log('---------.......______totalIndex',totalIndex)
            if(totalIndex > totalOppositeTokenIndex){
                let countLastTokenAtHome = await GetPlayerVariable(roomID,playerID,'countLastTokenAtHome')
                // console.log('---->>>countLastTokenAtHome',countLastTokenAtHome)
                let turnForWin = await GetPlayerVariable(roomID,playerID,'turnForWin')
                if(turnForWin <= 0){
                    let dynamicNo = Math.floor(Math.random() * 4) + 1
                    // console.log('---->>>Turn Should Be dynamicNo',dynamicNo)
                    await SetPlayerVariable(roomID,playerID,'turnForWin',dynamicNo) 
                }
                
                // console.log('---->>>Turn Should Be countLastTokenAtHome',countLastTokenAtHome)
                // console.log('---->>>Turn Should Be turnForWin',turnForWin)
                // console.log('---->>>Turn Should Be turnForWin Conditin',countLastTokenAtHome == turnForWin)
                if(countLastTokenAtHome == turnForWin){
                    await SetPlayerVariable(roomID,playerID,'before20IndexIsWin',true)
                }
                // console.log('Count Last Token AtHome---+',countLastTokenAtHome)
                let count = Number(countLastTokenAtHome)+1
                await SetPlayerVariable(roomID,playerID,'countLastTokenAtHome',count)
            }
        }
    }
   } catch (error) {
        console.log('Three-Token-At-Home',error)
   }
}