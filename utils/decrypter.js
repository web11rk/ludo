import crypto from "crypto"
import dotenv from 'dotenv'
import { GLOBALPARAMS } from "../common/gameConstants.js";

dotenv.config()


export async function DecryptData(encryptedData)
{
    const  encryptedText = encryptedData;
    const algorithm = process.env.algorithm;
    const key = new Buffer(process.env.ENCRYPT_KEY, 'utf-8');
    const iv = new Buffer(process.env.ENCRYPT_IV, 'base64');    //This is from c# cipher iv
    const encrypted = new Buffer(encryptedText, 'base64');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decoded = decipher.update(encrypted, 'binary', 'ascii');
    decoded += decipher.final('ascii');
    GLOBALPARAMS.isLogs && console.log("Decoded data",decoded);
    return decoded;
}



