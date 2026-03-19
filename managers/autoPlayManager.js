
import { GLOBALPARAMS } from "../common/gameConstants.js";
import { GetPlayerInRoom, GetPlayerMovableTokens, GetPlayerTokenStatusArray, GetPlayerVariable, GetRoomVariable, SetPlayerVariable, SetRoomVariable } from "../common/room.js";
import { GetRoomTurnList } from "./roomsManager.js";
import { ChangeTurnAndStartTimer, DiceRollActions } from "./DiceRollManager.js";
import { MoveToken, OpenToken } from "./tokenManager.js";
import { SendAutoPlayDiceRollData, SendAutoPlayRunning } from "../listenersAndEmitters/emitters.js";
import { GetPlayerSocket } from "./socketManager.js";
import { writeToLog } from "../logs/loggerManager.js";



export async function StartAutoplay(roomID,playerID)
{ 
  //console.log("Inside StartAutoplay 0");
  let isDiceRolled = await GetRoomVariable(roomID,"diceRolled");
  //console.log("isDiceRolled "+isDiceRolled);

  const playerSocketID = await GetPlayerVariable(roomID,playerID,"socketID");
  //console.log("playerSocketID "+playerSocketID);
  const socket = GetPlayerSocket(playerSocketID);

  if(socket != null)
  {
    await SendAutoPlayRunning(socket,"autoplayRunning");
  }


  if(isDiceRolled)
  {
    //console.log("Inside StartAutoplay 1");
    await AutoplayActions(roomID,playerID);
  }
  else
  {
    
    const diceVal = await GetRoomVariable(roomID,"currentDiceNo");
    let autoplayDiceRollObj = new Object();
    autoplayDiceRollObj.playerID = playerID,
    autoplayDiceRollObj.roomID = roomID,
    autoplayDiceRollObj.diceValue = diceVal;

    await SendAutoPlayDiceRollData(roomID,autoplayDiceRollObj);
    //console.log("Inside StartAutoplay 2");
    setTimeout(async()=>
    {
      //console.log("Inside StartAutoplay 6");
      await AutoplayActions(roomID,playerID);
    },500) 
    
  }
  
  
}
export async function AutoplayActions(roomID,playerID)
{
  //console.log("Inside AutoplayActions 1");
  const diceValue = await GetRoomVariable(roomID,"currentDiceNo");
  const playerTokensAtBase = await GetPlayerTokenStatusArray(null,roomID,playerID,GLOBALPARAMS.tokenStatus.AT_BASE,false);
  const moveableTokenArray = await GetPlayerMovableTokens(roomID,playerID,diceValue,false);
  const tokenPlayer = await GetPlayerInRoom(roomID, playerID);
  const gameMode = await GetRoomVariable(roomID,"gameMode");
  const turnList = GetRoomTurnList(roomID);

  let autoplayLogObj = new Object();
  autoplayLogObj.playerName = await GetPlayerVariable(roomID,playerID,"playerName"),
  autoplayLogObj.playerID = playerID,
  autoplayLogObj.roomID = roomID;
  
  writeToLog("AUTOPLAY RUNNING xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx " +JSON.stringify(autoplayLogObj),roomID,true);
  //openTokenCondition if no other token is movable
  if(moveableTokenArray.length < 1)
  {
    //console.log("Inside AutoplayActions 2");
    if(IsTokenOpenable(playerTokensAtBase,diceValue,gameMode))
    {
      //console.log("Inside AutoplayActions 3");
      await OpenToken(playerTokensAtBase[0],tokenPlayer);
    }
    else
    {
      //console.log("Inside AutoplayActions 4");
      await ChangeTurnAndStartTimer(turnList,playerID,roomID,false);
    }
  }
  else
  {
      //console.log("Inside AutoplayActions 5");
    // if we have only 1 movable token
    if(moveableTokenArray.length === 1)
    {
      //console.log("Inside AutoplayActions 6");
      if(IsTokenOpenable(playerTokensAtBase,diceValue,gameMode))
      {
        //console.log("Inside AutoplayActions 7");
        await OpenToken(playerTokensAtBase[0],tokenPlayer);
      }
      else
      {
        //console.log("Inside AutoplayActions 8");
        await MoveToken(moveableTokenArray[0],tokenPlayer,true); 
      }
    }
    //if we have more than 1 movable token
    else
    {
      //console.log("Inside AutoplayActions 9");
      if(IsTokenOpenable(playerTokensAtBase,diceValue,gameMode))
      {
        //console.log("Inside AutoplayActions 10");
        await OpenToken(playerTokensAtBase[0],tokenPlayer);
      }
      else
      {
        //console.log("Inside AutoplayActions 11");
        const movableTokenIndex = Math.floor(Math.random() * ((moveableTokenArray.length - 1) - 0 + 1)) + 0;
        await MoveToken(moveableTokenArray[movableTokenIndex],tokenPlayer,true); 
      }
    
    }
  }
}
export function IsTokenOpenable(playerTokensAtBase,diceValue,gameMode)
{
  //console.log("Inside IsTokenOpenable 1");
  let tokenOpenable = false;
  if((playerTokensAtBase.length > 0) && (diceValue === GLOBALPARAMS.diceMaxVal) && (gameMode === GLOBALPARAMS.gameMode.CLASSIC))
  {
    //console.log("Inside IsTokenOpenable 2");
    tokenOpenable = true;
  }
  return tokenOpenable;
  
}

export function GetLongAndShortRunToken(tokenArray,wantShortRunToken)
{
  let selectedtoken = tokenArray[0];
  for(let i=1;i<tokenArray.length;i++)
  {
    if(wantShortRunToken)
    {
      if(tokenArray[i].currentIndex < selectedtoken.currentIndex)
      {
        selectedtoken = tokenArray[i];
      }
    }
    else
    {
      if(tokenArray[i].currentIndex > selectedtoken.currentIndex)
      {
        selectedtoken = tokenArray[i];
      }
    }
    
  }
  return selectedtoken;
}