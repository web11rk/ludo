import { EMITS, GLOBALPARAMS, LISTENS } from "../common/gameConstants.js";
import { writeToLog } from "../logs/loggerManager.js";
import { DiceRollActions } from "../managers/DiceRollManager.js";
import { ModifyChatData } from "../managers/chatManager.js";
import { GetCurrentGameState, LeaveGame, PlayerReconnection } from "../managers/listenManager.js";
import { AllocateTokenMethods } from "../managers/tokenManager.js";
import LudoAllData from "../mongoModels/logsModel.js";
import { io } from "../server.js";
import { ValidateData } from "../utils/socketDataValidator.js";
import SocketsConnectionsSerializers from "../utils/socketsConnectionsSerializer.js";

export const Listen = async (socket) =>
{
    socket.on(LISTENS.JOIN_GAME, async(JoinData) => 
    {
        //console.log("join data 1"+JSON.stringify(JoinData));
        const securityCheckList = {
            "AuthenticatePlayer":true,
            "CheckTournamentCancel":true,
            "CheckAuthToken": false,
            "CheckTurn": false,
            "CheckDiceVal": false,
            "CheckDiceRolled": false,
            "CheckTokenID": false,
        }
        const data = await ValidateData(securityCheckList,LISTENS.JOIN_GAME,JoinData,socket);
        //console.log("join data "+JSON.stringify(data));
        
        if(data != "")
        {
            const obj = {socket,data,io};
            SocketsConnectionsSerializers.enqueue(obj);
        }
    });
    socket.on(LISTENS.GIVE_CURRENT_GAME_STATE, async(data) => 
    {
        const securityCheckList = {
            "AuthenticatePlayer":false,
            "CheckTournamentCancel":false,
            "CheckAuthToken": true,
            "CheckTurn": false,
            "CheckDiceVal": false,
            "CheckDiceRolled": false,
            "CheckTokenID": false,
        }
        const validatedData = await ValidateData(securityCheckList,LISTENS.GIVE_CURRENT_GAME_STATE,data,socket);
        if(validatedData != "")
        {
            await GetCurrentGameState(socket,validatedData);
            //await PlayerReconnection(socket,validatedData,true);
        }
    });
    socket.on(LISTENS.LEAVE_GAME, async(data) => 
    {
        const securityCheckList = {
            "AuthenticatePlayer":false,
            "CheckTournamentCancel":false,
            "CheckAuthToken": true,
            "CheckTurn": false,
            "CheckDiceVal": false,
            "CheckDiceRolled": false,
            "CheckTokenID": false,
        }
        const validatedData = await ValidateData(securityCheckList,LISTENS.LEAVE_GAME,data,socket);
        if(validatedData != "")
        {
            writeToLog("LEAVE GAME CALL FROM PLAYER "+JSON.stringify(validatedData),validatedData.roomID,true);

            await LeaveGame(validatedData);
        }
    });
    socket.on(LISTENS.ROLL_DICE, async(data) => 
    {
        const securityCheckList = {
            "AuthenticatePlayer":false,
            "CheckTournamentCancel":false,
            "CheckAuthToken": true,
            "CheckTurn": true,
            "CheckDiceVal": true,
            "CheckDiceRolled": false,
            "CheckTokenID": false,
        }
        
        const validatedData = await ValidateData(securityCheckList,LISTENS.ROLL_DICE,data,socket);
        //console.log("rollDiceData  "+JSON.stringify(validatedData));
        if(validatedData != "")
        {
            await DiceRollActions(socket,validatedData);
        }
    });
    socket.on(LISTENS.CHAT,async(data) =>
    {
        const securityCheckList = {
            "AuthenticatePlayer":false,
            "CheckTournamentCancel":false,
            "CheckAuthToken": true,
            "CheckTurn": false,
            "CheckDiceVal": false,
            "CheckDiceRolled": false,
            "CheckTokenID": false,
        }
        const validatedData = await ValidateData(securityCheckList,LISTENS.CHAT,data,socket);
        if(validatedData != "")
        {
            await ModifyChatData(socket,validatedData);
        }
    });
    socket.on(LISTENS.MOVE_TOKEN, async(data) =>
    {
        const securityCheckList = {
            "AuthenticatePlayer":false,
            "CheckTournamentCancel":false,
            "CheckAuthToken": true,
            "CheckTurn": true,
            "CheckDiceVal": false,
            "CheckDiceRolled": true,
            "CheckTokenID": true,
        } 
        const validatedData = await ValidateData(securityCheckList,LISTENS.MOVE_TOKEN,data,socket);
        //console.log("moveTokenData  "+JSON.stringify(validatedData));
        if(validatedData != "")
        {
            await AllocateTokenMethods(validatedData);
        }
    });
    socket.on(LISTENS.PING,(data) =>
    {
        socket.emit(EMITS.PONG,"pong");                                  
    });
    socket.on(LISTENS.UNITY_LOGS,async (data) =>
    {
        const securityCheckList = {
            "AuthenticatePlayer":false,
            "CheckTournamentCancel":false,
            "CheckAuthToken": true,
            "CheckTurn": false,
            "CheckDiceVal": false,
            "CheckDiceRolled": false,
            "CheckTokenID": false,
        } 
        const validatedData = await ValidateData(securityCheckList,LISTENS.UNITY_LOGS,data,socket);
        //console.log("UNITY_LOGS "+JSON.stringify(validatedData));
        if(validatedData != "")
        {
            writeToLog("UNITY CHECK LOGS {{{{{{{{{{{{{{{{}}}}}}}}}}}}}}}} "+JSON.stringify(validatedData),validatedData.roomID,true);
        };
        
    });
    socket.on(LISTENS.UNITY_CATCH_ERROR,async (data) =>
    {
        const securityCheckList = {
            "AuthenticatePlayer":false,
            "CheckTournamentCancel":false,
            "CheckAuthToken": true,
            "CheckTurn": false,
            "CheckDiceVal": false,
            "CheckDiceRolled": false,
            "CheckTokenID": false,
        } 
        const validatedData = await ValidateData(securityCheckList,LISTENS.UNITY_LOGS,data,socket);
        //console.log("UNITY_CATCH_ERROR "+JSON.stringify(validatedData));
        if(validatedData != "")
        {
            writeToLog("UNITY ERRORS ((((((((((((((((((((())))))))))))))))))))) "+JSON.stringify(validatedData),validatedData.roomID,true);
            if(validatedData.roomID)
            {
                await LudoAllData.updateField(validatedData.roomID,"unityError",validatedData.methodName+" "+validatedData.output);                 
            }
        };
       
    })
    
}