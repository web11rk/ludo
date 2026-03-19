import {
  addSeconds,
  differenceInSeconds,
  parseISO,
  subSeconds,
} from "date-fns";
import { GLOBALPARAMS, TIMER_FUNCTIONS } from "../common/gameConstants.js";
import { SetRoomVariable, StopDiceRolling, StopTimerModeTimer, StopTurnTimer, StopWaitingTimer } from "../common/room.js";
import { writeToLog } from "../logs/loggerManager.js";
import _ from "lodash";
import { GetCurrentDateTimeInIST } from "../utils/utilityFunctions.js";
import { SendCurrentDateTimeObject } from "../listenersAndEmitters/emitters.js";

class TimerManager 
{
  static queue = new Map();

  // Add a new Comparable object to the priority queue
  static Add({ roomId, eventType, timerDurartion, parentEvent = null, roomRef = null, childEvents = null, }) 
  {
    //const timestamp = addSeconds(new Date(), timerDurartion - 1);
    let dateData = new Date();
    let timestamp = addSeconds(dateData, timerDurartion);
    writeToLog("Add New TimeStamp>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> ",roomId,true);
    writeToLog("TimeStamp  roomId "+roomId,roomId);
    writeToLog("TimeStamp  eventType "+eventType,roomId);
    writeToLog("TimeStamp  timerDurartion "+timerDurartion,roomId);
    writeToLog("TimeStamp Starting Time "+JSON.stringify(dateData)+" Enditing Time "+JSON.stringify(new Date(timestamp)),roomId);
    writeToLog("TimeStamp previos queue "+ConvertMapToJSONString(this.queue),roomId);
    GLOBALPARAMS.isLogs && console.log("TimeStamp previos queue "+this.queue);
    if (this.queue.has(timestamp.toString())) 
    {
      let getTimeStampData = this.queue.get(timestamp.toString());
      getTimeStampData.push({ roomId, eventType, parentEvent, childEvents });
      this.queue.set(timestamp.toString(), getTimeStampData);
      writeToLog("TimeStamp ID already Exist "+timestamp.toString(),roomId);
      if(GLOBALPARAMS.isDisposeObjects)
      {
        getTimeStampData = null;
      }
    }
    else
    {
      this.queue.set(timestamp.toString(), [{ roomId, eventType, parentEvent, childEvents }]);
      writeToLog("TimeStamp ID not Exist "+timestamp.toString(),roomId);
    }
    this.SetTimeStampInRoom(roomId, timestamp.toString(), eventType);
    this.SortQueue();
    GLOBALPARAMS.isLogs && console.log("TimeStamp previos updated queue ",this.queue);
    writeToLog("TimeStamp previos updated queue "+ConvertMapToJSONString(this.queue),roomId);
    if(!GLOBALPARAMS.isTimerRunning)
    {
      GLOBALPARAMS.isTimerRunning = true;
      this.StartTimer();
    }

    if(GLOBALPARAMS.isDisposeObjects)
    {
      dateData = null;
      timestamp = null;
    }

    /*if (parentEvent === null) {
      this.SetTimeStampInRoom(roomId, timestamp.toString(), eventType);
    }*/
  
  }

  static async SetTimeStampInRoom(roomID, timeStamp, eventType) 
  {

    switch (eventType) 
    {
      case  "StopWaitingTimer":
        await SetRoomVariable(roomID,"waitingTimerTimeStamp",timeStamp);
        break;
      case  "StopTurnTimer":
        await SetRoomVariable(roomID,"turnTimerTimeStamp",timeStamp);
        break;
      case  "StopTimerModeTimer":
         GLOBALPARAMS.isLogs && console.log("ENTER ROOM CHECKING INSIDE  TIMER_MODE_START_TIMER CALLING 1 "+timeStamp);
        await SetRoomVariable(roomID,"timerModeTimeStamp",timeStamp);
        break;
      case  "StopDiceRolling":
        await SetRoomVariable(roomID,"stopDiceRollingTimeStamp",timeStamp);
        break;
      case  "disableDiceRollingTimeStamp":
        await SetRoomVariable(roomID,"disableDiceRollingTimerTimeStamp",timeStamp);
        break;
      default:
         GLOBALPARAMS.isLogs && console.log("eventTypeUndefined " + eventType);
        break;
    }
  }
  static StartTimer() 
  {
    const intervalId = setInterval(() => 
    {
      
      let currentTimestamp = new Date().toString();
      let queueBalancerCount = 0;
      
      while(new Date(currentTimestamp) >= this.GetQueueFirstElement() && (this.queue.size > 0))
      {

        queueBalancerCount ++;
        let firstElement = this.GetQueueFirstElement();
        let timeStampVal = this.GetTimer(firstElement);

        if(!_.isEmpty(timeStampVal))
        {
          writeToLog("Inside StartTimer >>>>>>>>>>>>>>>>>>>",timeStampVal[0].roomId,true);
          writeToLog("Inside StartTimer this.GetQueueFirstElement() "+firstElement,timeStampVal[0].roomId);
          writeToLog("Inside StartTimer this.queue.size > 0 "+this.queue.size,timeStampVal[0].roomId);
          for(var i = 0 ; i < timeStampVal.length ; i++)
          {
            EventMapper(timeStampVal[i].eventType, timeStampVal[i].roomId,firstElement);
          }

          let firstKey = this.queue.keys().next().value;
          if(!_.isEmpty(firstKey))
          {
            GLOBALPARAMS.isLogs && console.log(firstKey,"Delete Data ID",this.queue.get(firstKey))
            writeToLog("Inside StartTimer Deleted Key "+JSON.stringify(firstKey),this.queue.get(firstKey)[0].roomId);
            this.queue.delete(firstKey);
          }
        
        }
        else
        {
         
          console.log("error not able to find timetsampval 0");
          if(firstElement != null)
          {
            console.log("error not able to find timetsampval 1");
            this.queue.delete(firstElement.toString());
          }
          break;
        }
        if(GLOBALPARAMS.isDisposeObjects)
        {
          timeStampVal = null;
          firstElement = null;
          firstKey = null;
        }
        
      }
      SendTimeToAllPlayers();
      if (!this.queue.size) 
      {
        clearInterval(intervalId);
        GLOBALPARAMS.isTimerRunning = false;
      }
      if(GLOBALPARAMS.isDisposeObjects)
      {
        queueBalancerCount = null;
        currentTimestamp = null;
      }
     
    }, 1000); // The interval is set to 1000 milliseconds (1 second)
  }

  static GetTimer(timestamp)
  {
    return this.queue.get(timestamp.toString());
  }

  static StopTimer(timestamp,roomID,event) 
  {
    if(this.queue.has(timestamp.toString()))
    {
      writeToLog("Inside StopTimer >>>>>>>>>>>>>>",roomID,true);
      writeToLog("Inside StopTimer timestamp "+timestamp,roomID);
      writeToLog("Inside StopTimer roomID "+roomID,roomID);
      writeToLog("Inside StopTimer event "+event,roomID);
      
      let getTimeStampArray = this.queue.get(timestamp.toString());
      
      for(var item of getTimeStampArray)
      {
        writeToLog("Inside StopTimer item 1"+JSON.stringify(item),roomID);
       
          if(item.roomId === roomID)
          {
            writeToLog("Inside StopTimer item 2",roomID);
            const index = getTimeStampArray.findIndex(x => (x.roomId === roomID) && (x.eventType === event)); 
            if(index >= 0)
            {
              writeToLog("Inside StopTimer item 3",roomID);
              getTimeStampArray.splice(index,1);
            }
            else
            {
              writeToLog("Inside StopTimer item 4",roomID);
            }
          }
          else
          {
            writeToLog("Inside StopTimer item 5",roomID);
          }
      }
      
      if(getTimeStampArray.length < 1)
      {
        this.queue.set(timestamp.toString(),null);
        this.queue.delete(timestamp.toString());
        writeToLog("Inside StopTimer item 6",roomID);
      }
      else
      {
        writeToLog("Inside StopTimer item 7",roomID);
        this.queue.set(timestamp.toString(),getTimeStampArray);
      }

      if(GLOBALPARAMS.isDisposeObjects)
      {
        getTimeStampArray = null;
      }
    }
    else
    {
      writeToLog("StopTimer TIMESTAMP NOT EXIST IN QUEUE INSIDE STOP TIMER",roomID,true);
    }
    
  }
  static GetCurrentTimerRemainingSeconds(timeStamp) 
  {
    if(!timeStamp)
    {
      return "0";
    }
    let manupulatedTime = differenceInSeconds(new Date(timeStamp), new Date());
    if(manupulatedTime < 1)
    {
      manupulatedTime = 0;
    }
    return manupulatedTime.toString();
  }
  static GetQueue() {
    // GLOBALPARAMS.isLogs && console.log("*************", this.queue);
  }

  // Check if the priority queue is empty
  static IsEmpty() {
    return !!this.queue.size;
  }
  static GetQueueFirstElement()
  {
    return new Date(Array.from(this.queue.keys())[0]);
  }

  static IfTimestampMatches(timestamp) 
  {
    // GLOBALPARAMS.isLogs && console.log("--------->", this.queue);
    return Array.from(this.queue.keys())[0] === timestamp.toString();
  }

  // Get the head element of the priority queue (without removing it)
  static Peek() {
    return Array.from(this.queue)[0];
  }

  // Remove and return the head element of the priority queue
  static Poll() {
    const element = Array.from(this.queue)[0];
    this.queue.delete(element[0]);
    return element[1];
  }

  static GetEndTimestamp() {
    return Array.from(this.queue)[Array.from(this.queue).length - 1][0];
  }

  // Sort the queue based on timestamps (ascending order)
  static SortQueue() {
    this.queue = new Map(
      [...this.queue.entries()].sort((a, b) => new Date(a[0]) - new Date(b[0]))
    );
  }
}

export async function EventMapper(eventType, roomID,timestamp)
{
  writeToLog("Inside EventMapper >>>>>>>>>>>>>>>>>>>"+eventType,roomID);
  switch (eventType) 
  {
    case TIMER_FUNCTIONS.STOP_WAITING_TIMER:
       GLOBALPARAMS.isLogs && console.log(`${eventType} has been called!`);
      await StopWaitingTimer(roomID,timestamp);
      break;
    case TIMER_FUNCTIONS.STOP_TURN_TIMER:
       GLOBALPARAMS.isLogs && console.log(`${eventType} has been called!`);
      await StopTurnTimer(roomID,timestamp);
      break;
    case TIMER_FUNCTIONS.STOP_TIMER_MODE_TIMER:
       GLOBALPARAMS.isLogs && console.log(`${eventType} has been called!`);
      await StopTimerModeTimer(roomID,timestamp);
      break;
    case TIMER_FUNCTIONS.STOP_DICE_ROLLING:
       GLOBALPARAMS.isLogs && console.log(`${eventType} has been called!`);
      StopDiceRolling(roomID,timestamp);
      break;
    case TIMER_FUNCTIONS.EMIT_BEFORE_TIMESTAMP:
       GLOBALPARAMS.isLogs && console.log(`${eventType} has been called!`);
      //DisableCardPicking(roomID,io);
      break;
    default:
      console.error(`${eventType} is an invalid timer`);
      break;
  }
}
export function ConvertMapToJSONString(data)
{
  const dataTwo = JSON.stringify([...data]);
  return dataTwo;
  
}
export function SendTimeToAllPlayers()
{
  const currentTime = GetCurrentDateTimeInIST(true);
  SendCurrentDateTimeObject(currentTime);
}

export default TimerManager;