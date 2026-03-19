import { io } from "../server.js";
//Socket specific functions
export function JoinPlayerSocketInARoom(playerSocket,socketID,roomID)
{
    if(playerSocket === null)
    {
        playerSocket = GetPlayerSocket(socketID);
        if(playerSocket != null)
        {
            playerSocket.join(roomID);
        }
    }
    else
    {
        playerSocket.join(roomID);
    }
   
}
export async function DisconnectSocket(socketID,delayInDisconnection)
{
    setTimeout(()=>
    {
        io.in(socketID).disconnectSockets();

    },delayInDisconnection)
    
}
export function DisconnectAllSocketsInARoom(roomID)
{
    io.in(roomID).disconnectSockets(true);
}
export function DeleteRoomFromSocketServer(roomID)
{
    io.sockets.adapter.rooms.delete(roomID);
}
export function GetPlayerSocket(socketID)
{
    const socket = io.sockets.sockets.get(socketID);
    return socket;
}