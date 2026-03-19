import { Listen } from "../listenersAndEmitters/listeners.js";
import { GLOBALPARAMS } from "../common/gameConstants.js";
import { JoinGame } from "../managers/listenManager.js";

class SocketsConnectionsSerializers {
    static queue = []
    static isTimer = false
  
   static enqueue(item) {
      if(!this.isTimer){
        this.isTimer = true
        this.Time()
      }
      this.queue.push(item);
    }
  
   static dequeue() {
       return this.queue.shift();
    }
  
   static size() {
     GLOBALPARAMS.isLogs && console.log(this.queue.length,"===>>>this.queue.length");
      return this.queue.length;
    }
  
    static isEmpty() {
      return this.queue.length === 0;
    }

    static Time(){
      const EndTime = setInterval( async ()=>
      {
        if(this.size() > 0) 
        {
          this.isTimer = true;
          //JoinGame(...obj);
          let obj = this.dequeue();
          await JoinGame(obj.socket,obj.data,obj.io);
          if(GLOBALPARAMS.isDisposeObjects)
          {
            obj = null;
          }
          
          //Listen(this.dequeue());
          
       }
       else
       {
         clearInterval(EndTime);
         this.isTimer = false
       }
      },25)
    }
}
export default SocketsConnectionsSerializers;