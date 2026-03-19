import { GLOBALPARAMS } from "../common/gameConstants.js";
import { JoinPlayerInRoom } from "../managers/listenManager.js";

class JoiningObjectClass
{
    constructor(joiningObjectClass) 
    {
      this.joiningObjectClass = joiningObjectClass;
    }
    isTimerRunning = false;
    
    playerObjList = new Map();

    AddPlayerInList(joiningObject,socket)
    {
        
        if(!this.playerObjList.has(joiningObject.playerID))
        {
            let playerObject = {
                "roomID":joiningObject.roomID,
                "playerID":joiningObject.playerID,
                "playerName":joiningObject.playerName,
                "playerImageID":joiningObject.playerImageID,
                "socketID":socket.id,
                "authToken":joiningObject.authToken
            }
            this.playerObjList.set(joiningObject.playerID,playerObject);
            if(!this.isTimerRunning)
            {
                this.SetPlayerInRoom();
            }
            if(GLOBALPARAMS.isDisposeObjects)
            {
                playerObject = null;
            }
           
            GLOBALPARAMS.isLogs && console.log("playerAddedInPlayerList");
        }
        else
        {
             GLOBALPARAMS.isLogs && console.log("player Already Exists in List");
        }
        
    }

    SetPlayerInRoom()
    {
        if(this.playerObjList.size > 0)
        {
            const intervalId = setInterval(async() => 
            {
                this.isTimerRunning = true;
                const firstElementKey = Array.from(this.playerObjList.keys())[0];
                GLOBALPARAMS.isLogs && console.log(firstElementKey,"firstElementKey>>>>>>");
                const firstPlayerObject = this.playerObjList.get(firstElementKey);
                await JoinPlayerInRoom(firstPlayerObject,null,false);
                this.playerObjList.delete(firstElementKey);
                GLOBALPARAMS.isLogs && console.log("set player in room running");
                if ((this.playerObjList.size === 0)) 
                {
                    this.isTimerRunning = false;
                    clearInterval(intervalId);
                     GLOBALPARAMS.isLogs && console.log("set player in room stopped");
                }
            }, 500);
        }
        
    }
    

}
export default JoiningObjectClass;