import { GLOBALPARAMS } from "../common/gameConstants.js";
import { GetPlayerVariable } from "../common/room.js";
import TurnListNode from "./turnListNode.js";
class TurnList
{
  head;
  currentNode = this.head;
  previous = null;
  constructor(turnList)
  {
    this.turnList = turnList;
    this.head = null;
  }
  

  AppendNode(data)
  {
    let turnListNode = new TurnListNode();
    turnListNode.data = data;
    // Point to itself for the first node
    if (this.head === null) 
    {
      turnListNode.next = turnListNode; 
      this.head = turnListNode;
    } 
    else 
    {
      let current = this.head;
      while (current.next !== this.head) 
      {
          current = current.next;
      }
      current.next = turnListNode;
      turnListNode.next = this.head;
    }
    this.currentNode = this.head;
  }
  ChangeTurn(roomID)
  {

    if(!this.head) 
    {
      return null; // List is empty
    }
    this.previous = this.currentNode;
    if(roomID != "")
    {
      //this.PrintPreviosCurrentTurn(roomID,this.currentNode.data,true);
    }
    
    this.currentNode = this.currentNode.next;
    if(roomID != "")
    {
      //this.PrintPreviosCurrentTurn(roomID,this.currentNode.data,false);
    }
    return this.currentNode.data;
  }
  GetCurrentTurnPlayerData()
  {
   
    if (this.currentNode.data === null) 
    {
       GLOBALPARAMS.isLogs && console.log("GetcurrentNodeTurnPlayerData is null");
      return ""; // List is empty
    
    }
    
    return this.currentNode.data ;
  }
  async PrintPreviosCurrentTurn(roomID,PlayerID,isPrevios)
  {
    this.DisplayNodeData(); 
    let playerName = await GetPlayerVariable(roomID,PlayerID,"playerName");
    if(isPrevios)
    {
       GLOBALPARAMS.isLogs && console.log("PREVIOS TURN "+playerName);
    }
    else
    {
       GLOBALPARAMS.isLogs && console.log("CURRENT TURN "+playerName);
    }
     GLOBALPARAMS.isLogs && console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%");
  }
  
//code to get currentNode data
  DeleteNode(data) 
  {
    if (!this.head) 
    {
        return; // List is empty, nothing to delete
    }

    let currentNode = this.head;
    let previous = null;

    // Find the node to delete and its previous node
    while (currentNode.data !== data) {
        if (currentNode.next === this.head) {
            // Data not found, we've looped through the entire list
            return;
        }
        previous = currentNode;
        currentNode = currentNode.next;
    }

    // Check if the node to delete is the head
    if (currentNode === this.head) {
       GLOBALPARAMS.isLogs && console.log("if currentNode is equals to head");
        if (currentNode.next === this.head) {
            this.head = null; // Only one node in the list
        } else {
            // Update head and tail pointers to the next node
            const tail = this.findTail();
            this.head = this.head.next;
            tail.next = this.head;
        }
    } else {
        // Update the previous node's next pointer to skip the node to be deleted
        previous.next = currentNode.next;
    }
    if(this.GetCurrentTurnPlayerData() === data)
    {
      this.ChangeTurn();
    }
    
  }

// Helper function to find the tail node
  findTail() 
  {
      let currentSearchedNode = this.head;
      while (currentSearchedNode.next !== this.head) {
        currentSearchedNode = currentSearchedNode.next;
      }
      return currentSearchedNode;
  }
  DisplayNodeData() 
  {
    let playerTurnData = [];
    if (!this.head) {
       GLOBALPARAMS.isLogs && console.log('List is empty.');
      return;
    }
    //let initialNode = this.currentNode;
    let currentDisplayedNode = this.head;
    do {
      // GLOBALPARAMS.isLogs && console.log(currentDisplayedNode.data);
      playerTurnData.push(currentDisplayedNode.data);
      currentDisplayedNode = currentDisplayedNode.next;
    } while (currentDisplayedNode !== this.head);
     GLOBALPARAMS.isLogs && console.log("playerTurnData",playerTurnData);
  }    
  GetPLayersInGameCount()
  {
    let playerCount = 0;
    if (!this.head) {
       GLOBALPARAMS.isLogs && console.log('No player in list');
      return 0;
    }
  
    let currentDisplayedNode = this.head;
    do 
    {
      playerCount+=1;
      currentDisplayedNode = currentDisplayedNode.next;
    } while (currentDisplayedNode !== this.head);
    return playerCount;
  } 
  CheckIfPlayerAlreadyExistsInTurnList(playerID)
  {
    let playerExists = false;
    if (!this.head) {
       GLOBALPARAMS.isLogs && console.log('No player in list');
      return playerExists;
    }
  
    let currentDisplayedNode = this.head;
    do 
    {
      if(currentDisplayedNode.data === playerID)
      {
         GLOBALPARAMS.isLogs && console.log("player in list");
        playerExists = true;
        //break;
      }
      currentDisplayedNode = currentDisplayedNode.next;
    } while (currentDisplayedNode !== this.head);
    return playerExists;
  }    
  IsOnlyOnePlayerExistInGame()
  { //check only one player exist
    if (!this.head) {
          return ; // List is empty
      }

    return this.head.next === this.head;
  
  }                      

}
export default TurnList
