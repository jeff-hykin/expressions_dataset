const express = require('express')
const bodyParser = require('body-parser')

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
    // TODO: has
    // TODO: delete
    // TODO: filter

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

require('mongodb').MongoClient.connect(
    'mongodb://localhost:27017/admin/main',
    (err, client) => {
        if (err != null) {
            throw err
        }
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
        // start the server
        // 
        app.listen(port, () => console.log(`\n\n\n#\n# Database server is running\n#\n\n\n`))
    }
)
