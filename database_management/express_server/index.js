
const express = require('express')
const bodyParser = require('body-parser')
const mongoDb = require('mongodb')
const fs = require("fs")

// setup server
const app = express()
const port = 3000 // needs to corrispond to the port that the docker run command gets to
app.use(bodyParser.json())
const DEFAULT_COLLECTION = "main"
const DEFAULT_DATABASE = "main"

// 
// api
// 
    // set
    // get
    // all
    // delete
    // eval
    // keys
    // find
    // size
    // TODO: has
    // TODO: filter
    // TODO: sample

let createEndpoint = (name, theFunction) => {
    app.post(
        `/${name}`,
        // this wraps all the api calls 
        // to basically 1. parse the arugments for them 
        // and 2. ensure that the server always sends a response
        async (req, res) => {
            try {
                let args = req.body
                output = await theFunction(args)
                res.send({ value: output })
            } catch (error) {
                res.send({ error: `${error.message}:\n${error}` })
            }
        }
    )
}

// function for retrying connections
let connect
connect = async () => {
    try {
        let client = await mongoDb.MongoClient.connect('mongodb://localhost:27017/admin/main')
        // init variables
        let db = client.db(DEFAULT_DATABASE)
        let collection = db.collection(DEFAULT_COLLECTION)
        
        // 
        // only setup the app once the database has been connected
        // 
        app.get('/', (req, res) => {
            res.send('EZ database server is running!')
        })
        
        // 
        // set
        // 
        createEndpoint('set', async ({ key, value }) => {
            // TODO: add a check to make sure the key doesn't start with _ or $
            await collection.updateOne(
                {
                    _id: key
                },
                {
                    $set: { "_v": value },
                },
                {
                    upsert: true, // create it if it doesnt exist
                }
            )
            return true
        })
        
        // 
        // get
        // 
        createEndpoint('get', async ({ key }) => {
            output = await collection.findOne(
                {
                    _id: key
                },
            )
            return output == null ? output : output._v
        })

        // 
        // delete
        //
        createEndpoint('delete', async ({ key }) => {
            await collection.deleteOne(
                {
                    _id: key
                },
            )
            return true
        })
        
        // 
        // size
        //
        createEndpoint('size', () => collection.count())

        // 
        // eval
        // 
        createEndpoint('eval', ({ key, args }) => collection[key](...args))
        
        // 
        // all
        // 
        createEndpoint('all', (args) => new Promise((resolve, reject)=>{
            collection.find().toArray((err, results)=>{
                // handle errors
                if (err) {
                    return reject(err)
                }
                // convert data to single object
                let actualResults = {}
                for (const each of results) {
                    actualResults[each._id] = each._v
                }
                resolve(actualResults)
            })
        }))

        // 
        // keys
        // 
        createEndpoint('keys', (args) => new Promise((resolve, reject)=>{
            collection.find({}, {_id:1, _v:0}).toArray((err, results)=>{
                // handle errors
                if (err) {
                    return reject(err)
                }
                // convert data to single object
                resolve(results.map(each=>each._id))
            })
        }))
        
        // 
        // find (WIP!)
        // 
        createEndpoint('find', (args) => new Promise((resolve, reject)=>{
            let filter = {_id:0, _v:1}
            // put "_v." in front of all keys being accessed by find
            for(let eachKey in args) {
                if (typeof eachKey == 'string') {
                    if (eachKey[0] != '$' && eachKey[0] != '_') {
                        // create a new (corrected) key with the same value
                        args['_v.'+eachKey] = args[eachKey]
                        // remove the old key
                        delete args[eachKey]
                    }
                }
            }
            console.log(`args is:`,args)
            collection.find({...args}, filter).toArray((err, results)=>{
                // handle errors
                if (err) {return reject(err) }
                // convert data to single object
                resolve(results.map(each=>each._v))
            })
        }))
        
        // 
        // start the server
        // 
        app.listen(port, () => console.log(`\n\n\n#\n# Database server is running\n#\n\n\n`))
    } catch (error) {
        // if its a conntection issue retry
        if (error instanceof mongoDb.MongoNetworkError) {
            console.log(`Unable to connect to mongodb (give it a few seconds), retrying in a few seconds`)
            let sleepTime = 6 // seconds
            setTimeout(() => {
                // check if it is generateing a database
                if (!fs.existsSync("/data/db/mongod.lock")) {
                    console.log(`\n\nIt appears the mongodb database hasn't been setup yet\nthis is probably NOT a problem, I'm going to wait ${sleepTime} seconds and then check on the process again\n\nIf you see this message after several minutes of waiting, something is probably wrong\nit is likely that the volume that was supposed to be mounted\n    --volume FOLDER_WITH_YOUR_DATABASE:/data\nwas somehow not setup correctly (or maybe you never added that volume at all)\nBTW this check uses the /data/db/mongod.lock to confirm if the database exists`)
                }
                connect()
            }, sleepTime * 1000)
        }
    }
}
// start trying to connect
connect()