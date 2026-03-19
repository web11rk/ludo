import { io } from "../server.js"
import { EMITS, GLOBALPARAMS } from "../common/gameConstants.js"
import { DisconnectSocket } from "../managers/socketManager.js";
import { EncryptData } from "../utils/encrypter.js";
import { writeToLog } from "../logs/loggerManager.js";
import { AddTimeStampInObject, DeleteJoiningObjectClass } from "../utils/utilityFunctions.js";

export async function SendCurrentGameState(playerSocket,dataToSend)
{
    let timeStampObj = await AddTimeStampInObject(dataToSend);
    const encryptedData = await EncryptData(timeStampObj);
    playerSocket.emit(EMITS.CURRENT_GAME_STATE, encryptedData);
    GLOBALPARAMS.isLogs && console.log("current game state req send");
}
export async function SendStartGameCall(roomID,dataToSend)
{
    let timeStampObj = await AddTimeStampInObject(dataToSend);
    const encryptedData = await EncryptData(timeStampObj);
    io.sockets.in(roomID).emit(EMITS.START_GAME, encryptedData);
}
export async function SendRoomJoinedInfo(roomID,dataToSend)
{
    let timeStampObj = await AddTimeStampInObject(dataToSend);
    GLOBALPARAMS.isLogs && console.log("JOINED ROOM DATA "+JSON.stringify(timeStampObj));
    const encryptedData = await EncryptData(timeStampObj);
    io.sockets.in(roomID).emit(EMITS.ROOM_JOINED, encryptedData);
}
export async function SendConnectedToServerInfo(playerSocket,dataToSend)
{
    const encryptedData = await EncryptData(dataToSend);
    playerSocket.emit(EMITS.CONNECTED_TO_SERVER, encryptedData);
}
export async function SendPlayerNotMatchedInfo(playerSocket,dataToSend,roomID,sendToAll)
{   
    const encryptedData = await EncryptData(dataToSend);
    DeleteJoiningObjectClass(roomID);
    if(sendToAll)
    {
        writeToLog("Player Not matched sendToAll Called ========>",roomID)
        io.sockets.in(roomID).emit(EMITS.PLAYERS_NOT_MATCHED, encryptedData);
    }
    else
    {
        writeToLog("Player Not matched Called ========>",roomID)
        playerSocket.emit(EMITS.PLAYERS_NOT_MATCHED, encryptedData);
    }
    
}
export async function SendGameAlreadyCompletedInfo(playerSocket,dataToSend)
{
    let timeStampObj = await AddTimeStampInObject(dataToSend);
    const encryptedData = await EncryptData(timeStampObj);
    playerSocket.emit(EMITS.GAME_ALREADY_COMPLETED, encryptedData);
    DisconnectSocket(playerSocket.id,0);
    
}
export async function SendGameAlreadyStartedInfo(playerSocket,dataToSend)
{
    const encryptedData = await EncryptData(dataToSend);
    playerSocket.emit(EMITS.GAME_ALREADY_STARTED,encryptedData);
    DisconnectSocket(playerSocket.id,0);
}
export async function SendReconnectionData(playerSocket,dataToSend)
{
    let timeStampObj = await AddTimeStampInObject(dataToSend);
    const encryptedData = await EncryptData(timeStampObj);
    playerSocket.emit(EMITS.RECONNECTION,encryptedData);
}
export async function SendMyTurnData(playerSocket,roomID,dataToSend,isSendToAll)
{
    let timeStampObj = await AddTimeStampInObject(dataToSend);
    const encryptedData = await EncryptData(timeStampObj);
    if(isSendToAll)
    {
        io.sockets.in(roomID).emit(EMITS.MY_TURN_DATA, encryptedData);
    }   
    else
    {
        playerSocket.emit(EMITS.MY_TURN_DATA, encryptedData);
    }    
}
export async function SendTurnData(roomID,dataToSend)
{
    //console.log("TurnData "+JSON.stringify(dataToSend));
    let timeStampObj = await AddTimeStampInObject(dataToSend);
    const encryptedData = await EncryptData(timeStampObj);
    io.sockets.in(roomID).emit(EMITS.TURN, encryptedData);
}
export async function SendGameOverInfo(roomID,dataToSend)
{
    let timeStampObj = await AddTimeStampInObject(dataToSend);
    const encryptedData = await EncryptData(timeStampObj);
    io.sockets.in(roomID).emit(EMITS.GAMEOVER, encryptedData);
}
export async function SendAutoPlayInfo(roomID,dataToSend)
{
    const encryptedData = await EncryptData(dataToSend);
    io.sockets.in(roomID).emit(EMITS.AUTOPLAY_ENABLED, encryptedData);
}
export async function SendDiceData(playerSocket,roomID,dataToSend,isSendDiceDataToAll)
{
        let timeStampObj = await AddTimeStampInObject(dataToSend);
        const encryptedData = await EncryptData(timeStampObj);
    if(isSendDiceDataToAll)
    {
        io.sockets.in(roomID).emit(EMITS.DICE_DATA, encryptedData);
    }
    else
    {
        playerSocket.broadcast.to(roomID).emit(EMITS.DICE_DATA,encryptedData);
    }
}
export async function SendExtraMove(roomID,dataToSend)
{
    const encryptedData = await EncryptData(dataToSend);
    io.sockets.in(roomID).emit(EMITS.SEND_EXTRA_MOVE, encryptedData);
}
export async function SendTokenReachedHome(roomID,dataToSend)
{
    const encryptedData = await EncryptData(dataToSend);
    io.sockets.in(roomID).emit(EMITS.SEND_TOKEN_REACHED_HOME, encryptedData);
}
export async function SendTimerModeLastTurnCall(roomID,dataToSend)
{
    const encryptedData = await EncryptData(dataToSend);
    io.sockets.in(roomID).emit(EMITS.SEND_TIMER_MODE_LAST_TURN_CALL, encryptedData);
}
export async function SendAdditionSubstractionScore(roomID,dataToSend)
{
    let timeStampObj = await AddTimeStampInObject(dataToSend);
    const encryptedData = await EncryptData(timeStampObj);
    io.sockets.in(roomID).emit(EMITS.SEND_ADDITION_SUBSTRACTION_SCORE, encryptedData);
}
export async function SendAuthsStatus(playerSocket,dataToSend)
{
    const encryptedData = await EncryptData(dataToSend.toString());
    playerSocket.emit(EMITS.AUTH_STATUS, encryptedData); 
}
export async function SendChatData(playerSocket,roomID,dataToSend)
{
    const encryptedData = await EncryptData(dataToSend);
    playerSocket.broadcast.to(roomID).emit(EMITS.SEND_CHAT_DATA,encryptedData);
}
export async function SendOpenTokenData(roomID,dataToSend)
{
    // console.log('SendOpenTokenData----',dataToSend)
    let timeStampObj = await AddTimeStampInObject(dataToSend);
    const encryptedData = await EncryptData(timeStampObj);
    io.sockets.in(roomID).emit(EMITS.SEND_OPEN_TOKEN_DATA, encryptedData);
}
export async function SendMoveTokenData(roomID,dataToSend)
{
    // console.log('SendMoveTokenData----',dataToSend)
    let timeStampObj = await AddTimeStampInObject(dataToSend);
    const encryptedData = await EncryptData(timeStampObj);
    io.sockets.in(roomID).emit(EMITS.SEND_MOVE_TOKEN_DATA, encryptedData);
}
export async function SendPlayerLeftData(roomID,dataToSend)
{
    const encryptedData = await EncryptData(dataToSend);
    io.sockets.in(roomID).emit(EMITS.PLAYER_LEFT_THE_GAME, encryptedData);
}
export async function SendKilledTokenData(roomID,dataToSend)
{
    let timeStampObj = await AddTimeStampInObject(dataToSend);
    const encryptedData = await EncryptData(timeStampObj);
    io.sockets.in(roomID).emit(EMITS.KILLED_PLAYER_TOKEN_DATA, encryptedData);
}
export async function SendDiceRollDisableData(playerSocket,dataToSend)
{
    const encryptedData = await EncryptData(dataToSend);
    playerSocket.emit(EMITS.SEND_DICE_ROLL_DISABLE_DATA, encryptedData);
}
export async function SendRemainingAutoplayChances(roomID,dataToSend)
{
    let timeStampObj = await AddTimeStampInObject(dataToSend);
    const encryptedData = await EncryptData(timeStampObj);
    io.sockets.in(roomID).emit(EMITS.SEND_REMAINING_AUTOPLAY_CHANCES_DATA, encryptedData);
}
export async function SendWaitingTimeReconnectionData(playerSocket,dataToSend)
{
    let timeStampObj = await AddTimeStampInObject(dataToSend);
    const encryptedData = await EncryptData(timeStampObj);
    playerSocket.emit(EMITS.WAITING_TIME_RECONNECTION,encryptedData);
}
export async function SendPlayerRankData(roomID,dataToSend)
{
    let timeStampObj = await AddTimeStampInObject(dataToSend);
    const encryptedData = await EncryptData(timeStampObj);
    io.sockets.in(roomID).emit(EMITS.SEND_PLAYER_RANK_DATA, encryptedData);
}
export async function SendEnableTokenClicking(playerSocket,dataToSend)
{
    const encryptedData = await EncryptData(dataToSend);
    playerSocket.emit(EMITS.ENABLE_TOKEN_CLICKING,encryptedData);
}
export async function SendPlayerWaitingTimerFinished(playerSocket,dataToSend)
{
    const encryptedData = await EncryptData(dataToSend);
    playerSocket.emit(EMITS.PLAYER_CANNOT_JOIN,encryptedData);
}
export async function SendPlayerMovableTokensData(playerSocket,roomID,dataToSend,sendToAll)
{
    let timeStampObj = await AddTimeStampInObject(dataToSend);
    const encryptedData = await EncryptData(timeStampObj);
    if(sendToAll)
    {
        io.sockets.in(roomID).emit(EMITS.PLAYER_MOVABLE_TOKENS, encryptedData);
    }
    else
    {
        playerSocket.emit(EMITS.PLAYER_MOVABLE_TOKENS,encryptedData);
    }
   
}
export async function SendAutoPlayDiceRollData(roomID,dataToSend)
{
    let timeStampObj = await AddTimeStampInObject(dataToSend);
    const encryptedData = await EncryptData(timeStampObj);
    io.sockets.in(roomID).emit(EMITS.SEND_AUTOPLAY_DICE_ROLL, encryptedData);
}
export async function SendAutoPlayRunning(playerSocket,dataToSend)
{
    if(playerSocket != null)
    {
        const encryptedData = await EncryptData(dataToSend);
        playerSocket.emit(EMITS.SEND_AUTOPLAY_RUNNING_FLAG,encryptedData);
    }
}
export async function SendPlayerScore(roomID,dataToSend)
{
    let timeStampObj = await AddTimeStampInObject(dataToSend);
    const encryptedData = await EncryptData(timeStampObj);
    io.sockets.in(roomID).emit(EMITS.SEND_PLAYER_SCORE, encryptedData);
}
export async function SendPlayerRemainingMoves(playerSocket,roomID,dataToSend,sendToAll)
{
    let timeStampObj = await AddTimeStampInObject(dataToSend);
    const encryptedData = await EncryptData(timeStampObj);
    if(sendToAll)
    {
        io.sockets.in(roomID).emit(EMITS.SEND_PLAYER_REMAINING_MOVES, encryptedData);
    }
    else
    {
        playerSocket.emit(EMITS.SEND_PLAYER_REMAINING_MOVES,encryptedData);
    }
    
}
export async function SendTimerModeRemainingTime(roomID,dataToSend)
{
    const encryptedData = await EncryptData(dataToSend);
    io.sockets.in(roomID).emit(EMITS.SEND_TIMER_MODE_REMAINING_TIME, encryptedData);
}
export async function SendContestCancelled(roomID,socket,dataToSend,sendToAll)
{
    const encryptedData = await EncryptData(dataToSend);
    if(sendToAll)
    {
        
        io.sockets.in(roomID).emit(EMITS.SEND_CONTEST_CANCELLED, encryptedData);
    }
    else
    {
        socket.emit(EMITS.SEND_CONTEST_CANCELLED,encryptedData);
    }
}
export async function SendTournamentMatchNotFound(roomID,dataToSend)
{
    let timeStampObj = await AddTimeStampInObject(dataToSend);
    const encryptedData = await EncryptData(timeStampObj);
    DeleteJoiningObjectClass(roomID)
    io.sockets.in(roomID).emit(EMITS.SEND_TOURNAMENT_PLAYER_NOT_MATCHED, encryptedData);
}
export function SendCurrentDateTimeObject(dataToSend)
{
    //console.log("dataToSend "+dataToSend);
    io.sockets.emit(EMITS.DATE_TIME_DATA,dataToSend);
}
export async function SendWaitForGameOverData(roomID,dataToSend)
{
    const encryptedData = await EncryptData(dataToSend);
    io.sockets.in(roomID).emit(EMITS.SEND_WAIT_FOR_GAMEOVER, encryptedData);
}
export async function SendWaitForNoMatchFound(roomID,dataToSend)
{
    const encryptedData = await EncryptData(dataToSend);
    io.sockets.in(roomID).emit(EMITS.SEND_WAIT_FOR_NO_MATCH_FOUND, encryptedData);
}
export async function SendTournamentNotCancelStatus(playerSocket,dataToSend)
{
    const encryptedData = await EncryptData(dataToSend);
    playerSocket.emit(EMITS.TOURNAMENT_NOT_CANCEL_STATUS,encryptedData);
}
export async function SendSomenthingWentWrongStatus(playerSocket,dataToSend)
{
    const encryptedData = await EncryptData(dataToSend);
    playerSocket.emit(EMITS.SOMETHING_WENT_WRONG,encryptedData);
}