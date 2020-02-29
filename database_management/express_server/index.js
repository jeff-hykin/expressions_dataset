const express = require('express')
const bodyParser = require('body-parser')

// setup server
const app = express()
const port = 3000
app.use(bodyParser.json())
const DEFAULT_COLLECTION = "main"
const DEFAULT_DATABASE = "main"

// 
// api
// 
    // set
    // get
    // delete
    // filter


// this wraps all the api calls to basically parse the arugments for them and ensure that the server always sends a response
let errorWrapper = (aFunction) => async (req, res) => {
    try {
        let args = req.body
        console.log(`args is:`,args)
        output = await aFunction(args)
        console.log(`output is:`,output)
        res.send({ value: output })
    } catch (error) {
        res.send({ error: `${error.message}:\n${error}` })
    }
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
            res.send('Hello World!')
        })
        
        // 
        // set
        // 
        app.post('/set', errorWrapper(({ key, value }) => {
            collection.updateOne(
                {
                    _id: key
                },
                {
                    $set: { "_v": value },
                },
                {
                    upsert: true,
                }
            )
            return true
        }))
        
        // 
        // filter
        // 
        app.post('/filter', errorWrapper((args) => new Promise((resolve, reject)=>{
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
                    console.log(`actualResults is:`,actualResults)
                    resolve(actualResults)
                })
            })
        ))

        app.listen(port, () => console.log(`Server app listening on docker port ${port}!`))
    }
)
