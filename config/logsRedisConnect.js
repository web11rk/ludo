import * as dotenv from 'dotenv'
import redis from 'redis'
dotenv.config()
const redisLogs = redis.createClient({
    url: process.env.LOGS_ENT_REDIS_URL  
})
redisLogs.on('error', function (err) {
     console.log('Could not establish a connection with Logs Server redis. ' + err)
})
redisLogs.on('connect', function (err) {
     console.log('Connected to redis Log Redis successfully')
})


redisLogs.connect()

export default redisLogs