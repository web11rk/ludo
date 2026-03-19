import dotenv from 'dotenv'
import { createServer } from "http";
import { Server } from "socket.io";
import { GLOBALPARAMS, LISTENS, LUDO_ROOM } from "./common/gameConstants.js";
import SocketsConnectionsSerializers from "./utils/socketsConnectionsSerializer.js";
import { SendConnectedToServerInfo } from "./listenersAndEmitters/emitters.js";
import UtilityFunctions from './utils/utilityFunctions.js';
import redisClient from './config/redisClient.js';
import { CroneJobForLogsFileDelete } from './logs/loggerManager.js';
import { GetPlayingPlayers } from './common/room.js';
import { Listen } from './listenersAndEmitters/listeners.js';
dotenv.config()

const httpServer = createServer(
  (req, res) => {
      if (req.method === 'GET' && req.url === '/test/check-internet') {
          // return res.json({ status: true });
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          const responseBody = { status: true }
          res.end(JSON.stringify(responseBody));
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
      }
  }
);

export const io = new Server(httpServer,  {
  cors: {
    origin: "*",
    pingInterval: 8000
  },
});

UtilityFunctions.SafeZones()
// CroneJobForLogsFileDelete()
httpServer.listen(process.env.PORT, () => 
{
    console.log(`Server listening at port ${process.env.PORT}`);
});

io.on(LISTENS.CONNECTION, async(socket) => 
{
  
  //send initial connection information to clients
  await SendConnectedToServerInfo(socket,"you are connected");

  //calling logging methods
  SocketStatusLogger(socket);
  

  //serializing multiple socket requests
  await Listen(socket);
  //SocketsConnectionsSerializers.enqueue(socket);
  //Listen(SocketsConnectionsSerializers.dequeue());
  
  
});
function SocketStatusLogger(socket)
{ 
  //test methods for connection diconnection loggings
  socket.on(LISTENS.DISCONNECT, () =>
  {
    GLOBALPARAMS.isLogs &&console.log(`Socket with id: ${socket.id} has been disconnected`)
  });
  socket.on(LISTENS.DISCONNECTING, () =>
  GLOBALPARAMS.isLogs && console.log(`Socket with id: ${socket.id} is disconnecting`)
  );
  GLOBALPARAMS.isLogs &&console.log(`Got connection with id : ${socket.id}`);
}
//const data = await GetPlayingPlayers('611fa34f9bf2815baa96a395676538')
//console.log(data,">>>>>>>>>>>");
const InitialDeleteRedisData = async () => {
  console.log('Initial Delete Function Called Only first Time Call')
  try {
    // console.log(LUDO_ROOM,"LUDO ROOM");
    const LudoRoom = await redisClient.keys(`${LUDO_ROOM}*`)
    console.log(LudoRoom, "----LudoRoom");
    LudoRoom.length > 0 ? (await redisClient.del(LudoRoom)) : ''
  }
  catch (error) {
    console.log(error, "errooooooor");
  }
}
InitialDeleteRedisData();