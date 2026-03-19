import * as dotenv from 'dotenv'
import redis from 'redis'
dotenv.config()
const redisClientWeb11 = redis.createClient({
    url: process.env.Web11_ENT_REDIS_URL  
})
 
redisClientWeb11.on('error', function (err) {
     console.log('Could not establish a connection with redis. ' + err)
})
redisClientWeb11.on('connect', function (err) {
     console.log('Connected to redis Web 11 successfully')
})


redisClientWeb11.connect()

export default redisClientWeb11