import { SendAdditionSubstractionScore, SendExtraMove, SendMoveTokenData, SendOpenTokenData, SendPlayerRankData, SendPlayerRemainingMoves, SendPlayerScore, SendTokenReachedHome } from "../listenersAndEmitters/emitters.js";
import { GLOBALPARAMS, SAFE_ZONES, TIMER_FUNCTIONS, UNSAFE_TOKENS } from "../common/gameConstants.js";
import { GetPlayerInRoom, GetPlayerTotalTokenAtHome, GetPlayerVariable, GetRoomVariable, GetWaitingTimeForMovement, SetPlayerTokenObj, SetPlayerWinRank, SetRoomVariable, StartTurnTimer, UpdatePlayerMoves, UpdatePlayerScore } from "../common/room.js"
import { GetRoomTurnList } from "./roomsManager.js";
import TimerManager from "./TimerManager.js";
import _ from 'lodash'
import { ChangeTurnAndStartTimer, SendKilledTokenBackToBase } from "./DiceRollManager.js";
import { CanKillToken, GetkillTokenReturnTime } from "./killManager.js";
import { writeToLog } from "../logs/loggerManager.js";

export async function AllocateTokenMethods(moveTokenObject) 
{
    let turnList = GetRoomTurnList(moveTokenObject.roomID);
    let currentTurnPlayerID = turnList.GetCurrentTurnPlayerData();
    let tokenPlayer = await GetPlayerInRoom(moveTokenObject.roomID, moveTokenObject.playerID);
    let token = tokenPlayer?.myTokens?.find(x => x.tokenID === moveTokenObject.tokenID);
    let tokenStateUpdating = await GetRoomVariable(moveTokenObject.roomID,"tokenStateUpdating");
    
    if (currentTurnPlayerID === token.playerID && !tokenStateUpdating) 
    {
        await SetRoomVariable(moveTokenObject.roomID,"tokenStateUpdating",true);
        writeToLog("AllocateTokenMethods ",moveTokenObject.roomID,true);
        let diceNumber = await GetRoomVariable(moveTokenObject.roomID,"currentDiceNo");
        let gameMode = await GetRoomVariable(moveTokenObject.roomID,"gameMode");
        // console.log('moveTokenObject=>>>>>>>>>>>',moveTokenObject)
        if ((gameMode === GLOBALPARAMS.gameMode.CLASSIC)&&(token.tokenStatus === "atBase")&&(diceNumber === GLOBALPARAMS.token_Open_Val)) 
        {
            writeToLog("AllocateTokenMethods OpenToken",moveTokenObject.roomID);
            //To Open Token
            await OpenToken(token, tokenPlayer);
        }
        else if (token.tokenStatus === "atRunning")
        {
            writeToLog("AllocateTokenMethods MoveToken",moveTokenObject.roomID);
            //To MoveToken
            await MoveToken(token, tokenPlayer, false);
        }

        if(GLOBALPARAMS.isDisposeObjects)
        {
            diceNumber = null;
            gameMode = null;
        }
    }
    else 
    {
        //send alert
        writeToLog("AllocateTokenMethods Playerid not matched to turn id ",moveTokenObject.roomID,true);
    }

    if(GLOBALPARAMS.isDisposeObjects)
    {
        moveTokenObject = null;
        data = null;
        turnList = null;
        currentTurnPlayerID = null;
        tokenPlayer = null;
        token = null;
        tokenStateUpdating = null;
    }

}
export function CanMoveToken(tokkenNewIndex) 
{
    GLOBALPARAMS.isLogs && console.log("CanMoveToken");
    let canMoveToken = false;
    if (tokkenNewIndex <= GLOBALPARAMS.tokenPathLastIndex) 
    {
        canMoveToken = true;
    }
    
    return canMoveToken;
}
export async function MoveToken(token, tokenPlayer,isAutoplayToken) 
{
    let tokenObjectAction = new Object();
    tokenObjectAction.roomID = tokenPlayer.roomID,
    tokenObjectAction.playerID = tokenPlayer.playerID,
    tokenObjectAction.opponentTokenCutValue  = 0,
    tokenObjectAction.myOwnTokenCutValue = 0,
    tokenObjectAction.moveTokenForwardValue = 0,
    tokenObjectAction.takeAction = false;

    let currentDiceNo = await GetRoomVariable(tokenPlayer.roomID,"currentDiceNo");
    let myCurrentPath = tokenPlayer.myPath[token.currentIndex + currentDiceNo];
    let newIndex = +token.currentIndex + +currentDiceNo;
    
    //writeToLog("MoveToken ",tokenPlayer.roomID,true);
    if (CanMoveToken(newIndex)) 
    {
        GLOBALPARAMS.isLogs && console.log("INSIDE MOVE TOKEN 2");
        let tokenStatus = GLOBALPARAMS.tokenStatus.AT_RUNNING;
        let tokenAtHome = false;
        let playerTokensAtHome = await GetPlayerTotalTokenAtHome(tokenPlayer.roomID, tokenPlayer.playerID);
        tokenObjectAction.moveTokenForwardValue = currentDiceNo;

        if (newIndex === GLOBALPARAMS.tokenPathLastIndex) 
        {
            GLOBALPARAMS.isLogs && console.log("INSIDE MOVE TOKEN 3");
            tokenStatus = GLOBALPARAMS.tokenStatus.AT_HOME;
        }
        let isTokenAtSafePosition = SAFE_ZONES.has(myCurrentPath);
        let tokenObj = {
            "tokenID": token.tokenID,
            "roomID": tokenPlayer.roomID,
            "playerID": tokenPlayer.playerID,
            "tokenStatus": tokenStatus,
            "tokenPosition": myCurrentPath,
            "isAtSafePosition": isTokenAtSafePosition,
            "currentIndex": newIndex,
            "tokenPreviosPosition" : token.tokenPosition,
        }

        await SetPlayerTokenObj(tokenPlayer.roomID, tokenPlayer.playerID, token.tokenID, tokenObj)

        if (tokenStatus === GLOBALPARAMS.tokenStatus.AT_HOME) 
        {
            GLOBALPARAMS.isLogs && console.log("INSIDE MOVE TOKEN 4");
            tokenAtHome = true;
            playerTokensAtHome = await GetPlayerTotalTokenAtHome(tokenPlayer.roomID, tokenPlayer.playerID);
        }


        SaveUnsafeTokensInMap(token,myCurrentPath,tokenObj);

        let kiledModifiedToken = await CanKillToken(myCurrentPath,token,false);
        //let IsKillingTokenTrueForBot = _.isEmpty(await CanKillToken(myCurrentPath, token, tokenPlayer)) ? false : true;
        //GLOBALPARAMS.isLogs && console.log(kiledModifiedToken,"await CanKillToken(myCurrentPath, token, tokenPlayer)",kiledModifiedToken && kiledModifiedToken.objAdd);
        let KilledToken = kiledModifiedToken && kiledModifiedToken.objAdd ? kiledModifiedToken.objAdd : undefined;
        let anyTokenKilled = false;
        let isCurrentTurnPlayerTokenKilled = false;

        GLOBALPARAMS.isLogs && console.log(KilledToken, "-=-=-=-=--KilledToken");

        let gameMode = await GetRoomVariable(tokenPlayer.roomID,"gameMode");
        GLOBALPARAMS.isLogs && console.log("GAME MODE "+gameMode);
        GLOBALPARAMS.isLogs && console.log("GLOBALPARAMS.gameMode.TIMER "+GLOBALPARAMS.gameMode.TIMER);
        GLOBALPARAMS.isLogs && console.log("GLOBALPARAMS.gameMode.MOVES "+GLOBALPARAMS.gameMode.MOVES);

        if((gameMode === GLOBALPARAMS.gameMode.MOVES) || (gameMode === GLOBALPARAMS.gameMode.TIMER))
        {
            GLOBALPARAMS.isLogs && console.log("INSIDE MOVE TOKEN 5");
            await UpdatePlayerScore(tokenPlayer.roomID,tokenPlayer.playerID,currentDiceNo,true);
            await CreateAndSendScoreObject(tokenPlayer.roomID,tokenPlayer.playerID,false,false);
            await CreateAndSendScoreAdditionSubstractionValue(tokenPlayer.roomID,tokenPlayer.playerID,currentDiceNo,true);
            GLOBALPARAMS.isLogs && console.log("(gameMode === GLOBALPARAMS.gameMode.TIMER) || (gameMode === GLOBALPARAMS.gameMode.TIMER) if condition")
        }
        else
        {
            GLOBALPARAMS.isLogs && console.log("INSIDE MOVE TOKEN 6");
            GLOBALPARAMS.isLogs && console.log("(gameMode === GLOBALPARAMS.gameMode.TIMER) || (gameMode === GLOBALPARAMS.gameMode.TIMER) else condition");
        }
        

        let tokenData = new Object();
        tokenData.token = tokenObj,
        tokenData.isAutoPlayToken = isAutoplayToken;

        writeToLog("MoveToken 1 "+JSON.stringify(tokenObj),tokenPlayer.roomID);
        await SendMoveTokenData(tokenPlayer.roomID, tokenData);
        await SetRoomVariable(tokenPlayer.roomID,"tokenEnabled",false);
        

        let turnList = GetRoomTurnList(tokenPlayer.roomID);
        if (!_.isEmpty(KilledToken)) 
        {
            GLOBALPARAMS.isLogs && console.log("INSIDE MOVE TOKEN 7");
            writeToLog("KILLED TOKEN === MoveToken 2 "+JSON.stringify(KilledToken),tokenPlayer.roomID);
            let killedTokenPlayerPath = await GetPlayerVariable(KilledToken.roomID,KilledToken.playerID,"myPath");
            let tokenPos = killedTokenPlayerPath[0];
            let currentIndex = 0;
            let tokenStatus = GLOBALPARAMS.tokenStatus.AT_RUNNING;

            if((gameMode === GLOBALPARAMS.gameMode.MOVES)||(gameMode === GLOBALPARAMS.gameMode.QUICK)||(gameMode === GLOBALPARAMS.gameMode.TIMER))
            {
                GLOBALPARAMS.isLogs && console.log("INSIDE MOVE TOKEN 8");
                KilledToken.tokenPosition = tokenPos;
                KilledToken.tokenStatus = tokenStatus;
                KilledToken.currentIndex = currentIndex;
                // GLOBALPARAMS.isLogs && console.log("inside move token kill");
            }
            anyTokenKilled = true;
            GLOBALPARAMS.isLogs && console.log(turnList.GetCurrentTurnPlayerData(),"turnList.GetCurrentTurnPlayerData()");
            GLOBALPARAMS.isLogs && console.log(currentDiceNo,"diceVal");
            if((turnList.GetCurrentTurnPlayerData() == KilledToken.playerID) && (currentDiceNo != GLOBALPARAMS.diceMaxVal))
            {
                GLOBALPARAMS.isLogs && console.log("INSIDE MOVE TOKEN 9");
                isCurrentTurnPlayerTokenKilled = true;
            }
            GLOBALPARAMS.isLogs && console.log(isCurrentTurnPlayerTokenKilled,"isCurrentTurnPlayerTokenKilled");
            SetPlayerTokenObj(KilledToken.roomID, KilledToken.playerID, KilledToken.tokenID, KilledToken)
            // GLOBALPARAMS.isLogs && console.log(token.tokenPosition + KilledToken.tokenID + KilledToken.roomID,"===========",myCurrentPath + KilledToken.tokenID + KilledToken.roomID);
            let dele = UNSAFE_TOKENS.delete(myCurrentPath + KilledToken.tokenID + KilledToken.roomID);

            if(GLOBALPARAMS.isDisposeObjects)
            {
                GLOBALPARAMS.isLogs && console.log("INSIDE MOVE TOKEN 10");
                killedTokenPlayerPath = null;
                tokenPos = null;
                currentIndex = null;
                tokenStatus = null;
                dele = null;
            }
            // GLOBALPARAMS.isLogs && console.log(dele,"====delete");
        }
        let timeStamp = await GetRoomVariable(tokenPlayer.roomID, "turnTimerTimeStamp");
        TimerManager.StopTimer(timeStamp,tokenPlayer.roomID,TIMER_FUNCTIONS.STOP_TURN_TIMER);
        
        setTimeout(async() => 
        {
            // GLOBALPARAMS.isLogs && console.log("ENTER THE TEKKEN 0");
            writeToLog("MoveToken 3 ",tokenPlayer.roomID);
            GLOBALPARAMS.isLogs && console.log("INSIDE MOVE TOKEN 11");
            // GLOBALPARAMS.isLogs && console.log(anyTokenKilled,"anyTokenKilled")
            if (currentDiceNo === GLOBALPARAMS.diceMaxVal || anyTokenKilled || tokenAtHome) 
            {
                GLOBALPARAMS.isLogs && console.log("INSIDE MOVE TOKEN 12");
                writeToLog("MoveToken 4 ",tokenPlayer.roomID);
                // GLOBALPARAMS.isLogs && console.log("ENTER THE TEKKEN 1");
                if (!_.isEmpty(KilledToken)) 
                {
                    GLOBALPARAMS.isLogs && console.log("INSIDE MOVE TOKEN 13");
                    // GLOBALPARAMS.isLogs && console.log("ENTER THE TEKKEN 2");

                    // GLOBALPARAMS.isLogs && console.log("KIlled_Token_Data "+JSON.stringify(KilledToken));
                    let killedTokenPath = await GetPlayerVariable(KilledToken.roomID,KilledToken.playerID,"myPath");
                    // GLOBALPARAMS.isLogs && console.log("killedTokenPath "+killedTokenPath);
                    let killedTokenIndex = killedTokenPath.indexOf(+KilledToken.tokenPreviosPosition);
                    // GLOBALPARAMS.isLogs && console.log("killedTokenIndex "+killedTokenIndex);
                    let totalReturnMoves = killedTokenIndex+1;

                    tokenObjectAction.opponentTokenCutValue = totalReturnMoves;
                    // GLOBALPARAMS.isLogs && console.log("totalReturnMoves "+killedTokenIndex);
                    writeToLog("MoveToken 5 totalReturnMoves "+totalReturnMoves,tokenPlayer.roomID);

                    if((gameMode === GLOBALPARAMS.gameMode.MOVES) || (gameMode === GLOBALPARAMS.gameMode.TIMER))
                    {
                        GLOBALPARAMS.isLogs && console.log("INSIDE MOVE TOKEN 14");
                        writeToLog("MoveToken 6 ",tokenPlayer.roomID);
                    
                        if(kiledModifiedToken && kiledModifiedToken.checkDoubleToken)
                        {
                            GLOBALPARAMS.isLogs && console.log("INSIDE MOVE TOKEN 15");
                            writeToLog("MoveToken 7 ",tokenPlayer.roomID);
                        
                            const otherPlayerID = await GetRoomVariable(tokenPlayer.roomID,'oppositePlayerId');
                                
                            await UpdatePlayerScore(tokenPlayer.roomID,otherPlayerID,totalReturnMoves-1,true);
                            await CreateAndSendScoreObject(tokenPlayer.roomID,otherPlayerID,true,false);
                            await SetRoomVariable(tokenPlayer.roomID,'oppositePlayerId','');
                            await CreateAndSendScoreAdditionSubstractionValue(tokenPlayer.roomID,otherPlayerID,totalReturnMoves-1,true);


                            await UpdatePlayerScore(tokenPlayer.roomID,tokenPlayer.playerID,totalReturnMoves-1,false);
                            await CreateAndSendScoreObject(tokenPlayer.roomID,tokenPlayer.playerID,false,false);
                            await CreateAndSendScoreAdditionSubstractionValue(tokenPlayer.roomID,tokenPlayer.playerID,totalReturnMoves-1,false);


                            /*let returnSubstraction = totalReturnMoves-1;

                                GLOBALPARAMS.isLogs && console.log("ENTER THE TEKKEN 3 a");
                                GLOBALPARAMS.isLogs && console.log("KilledToken.playerID "+KilledToken.playerID);
                                GLOBALPARAMS.isLogs && console.log("otherPlayerID "+otherPlayerID);
                                GLOBALPARAMS.isLogs && console.log("returnSubstraction "+returnSubstraction);
                                GLOBALPARAMS.isLogs && console.log("tokenKillingScoreAdditionalPoints "+tokenKillingScoreAdditionalPoints);*/
                            if(GLOBALPARAMS.isDisposeObjects)
                            {
                                GLOBALPARAMS.isLogs && console.log("INSIDE MOVE TOKEN 16");
                                otherPlayerID = null;
                            }

                        }
                        else
                        {
                            GLOBALPARAMS.isLogs && console.log("INSIDE MOVE TOKEN 17");
                            writeToLog("MoveToken 8 ",tokenPlayer.roomID);
                            await UpdatePlayerScore(tokenPlayer.roomID,tokenPlayer.playerID,totalReturnMoves-1,true);
                            await CreateAndSendScoreObject(tokenPlayer.roomID,tokenPlayer.playerID,true,false);
                            await CreateAndSendScoreAdditionSubstractionValue(tokenPlayer.roomID,tokenPlayer.playerID,totalReturnMoves-1,true);


                            await UpdatePlayerScore(KilledToken.roomID,KilledToken.playerID,totalReturnMoves-1,false);
                            await CreateAndSendScoreObject(KilledToken.roomID,KilledToken.playerID,false,false);
                            await CreateAndSendScoreAdditionSubstractionValue(KilledToken.roomID,KilledToken.playerID,totalReturnMoves-1,false);
                            // GLOBALPARAMS.isLogs && console.log("ENTER THE TEKKEN 3 b");
                        }
                    }
                    await SendExtraMove(tokenPlayer.roomID,"extra move");
                    await SendKilledTokenBackToBase(GetkillTokenReturnTime(totalReturnMoves),tokenPlayer.roomID,KilledToken,isCurrentTurnPlayerTokenKilled,turnList);
                    if(GLOBALPARAMS.isDisposeObjects)
                    {
                        GLOBALPARAMS.isLogs && console.log("INSIDE MOVE TOKEN 18");
                        killedTokenPath = null;
                        killedTokenIndex = null;
                        totalReturnMoves = null;
                    }
                }
                else
                {
                    // GLOBALPARAMS.isLogs && console.log("ENTER THE TEKKEN 4");
                    GLOBALPARAMS.isLogs && console.log("INSIDE MOVE TOKEN 19");
                    writeToLog("MoveToken 8 ",tokenPlayer.roomID);
                    let maxNoOfTokens = await GetRoomVariable(tokenPlayer.roomID,"noOfTokensPerPlayer");
                    let gameMode = await GetRoomVariable(tokenPlayer.roomID,"gameMode");
                    if(tokenAtHome && ((gameMode === GLOBALPARAMS.gameMode.MOVES) || (gameMode === GLOBALPARAMS.gameMode.TIMER)))
                    {
                        GLOBALPARAMS.isLogs && console.log("INSIDE MOVE TOKEN 20");
                        // GLOBALPARAMS.isLogs && console.log("ENTER THE TEKKEN 5");
                        writeToLog("MoveToken 9 ",tokenPlayer.roomID);
                        let homeReachingScoreAdditionalPoints = await GetRoomVariable(tokenPlayer.roomID,"homeReachingScoreAdditionalPoints");
                        await UpdatePlayerScore(tokenPlayer.roomID,tokenPlayer.playerID,homeReachingScoreAdditionalPoints,true);
                        await CreateAndSendScoreObject(tokenPlayer.roomID,tokenPlayer.playerID,false,true);
                        await CreateAndSendScoreAdditionSubstractionValue(tokenPlayer.roomID,tokenPlayer.playerID,homeReachingScoreAdditionalPoints,true);
                        
                        
                        if (playerTokensAtHome.length != +maxNoOfTokens) 
                        {
                            await SendTokenReachedHome(tokenPlayer.roomID,homeReachingScoreAdditionalPoints.toString());
                        }
                        if(GLOBALPARAMS.isDisposeObjects)
                        {
                            GLOBALPARAMS.isLogs && console.log("INSIDE MOVE TOKEN 21");
                            homeReachingScoreAdditionalPoints = null;
                        }
                        
                    }

                    if (playerTokensAtHome.length === +maxNoOfTokens) 
                    {
                        GLOBALPARAMS.isLogs && console.log("INSIDE MOVE TOKEN 22");
                        // GLOBALPARAMS.isLogs && console.log("ENTER THE TEKKEN 6");
                        writeToLog("MoveToken 10 ",tokenPlayer.roomID);
                        await GivePlayerRank(tokenPlayer.roomID,tokenPlayer.playerID);
                        await ChangeTurnAndStartTimer(turnList,tokenPlayer.playerID,tokenPlayer.roomID,true);
                    }
                    else
                    {

                        GLOBALPARAMS.isLogs && console.log("INSIDE MOVE TOKEN 23");
                        await SendExtraMove(tokenPlayer.roomID,"extra move");
                        // GLOBALPARAMS.isLogs && console.log("ENTER THE TEKKEN 7");
                        writeToLog("MoveToken 11 ",tokenPlayer.roomID);
                        await StartTurnTimer(tokenPlayer.roomID,250,false,true);
                    }
                    if(GLOBALPARAMS.isDisposeObjects)
                    {
                        GLOBALPARAMS.isLogs && console.log("INSIDE MOVE TOKEN 24");
                        maxNoOfTokens = null;
                        gameMode = null;
                    }
                    
                }
                
            }
            else 
            {   
                GLOBALPARAMS.isLogs && console.log("INSIDE MOVE TOKEN 25");
                // GLOBALPARAMS.isLogs && console.log("ENTER THE TEKKEN 8");
                writeToLog("MoveToken 12 ",tokenPlayer.roomID);
                let gameMode = await GetRoomVariable(tokenPlayer.roomID,"gameMode");
                if(gameMode === GLOBALPARAMS.gameMode.MOVES)
                {
                    GLOBALPARAMS.isLogs && console.log("INSIDE MOVE TOKEN 26");
                    // GLOBALPARAMS.isLogs && console.log("ENTER THE TEKKEN 9");
                    writeToLog("MoveToken 13 ",tokenPlayer.roomID);
                    if(!isAutoplayToken)
                    {
                        await UpdatePlayerMoves(tokenPlayer.roomID,tokenPlayer.playerID);
                        await CreateAndSendRemainingMovesObject(tokenPlayer.roomID,tokenPlayer.playerID);
                    }
                    
                }
                await ChangeTurnAndStartTimer(turnList,tokenPlayer.playerID,tokenPlayer.roomID,false);
                if(GLOBALPARAMS.isDisposeObjects)
                {
                    GLOBALPARAMS.isLogs && console.log("INSIDE MOVE TOKEN 27");
                    gameMode = null;
                }
            }
            if(GLOBALPARAMS.isDisposeObjects)
            {
                GLOBALPARAMS.isLogs && console.log("INSIDE MOVE TOKEN 28");
                currentDiceNo = null;
                myCurrentPath = null;
                newIndex = null;
                playerTokensAtHome = null;
                isTokenAtSafePosition = null;
                tokenObj = null;
                kiledModifiedToken = null;
                KilledToken = null;
                anyTokenKilled = null;
                isCurrentTurnPlayerTokenKilled = null;
                gameMode = null;
                tokenData = null;
                turnList = null;
                timeStamp = null;
                token = null;
                tokenPlayer = null;
                isAutoplayToken = null;

            }
            tokenObjectAction.takeAction = true;
            return tokenObjectAction;
            // GLOBALPARAMS.isLogs && console.log("ENTER THE TEKKEN 10");
            //this.ReturnToBase(KilledToken);
        }, GetWaitingTimeForMovement(GLOBALPARAMS.tokenSingleEntityMoveTime, +currentDiceNo))
    }
    else 
    {
        
        writeToLog("MoveToken 14 ",tokenPlayer.roomID);
        if(token.tokenStatus === GLOBALPARAMS.AT_RUNNING)
        {
            GLOBALPARAMS.isLogs && console.log("INSIDE MOVE TOKEN 30");
            writeToLog("MoveToken 15 ",tokenPlayer.roomID);
        }
        return tokenObjectAction;

    }

    

}
export function SaveUnsafeTokensInMap(token,myCurrentPath,tokenObj)
{

    if (UNSAFE_TOKENS.has(token.tokenPosition + token.tokenID + token.roomID)) 
    {
        UNSAFE_TOKENS.delete(token.tokenPosition + token.tokenID + token.roomID);
        if (!SAFE_ZONES.has(myCurrentPath.toString())) 
        {
            GLOBALPARAMS.isLogs && console.log(myCurrentPath + token.tokenID + token.roomID,"first log");
            UNSAFE_TOKENS.set(myCurrentPath + token.tokenID + token.roomID, tokenObj)
        }
        if (SAFE_ZONES.has(myCurrentPath.toString())) 
        {
            GLOBALPARAMS.isLogs && console.log(myCurrentPath + token.tokenID + token.roomID,"second log");
            UNSAFE_TOKENS.delete(myCurrentPath + token.tokenID + token.roomID);
        }
    } 
    else 
    {
        if (!SAFE_ZONES.has(myCurrentPath.toString())) 
        {
            GLOBALPARAMS.isLogs && console.log(token,"token");
            GLOBALPARAMS.isLogs && console.log(myCurrentPath + token.tokenID + token.roomID,"third log");
            UNSAFE_TOKENS.set(myCurrentPath + token.tokenID + token.roomID, tokenObj)
        }
        if (SAFE_ZONES.has(myCurrentPath.toString())) 
        {
            UNSAFE_TOKENS.delete(myCurrentPath + token.tokenID + token.roomID);
        }
    }
    if(GLOBALPARAMS.isDisposeObjects)
    {
        token = null;
        myCurrentPath = null;
        tokenObj = null;
    }
}
export async function CreateAndSendScoreObject(roomID,playerID,isKillScore,isHomeScore)
{
    // GLOBALPARAMS.isLogs && console.log("enter inside CreateAndSendScoreObject");
    try
    {
        let scoreData = new Object();
        scoreData.roomID = roomID,
        scoreData.playerID = playerID,
        scoreData.score = await GetPlayerVariable(roomID,playerID,"score"),
        scoreData.isKllScore = isKillScore,
        scoreData.isHomeScore = isHomeScore; 

        writeToLog("CreateAndSendScoreObject "+JSON.stringify(scoreData),roomID);

        await SendPlayerScore(roomID,scoreData); 
        if(GLOBALPARAMS.isDisposeObjects)
        {
            scoreData = null;
            roomID = null;
            playerID = null;
            isKillScore = null;
            isHomeScore = null;
        }
    }
    catch(error)
    {
        writeToLog("ERROR CreateAndSendScoreObject "+error,roomID);
    }
    
}
export async function CreateAndSendScoreAdditionSubstractionValue(roomID,playerID,value,isAddition)
{
    let updatedVal = "";
    if(isAddition)
    {
        updatedVal = "+"+value;
    }
    else
    {
        updatedVal = "-"+value;
    }
    let additionSubstractionScoreObj = new Object();
    additionSubstractionScoreObj.playerID = playerID,
    additionSubstractionScoreObj.roomID = roomID,
    additionSubstractionScoreObj.value = updatedVal;

    await SendAdditionSubstractionScore(roomID,additionSubstractionScoreObj);
}
export async function CreateAndSendRemainingMovesObject(roomID,playerID)
{
    try
    {
        //let socketID = await GetPlayerVariable(roomID,playerID,"socketID");
        //let socket = GetPlayerSocket(socketID);
        let socket = false;
    
        let remainingMovesData = new Object();
        remainingMovesData.roomID = roomID,
        remainingMovesData.playerID = playerID,
        remainingMovesData.remainingMoves = await GetPlayerVariable(roomID,playerID,"currentMovesLeft");
        writeToLog("CreateAndSendRemainingMovesObject "+JSON.stringify(remainingMovesData),roomID);
        if(socket)
        {
            writeToLog("CreateAndSendRemainingMovesObject 1",roomID);
            await SendPlayerRemainingMoves(socket,roomID,remainingMovesData,false);
        }
        else
        {
            writeToLog("CreateAndSendRemainingMovesObject 2",roomID);
            await SendPlayerRemainingMoves(socket,roomID,remainingMovesData,true);
            // GLOBALPARAMS.isLogs && console.log("SOCKET IS NULL");
        }
        if(GLOBALPARAMS.isDisposeObjects)
        {
            socketID = null;
            socket = null;
            remainingMovesData = null;
            roomID = null;
            playerID = null;
        }
    }
    catch(error)
    {
        writeToLog("ERROR CreateAndSendRemainingMovesObject "+error,roomID);
    }
}
export async function OpenToken(token, tokenPlayer) 
{
    let tokenObjectAction = new Object();
    tokenObjectAction.roomID = tokenPlayer.roomID,
    tokenObjectAction.playerID = tokenPlayer.playerID,
    tokenObjectAction.opponentTokenCutValue  = 0,
    tokenObjectAction.myOwnTokenCutValue = 0,
    tokenObjectAction.moveTokenForwardValue = 0,
    tokenObjectAction.takeAction = true;
    try
    {
        GLOBALPARAMS.isLogs && console.log("INSIDE OPEN TOKEN");
        let startingPosition = tokenPlayer.myPath[0];
        let tokenIsAtSafePostion = SAFE_ZONES.has(startingPosition);
        let tokenObj = {
            "tokenID": token.tokenID,
            "roomID": tokenPlayer.roomID,
            "playerID": tokenPlayer.playerID,
            "tokenStatus": GLOBALPARAMS.tokenStatus.AT_RUNNING,
            "tokenPosition": startingPosition,
            "isAtSafePosition": tokenIsAtSafePostion,
            "currentIndex": 0,
            "tokenPreviosPosition" : token.tokenPosition,
        }

        await SetPlayerTokenObj(tokenPlayer.roomID, tokenPlayer.playerID, token.tokenID, tokenObj);
        await SendOpenTokenData(tokenPlayer.roomID, tokenObj);
        writeToLog("OpenToken "+JSON.stringify(tokenObj),tokenPlayer.roomID,true);
        let timeStamp = await GetRoomVariable(tokenPlayer.roomID, "turnTimerTimeStamp");
        TimerManager.StopTimer(timeStamp,tokenPlayer.roomID,TIMER_FUNCTIONS.STOP_TURN_TIMER);
        await SendExtraMove(tokenPlayer.roomID,"extra move");
        await StartTurnTimer(tokenPlayer.roomID,0,false,true);

        if(GLOBALPARAMS.isDisposeObjects)
        {
            startingPosition = null;
            tokenIsAtSafePostion = null;
            tokenObj = null;
            timeStamp = null;
            token = null;
            tokenPlayer = null;
        }
        return  tokenObjectAction;
    }
    catch(error)
    {
        tokenObjectAction.takeAction = false;
        writeToLog("ERROR OpenToken "+error,tokenPlayer.roomID,true);
        return tokenObjectAction;
    }

}
export async function GivePlayerRank(roomID,playerID)
{
    writeToLog("GIVE PLAYER RANK ",roomID,true);
    await SetPlayerWinRank(roomID,playerID,true);
    let rank = await GetPlayerVariable(roomID, playerID, 'rank')
    let newObj = {
        "roomID": roomID,
        "playerID": playerID,
        "rank": rank
    }
    writeToLog("GIVE PLAYER RANK 1 "+JSON.stringify(newObj),roomID);
    
    await SendPlayerRankData(roomID, newObj);

    if(GLOBALPARAMS.isDisposeObjects)
    {
        rank = null;
        newObj = null;
        roomID = null;
        playerID = null;
    }
}
