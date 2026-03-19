import { GLOBALPARAMS } from "../common/gameConstants.js";
import { SendChatData } from "../listenersAndEmitters/emitters.js";

export async function ModifyChatData(socket,chatObject)
{
    try
    {
        //providing timestamp
        chatObject.timeStamp = new Date().toLocaleString('en-GB', {
            hour12: false,
        });
        // Save chat message to Redis
                //await redisClient.lPush(`room:${chatObject.roomID}`, chatObject);
        // this.getChatList(chatObject);

        await SendChatData(socket,chatObject.roomID,JSON.stringify(chatObject));
    } 
    catch (error)
    {
        GLOBALPARAMS.isLogs && console.log('error at modifyChat ', error);
    }
}
export async function getChatList(chatObject)
{
    const redisData = await redisClient.lRange(`room:${chatObject.roomID}`, 0, -1,);
    let arrayOfChat = []
        for(let object of redisData){
        arrayOfChat.push(JSON.parse(object))
    }
    return arrayOfChat;
}
    

