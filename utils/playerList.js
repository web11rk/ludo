import { GLOBALPARAMS } from "../common/gameConstants.js";

class Node {
    constructor(data) {
      this.data = data;
      this.next = null;
    }
  }
  
  class PlayerList {
    constructor() {
      this.head = null;
    }
  
    append(data) {
      const newNode = new Node(data);
      if (!this.head) {
        this.head = newNode;
        newNode.next = this.head;
      } else {
        let current = this.head;
        while (current.next !== this.head) {
          current = current.next;
        }
        current.next = newNode;
        newNode.next = this.head;
      }
    }
  
    insertAfter(targetData, newData) {
      if (!this.head) {
        return;
      }
  
      let current = this.head;
      do {
        if (current.data === targetData) {
          const newNode = new Node(newData);
          newNode.next = current.next;
          current.next = newNode;
          return;
        }
        current = current.next;
      } while (current !== this.head);
    }
  
    delete(data) {
      if (!this.head) {
        return;
      }
  
      if (this.head.data === data) {
        let current = this.head;
        while (current.next !== this.head) {
          current = current.next;
        }
        current.next = this.head.next;
        this.head = this.head.next;
        return;
      }
  
      let current = this.head;
      while (current.next !== this.head) {
        if (current.next.data === data) {
          current.next = current.next.next;
          return;
        }
        current = current.next;
      }
    }
  
    search(data) {
      if (!this.head) {
        return false;
      }
  
      let current = this.head;
      do {
        if (current.data === data) {
          return true;
        }
        current = current.next;
      } while (current !== this.head);
  
      return false;
    }
  
    display() {
      if (!this.head) {
         GLOBALPARAMS.isLogs && console.log('List is empty.');
        return;
      }
  
      let current = this.head;
      do {
        //  GLOBALPARAMS.isLogs && console.log(current.data);
        current = current.next;
      } while (current !== this.head);
    }
  }

  export default PlayerList