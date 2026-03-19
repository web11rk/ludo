import { fileURLToPath } from 'url';
import { dirname } from 'path';
// import cron from 'node-cron'
import fs from 'fs'
import dotenv from 'dotenv'
import path from 'path';
import { GLOBALPARAMS } from '../common/gameConstants.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let fileLog;

import {Storage} from '@google-cloud/storage'
import redisClient from '../config/redisClient.js';
// import { da } from 'date-fns/locale';
import redisLogs from '../config/logsRedisConnect.js';
import _ from 'lodash';
// const { Storage } = require('@google-cloud/storage');
const bucketName = 'ludo-logs';


const storage = new Storage({
    projectId: 'prj-r11-fs-prd-1',
    keyFilename: './config/googleCredBucket.json',
});


dotenv.config()

export const roomLogs = async (data) => {
    if(!GLOBALPARAMS.isProd){
        fileLog = fs.createWriteStream(__dirname + '/logsHolder/' + data.roomID + '.log', { flags: 'w' });
    }
}

export const CheckLogsFileExist = (roomID, callback) => {
    const fileName = __dirname + '/logsHolder/' + roomID + '.log'
    let fileExist = false
    fs.access(fileName, fs.constants.F_OK, (err) => {
         GLOBALPARAMS.isLogs && console.log(err);
        if (err) {
          fileExist = false
        } else {
          fileExist = true
        }
        callback(fileExist);
    });
}

export const writeToLog = async (message,roomID,isHeading) => {
    GLOBALPARAMS.isProd ? WriteToLogInRedis(message,roomID,isHeading) : 
     CheckLogsFileExist(roomID, (fileExist) => {
        if (fileExist) {
            const fileName = __dirname + '/logsHolder/' + roomID + '.log'
            const fileLog = fs.createWriteStream(fileName, { flags: 'a' });
            const utcDate = new Date();
            const istTime = new Date(utcDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
            const formattedDateString = istTime.toUTCString().replace(' GMT+0000 (Coordinated Universal Time)', '');

            if(isHeading){
                fileLog.write(`${formattedDateString} - ${message}\n`);    
            }else{
                fileLog.write(`${formattedDateString} .............-> ${message}\n`);
            }
        }
    });
}

const checkHeading = (isHeading) => {
    
}

export const CroneJobForLogsFileDelete = ()=>{
    // 	0 0 * * * of every day
    //  */5 * * * * for 5 mins
    // cron.schedule(GLOBALPARAMS.croneJobs.EVERY_MONTH, () => {
    //     deleteAllFilesInDir()
    // });
} 


async function deleteAllFilesInDir() {
    try {
        const folderPath = __dirname + '/logsHolder/'
        fs.readdir(folderPath, (err, files) => {
            if (err) throw err;
        
            for (const file of files) {
                fs.unlink(path.join(folderPath, file), err => {
                    if (err) throw err;
                     GLOBALPARAMS.isLogs && console.log(`Deleted ${file}`);
                });
            }
        });
    } catch (err) 
    {
       GLOBALPARAMS.isLogs && console.log(err);
    }
}

export async function deleteSingleLogFile(roomID){
     GLOBALPARAMS.isLogs && console.log(roomID,"roomID>>>>>>>>>>>>>>>>");
    try {
        // const filePath = path.join(__dirname + '/logsHolder/' + roomID + '.log');
        // if (fs.existsSync(filePath)) {
        //     fs.unlink(filePath, (err) => {
        //         if (err) {
        //           console.error('Error deleting file:', err);
        //         } else {
        //            GLOBALPARAMS.isLogs && console.log('File deleted successfully:', filePath);
              
        //           // Introduce a small delay (e.g., 100 milliseconds)
        //           setTimeout(() => {
        //             // Check if the file still exists after the delay
        //             if (fs.existsSync(filePath)) {
        //                GLOBALPARAMS.isLogs && console.log('File still exists after delay:', filePath);
        //             } else {
        //                GLOBALPARAMS.isLogs && console.log('File does not exist after delay:', filePath);
        //             }
        //           }, 100);
        //         }
        //       });
        //   } else {
        //      GLOBALPARAMS.isLogs && console.log(`File not found: ${filePath}`);
        //   }

        /*const folderPath = __dirname + '/logsHolder/'; // Replace with the actual folder path
        const fileNameToDelete = roomID + '.log'; // Replace with the actual log file name
        
        const filePath = path.join(folderPath, fileNameToDelete);

        // Check if the file exists
        if (fs.existsSync(filePath)) {
        // Delete the file
        fs.unlink(filePath, (err) => {
            if (err) {
            console.error(`Error deleting file: ${err}`);
            } else {
             GLOBALPARAMS.isLogs && console.log(`File deleted successfully: ${filePath}`);
            }
        });
        } else {
         GLOBALPARAMS.isLogs && console.log(`File not found: ${filePath}`);
        }*/

    } catch (error) {
        //writeToLog("Delete Single file Error",error)
    }
}

// Call This for When You Want To logs from your room ID
// writeToLog(`Message:====>>>>>>>>>> ${joiningObject.playerName}`+joiningObject.roomID,joiningObject.roomID)






// const storage = new Storage();

async function appendToFile(bucketName, fileName, content) {
    const file = storage.bucket(bucketName).file(fileName);

            try {
                // Read existing content if the file exists
                const [existingContent] = await file.download();

                // Append new content to existing content
                const updatedContent = existingContent.toString() + content;

                // Upload the updated content back to the file
                await file.save(updatedContent);

                 GLOBALPARAMS.isLogs && console.log('Data appended successfully.');
            } catch (err) {
                // If the file doesn't exist, create it with the new content
                if (err.code === 404) {
                    await file.save(content);
                     GLOBALPARAMS.isLogs && console.log('File created with the new data.');
                } else {
                    throw err; // Propagate other errors
                }
            }
}

// Example usage
// const bucketName = 'your-bucket-name';
// const fileName = 'path/to/your/file.txt';
// const newLogs = 'New log entry 1\nNew log entry 2\n';

export const WriteToLogInRedis = async (message,roomID,isHeading) => {
    const messageData = { logs: message };
    if (isHeading) {
        messageData.additional_info = ' '.repeat(5)+'~~~~~~~~~~~~~~~~~~~~~~~~';
    }
    const key = `logs-${roomID}`
    await redisLogs.SADD('LudoRoomList',key)
    await redisLogs.XADD(key, '*' ,messageData, function(err, reply) {
        if(err) {
            console.error('Error while Xadd using in redis:', err);
        } else {
            //  GLOBALPARAMS.isLogs && console.log('Reply:', reply);
        }
    })
    await redisLogs.expire(key,GLOBALPARAMS.TtlTimeForSevenDays)
}


export const GetSingleRoom = async (roomid) => {
    const roomID =  `logs-${roomid}` || 'logs-10872205456:2024:01:2912:37:2024:01:2912:39_1'
    console.log(roomID,"roomid");
     GLOBALPARAMS.isLogs && console.log(roomID,"roomID");
        const fileName = __dirname + '/logsHolder/' + roomID + '.log'
        const fileLog = fs.createWriteStream(fileName, { flags: 'a' });

        let data = await redisLogs.xRange(roomID,'-','+')
        
        for(var i = 0; data.length > i ;i++ ){
            if(!_.isEmpty(data[i].message.additional_info)){
                const mergedString = `${data[i].message.additional_info} ${data[i].message.logs}`;
                fileLog.write(`${mergedString}\n`);
            }else{
                fileLog.write(`${data[i].message.logs}\n`);
            }
        }
         GLOBALPARAMS.isLogs && console.log(data.length > 0 && 'Logs Success fully Imported')
}