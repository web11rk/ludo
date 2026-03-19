import { GLOBALPARAMS, JOINING_OBJECT_CLASSES, SAFE_ZONES } from "../common/gameConstants.js";
import mongoose from 'mongoose'
class UtilityFunctions
{
    
    static ReverseSubArray(arr, start, end)
    {
        if (start < 0 || end >= arr.length || start >= end) {
          // Invalid input range
          return arr;
        }
      
        const subArray = arr.slice(start, end + 1);
        subArray.reverse();
      
        // arr.splice(start, subArray.length, subArray);
      
        return arr.slice(0, start).concat(subArray, arr.slice(end + 1));
    }

    static FormatName(name, maxlength) 
    {
        if (name.length > maxlength) 
        {
          name = name.slice(0, maxlength) + "...";
        }
        return name;
    }

    static FormatAmount(num, digits = 2) 
    {
        const lookup = [
          { value: 1, symbol: "" },
          { value: 1e5, symbol: " Lakh" },
          { value: 1e7, symbol: " Crore" },
        ];
        const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
        const item = lookup
          .slice()
          .reverse()
          .find((item) => num >= item.value);
        return item
          ? (num / item.value).toFixed(digits).replace(rx, "$1") + item.symbol
          : "0";
    }

    static SafeZones()
    {
      SAFE_ZONES.set('1',1)
      SAFE_ZONES.set('9',9)
      SAFE_ZONES.set('14',14)
      SAFE_ZONES.set('22',22)
      SAFE_ZONES.set('27',27)
      SAFE_ZONES.set('35',35)
      SAFE_ZONES.set('40',40)
      SAFE_ZONES.set('48',48)

      // for player 1 Home path
      // 52,53,54,55,56,57
      SAFE_ZONES.set('52',52)
      SAFE_ZONES.set('53',53)
      SAFE_ZONES.set('54',54)
      SAFE_ZONES.set('55',55)
      SAFE_ZONES.set('56',56)
      SAFE_ZONES.set('57',57)
      
      // for player 2 home path
      // 59,60,61,62,63,64
      SAFE_ZONES.set('59',59)
      SAFE_ZONES.set('60',60)
      SAFE_ZONES.set('61',61)
      SAFE_ZONES.set('62',62)
      SAFE_ZONES.set('63',48)
      SAFE_ZONES.set('64',64)
      
      // for player 3 home path
      // 65,66,67,68,69,70
      SAFE_ZONES.set('65',65)
      SAFE_ZONES.set('66',66)
      SAFE_ZONES.set('67',67)
      SAFE_ZONES.set('68',68)
      SAFE_ZONES.set('69',69)
      SAFE_ZONES.set('70',70)
     
      // for player 4 home path
      // 71,72,73,74,75,76 
      SAFE_ZONES.set('71',71)
      SAFE_ZONES.set('72',72)
      SAFE_ZONES.set('73',73)
      SAFE_ZONES.set('74',74)
      SAFE_ZONES.set('75',75)
      SAFE_ZONES.set('76',76)

    }

    static splitRankWiseData(start, end, price) 
    {
      const arr = [];
      for (let index = start - 1; index < end; index++) {
        arr.push({
          image: "",
          price,
          rank: `Rank ${index + 1}`,
        });
      }
      return arr;
    };
    
    static checkOddEvenToken(number) {
      let value;
      if (number % 2 === 0) {
          //even
        return value = true
      } else {
          //odd
          return value = false
      }
    }

    static BoolParser(boolStr)
    {
         GLOBALPARAMS.isLogs && console.log("boolString input "+boolStr);
        let returnBool = false;
        if((boolStr === "False") || (boolStr ==="false"))
        {
            returnBool = false;
        }
        else if((boolStr === "True") || (boolStr === "true"))
        {
            returnBool = true;
        }
         GLOBALPARAMS.isLogs && console.log("boolString output "+returnBool);
        return returnBool
    }
}
export function Delay(ms) 
{
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function isValidObjectId(id)
{
  return mongoose.Types.ObjectId.isValid(id);
}
export async function AddTimeStampInObject(data)
{
  let timeStampObj = data;
  timeStampObj.timeStamp = GetCurrentDateTimeInIST(false);
  return JSON.stringify(timeStampObj);
}
export function DeleteJoiningObjectClass(roomID)
{
  JOINING_OBJECT_CLASSES.has(roomID)
  {
    JOINING_OBJECT_CLASSES.delete(roomID);
  }
}
export function GetCurrentDateTimeInIST(getObject)
{
  const utcTimestamp = new Date();

  // Options for formatting the date string

  const options = {
    timeZone: 'Asia/Kolkata', // 'Asia/Kolkata' is the time zone for Indian Standard Time (IST)
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3, // Include milliseconds
    };

  const istDateString = utcTimestamp.toLocaleString('en-US', options);
  const parts = istDateString.split(/[\s,]+/);
  const [month, day, year] = parts[0].split('/');
  const [hours, minutes, secondDis] = parts[1].split(':');
  const seconds = secondDis.split('.')[0];
  const milliseconds = secondDis.split('.')[1];

  const date = {
    "date": day,
    "month": month,
    "year": year,
    "hour": hours,
    "minute": minutes,
    "seconds": seconds,
    "milliSeconds": milliseconds
  }

  if(getObject)
  {
    let dateObj1 = JSON.stringify(date);
    return dateObj1;
  }
  else
  {
    const dateString = year+"-"+month+"-"+day+" "+hours+":"+minutes+":"+seconds+"."+milliseconds;
    return dateString;
  }
 
}
export function GetDynamicYear() {
  const currentYear = new Date().getFullYear();
  const lastFiveYears = Array.from({ length: 5 }, (_, index) => currentYear - index);
  const randomYear = lastFiveYears[Math.floor(Math.random() * lastFiveYears.length)];
  return randomYear.toString()
}
export default UtilityFunctions;
