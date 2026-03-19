import { GLOBALPARAMS } from "../common/gameConstants.js";
import { CheckIfTokenExistForPlayer, GetPlayerVariable, GetRoomVariable } from "../common/room.js";
import ApiManager from "../managers/apiManager.js";
import { AuthPlayerToken } from "../managers/listenManager.js";
import { GetRoomTurnList } from "../managers/roomsManager.js";
import LudoAllData from "../mongoModels/logsModel.js";
import { DecryptData } from "./decrypter.js";

export async function ValidateData(checkList,MethodName,data,socket)
{
    try
    {
        const decryptedData = await DecryptData(JSON.stringify(data));
        const parsedData = JSON.parse(decryptedData);

        if(GLOBALPARAMS.dataValidationEnabled)
        {

            if(checkList.AuthenticatePlayer)
            {
                //console.log("inside authentication  ");
                let authObj = new Object();
                authObj.playerID = parsedData.playerID,
                authObj.authToken =  parsedData.authToken,
                authObj.playerName = parsedData.playerName,
                authObj.roomID = parsedData.roomID;

                let isAuthenticated =  await AuthPlayerToken(socket,authObj);
                //console.log("inside authentication  1 "+isAuthenticated);
                if(!isAuthenticated)
                {
                    return "";
                }
            }
            if(checkList.CheckTournamentCancel)
            {
                //console.log("inside CheckTournamentCancel  1 "+JSON.stringify(parsedData));
                if(parsedData.isTournament)
                {
                    //console.log("inside CheckTournamentCancel  2 ");
                    let tournamentCancleObj = new Object();
                    tournamentCancleObj.isTournament = parsedData.isTournament,
                    tournamentCancleObj.tournament_id = parsedData.tournamentID,
                    tournamentCancleObj.round_count = parsedData.roundCount,
                    tournamentCancleObj.user_id = parsedData.playerID,
                    tournamentCancleObj.roomID = parsedData.roomID;

                    let roundCount = parseInt(tournamentCancleObj.round_count);
                    //console.log("inside CheckTournamentCancel  2a ");

                    if(roundCount != null &&  roundCount  != "" && roundCount === 1)
                    {
                        //console.log("inside CheckTournamentCancel  3 ");
                        let isTournamentCancel = await ApiManager.checkGameCancelledApi(tournamentCancleObj,socket);
                        if(isTournamentCancel)
                        {
                            //console.log("inside CheckTournamentCancel  4 ");
                            return "";
                        }
                    }
                }
             
            }
            if(checkList.CheckAuthToken)
            {
                const validAuthToken = await ValidateAuthTokenInPlayer(parsedData.roomID,parsedData.playerID,parsedData.authToken,MethodName,parsedData);
                if(!validAuthToken)
                {
                    console.log("auth validation cheat detected "+JSON.stringify(parsedData));
                    return "";
                }
            }
            if(checkList.CheckTurn)
            {
                
                const validCurrentTurnPlayer = await ValidateCurrentTurnPlayer(parsedData.roomID,parsedData.playerID,MethodName,parsedData);
                if(!validCurrentTurnPlayer)
                {
                    console.log("wrong turn cheat detected "+JSON.stringify(parsedData));
                    return "";
                }
                
            }
            if(checkList.CheckDiceVal)
            {
                
                const validCurrentDiceValue = await ValidateCurrentDiceValue(parsedData.roomID,parsedData.diceValue,MethodName,parsedData);
                if(!validCurrentDiceValue)
                {
                    console.log("wrong dice value detected "+JSON.stringify(parsedData));
                    return "";
                }
               
            }
            if(checkList.CheckDiceRolled)
            {
                
                const validDiceRolled = await ValidateDiceRolledValue(parsedData.roomID,MethodName,parsedData);
                if(!validDiceRolled)
                {
                    console.log("wrong move dice roll cheat detected "+JSON.stringify(parsedData));
                    return "";
                }
                
            }
            if(checkList.CheckTokenID)
            {
                
                const validTokenID = await ValidateTokenID(parsedData.roomID,parsedData.playerID,parsedData.tokenID,MethodName,parsedData);
                if(!validTokenID)
                {
                    console.log("wrong token id cheat detected "+JSON.stringify(parsedData));
                    return "";
                }
                
            }

            return parsedData;
            
        }
        else
        {
            GLOBALPARAMS.isLogs && console.log("data validation Layer Disabled ");
            return parsedData;
        } 
        
    }
    catch(error)
    {
        console.log("wrong data cheat detected "+data+"  "+"error "+error);
        return "";
    }
    
}
//#region ValidatorMethods
export async function ValidateAuthTokenInPlayer(roomID,playerID,authToken,methodName,object)
{
    let playerTokenValid = false;
    const playerToken = await GetPlayerVariable(roomID,playerID,"authToken");
    if((playerToken === authToken) && (playerToken != "") && (playerToken != null))
    {
        playerTokenValid = true;
    }
    else
    {
        GLOBALPARAMS.isLogs && console.log("playerToken "+playerToken);
        GLOBALPARAMS.isLogs && console.log("authToken "+authToken);
        let data = object;
        data.message = "Auth Token Not Matched In "+methodName,
        data.realAuthToken = playerToken;
        await SaveCheatTypeInMongo(roomID,data);
    }

    return playerTokenValid;
}
export async function ValidateCurrentTurnPlayer(roomID,playerID,methodName,object)
{
    let playerTurnValid = false;
    const turnList = GetRoomTurnList(roomID);
    const currentTurnPlayerID = turnList.GetCurrentTurnPlayerData();

    if(currentTurnPlayerID === playerID)
    {
        playerTurnValid = true;
    }
    else
    {
        let data = object;
        data.message = "Current Turn Player ID Not Matched "+methodName,
        data.currentTurnPlayerID = currentTurnPlayerID;
        await SaveCheatTypeInMongo(roomID,data);
    }
    
    return playerTurnValid;

}
export async function ValidateCurrentDiceValue(roomID,diceValue,methodName,object)
{
    let playerDiceValueValid = false;
    const currentDiceNo = await GetRoomVariable(roomID,"currentDiceNo");
    if(currentDiceNo === +diceValue)
    {
        playerDiceValueValid = true;
    }
    else
    {
        let data = object;
        data.message = "Dice Value Not Matched in "+methodName,
        data.currentDiceNo = currentDiceNo;
        await SaveCheatTypeInMongo(roomID,data);
    }
    
    return playerDiceValueValid;
}
export async function ValidateDiceRolledValue(roomID,methodName,object)
{
    let playerDiceRolled = false;
    const diceRolled = await GetRoomVariable(roomID,"diceRolled");
    if(diceRolled)
    {
        playerDiceRolled = true;
    }
    else
    {
        let data = object;
        data.message = "Dice is not rolled in "+methodName,
        await SaveCheatTypeInMongo(roomID,data);
    }
    
    return playerDiceRolled;
}
export async function ValidateTokenID(roomID,playerID,tokenID,methodName,object)
{
    const tokenExist = await CheckIfTokenExistForPlayer(roomID,playerID,tokenID)
    if(!tokenExist)
    {
        let data = object;
        data.message = "Token ID not exist for player in "+methodName,
        await SaveCheatTypeInMongo(roomID,data);
    }
    
    return tokenExist;
}
//#endregion

export async function SaveCheatTypeInMongo(roomID,dataObj)
{
    await LudoAllData.updateField(roomID,"isCheat",dataObj);
}   