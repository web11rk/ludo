import * as dotenv from 'dotenv'
import redis from 'redis'
const redisClient = redis.createClient({
     // url: process.env.LUDO_ENT_REDIS_URL
    host: process.env.REDIS_HOST, // Replace with your Redis host
    port: process.env.REDIS_PORT, // Replace with your Redis port
})
redisClient.on('error', function (err) {
     console.log('Could not establish a connection with redis. ' + err)
})
redisClient.on('connect', function (err) {
     console.log('Connected to redis successfully')
})


redisClient.connect()

export default redisClient