// import some basic tools for object manipulation
const { recursivelyAllAttributesOf, get, merge, valueIs } = require("good-js")
// import project-specific tools
const { doAsyncly, databaseActions, endpointWithReturnValue, endpointNoReturnValue, validateKeyList, validateValue, processKeySelectorList, convertFilter } = require("./endpoint_tools")

// 
// api
// 
    // set
    // bulkSet
    // merge
    // bulkMerge
    // get
    // delete
    // size
    // eval
    // all
    // keys
    // find
    // sample

// NOTE:
    // whether you use endpointWithReturnValue or endpointNoReturnValue
    // all database actions need to be await-ed in order to ensure
    // that all of their actions are performed in order without overlapping
    // (don't allow starting two database actions before one has finished)
    // 
    // IMO mongo should handle this, but it doesn't so we have to

module.exports = {
    setupEndpoints: ({ db, collection, client })=> {
        let { app } = require("./server")

        // 
        // just a ping method to check if running/accessible
        // 
        app.get('/', (req, res) => {
            res.send('EZ database server is running!')
        })
        
        // 
        // just a ping method to gracefully shutdown the database
        // 
        app.get('/shutdown', (req, res) => {
            let shutdown = async ()=> {
                let result = client.close()
                result instanceof Promise && (result = await result)
                res.send('\n#\n# Shutting down the Express.js Server!\n#\n')
                // close the whole server
                process.exit()
            }
            // if no pending processes, then just shutdown immediately
            if (databaseActions.length == 0) {
                shutdown()
            } else {
                console.log(`\n\nThere are ${databaseActions.length} databaseActions left\nshutdown scheduled after they're complete\n\n`)
                // tell it to shutdown as soon as all the writes are finished
                addScheduledDatabaseAction(shutdown)
            }
        })

        // 
        // set
        // 
        endpointNoReturnValue('set', async ({ keyList, value }) => {
            // argument processing
            let [idFilter, valueKey] = processKeySelectorList(keyList)
            // check for invalid keys inside the value
            validateValue(value)

            await collection.updateOne(idFilter,
                {
                    $set: { [valueKey]: value },
                },
                {
                    upsert: true, // create it if it doesnt exist
                }
            )
        })

        // 
        // bulkSet
        // 
        endpointNoReturnValue('bulkSet', async (setters) => {
            for (let { keyList, value } of setters) {
                // argument processing
                let [idFilter, valueKey] = processKeySelectorList(keyList)
                // check for invalid keys inside the value
                validateValue(value)

                await collection.updateOne(idFilter,
                    {
                        $set: { [valueKey]: value },
                    },
                    {
                        upsert: true, // create it if it doesnt exist
                    }
                )
            }
        })

        // 
        // merge
        // 
        endpointNoReturnValue('merge', async ({ keyList, value }) => {
            let newValue = value
            
            // argument processing
            let [idFilter, valueKey] = processKeySelectorList(keyList)
            // check for invalid keys inside the value
            validateValue(newValue)
            
            // retrive the existing value
            let currentValue
            try {
                // argument processing
                let output = await collection.findOne(idFilter)
                currentValue = get(output, valueKey, null)
            } catch (error) {}
            
            // add it all the new data without deleting existing data
            // TODO: probably a more efficient way to do this in mongo instead of JS
            newValue = merge(currentValue, newValue)

            await collection.updateOne(idFilter,
                {
                    $set: { [valueKey]: newValue },
                },
                {
                    upsert: true, // create it if it doesnt exist
                }
            )
        })

        // 
        // bulkMerge
        // 
        endpointNoReturnValue('bulkMerge', async (mergers) => {
            for (let { keyList, value } of mergers) {
                let newValue = value
            
                // argument processing
                let [idFilter, valueKey] = processKeySelectorList(keyList)
                // check for invalid keys inside the value
                validateValue(newValue)

                // que all of them before actually starting any of them
                // this is for better performance because of the await
                doAsyncly(async _=>{
                    
                    // retrive the existing value
                    let currentValue
                    try {
                        // argument processing
                        let output = await collection.findOne(idFilter)
                        currentValue = get(output, valueKey, null)
                    } catch (error) {}
                    
                    // add it all the new data without deleting existing data
                    // TODO: probably a more efficient way to do this in mongo instead of JS
                    newValue = merge(currentValue, newValue)

                    await collection.updateOne(idFilter,
                        {
                            $set: { [valueKey]: newValue },
                        },
                        {
                            upsert: true, // create it if it doesnt exist
                        }
                    )
                })
            }
        })

        // 
        // get
        // 
        endpointWithReturnValue('get', async ({ keyList }) => {
            // argument processing
            let [idFilter, valueKey] = processKeySelectorList(keyList)
            // TODO: improve this by adding a return value filter
            let output = await collection.findOne(idFilter)
            let returnValue = get(output, valueKey, null)
            // try to get the value (return null if unable)
            return returnValue
        })

        // 
        // delete
        //
        endpointWithReturnValue('delete', async ({ keyList }) => {
            // argument processing
            let [idFilter, valueKey] = processKeySelectorList(keyList)
            // if deleting the whole element
            if (keyList.length == 1) {
                return await collection.deleteOne(idFilter)
            } else if (keyList.length > 1) {
                return await collection.updateOne(idFilter,
                    {
                        $unset: { [valueKey]: "" },
                    }
                )
            }
        })
        
        // 
        // size
        //
        endpointWithReturnValue('size', () => collection.countDocuments())

        // 
        // eval
        // 
        endpointWithReturnValue('eval', ({ key, args }) => {
            return collection[key](...args)
        })
        
        // 
        // all // TODO: remove all replace with "each"
        // 
        endpointWithReturnValue('all', (args) => new Promise((resolve, reject)=>{
            let maxKeyCount = 0
            collection.find().toArray((err, results)=>{
                // handle errors
                if (err) {
                    return reject(err)
                }
                // convert data to single object
                let actualResults = {}
                for (const each of results) {
                    if (each._v) {
                        let keyCount  = Object.keys(each._v).length
                        if (keyCount > maxKeyCount) {
                            maxKeyCount = keyCount
                        }
                    }
                    actualResults[each._id] = each._v
                }
                resolve(actualResults)
            })
        }))

        // 
        // keys
        // 
        endpointWithReturnValue('keys', (args) => new Promise((resolve, reject)=>{
            let returnValueFilter = {_id:1}
            collection.find({}, {projection: returnValueFilter}).toArray((err, results)=>{
                // handle errors
                if (err) {
                    return reject(err)
                }
                // convert data to single object
                resolve(results.map(each=>each._id))
            })
        }))
        
        // 
        // find
        // 
        endpointWithReturnValue('find', (args) => new Promise((resolve, reject)=>{
            let returnValueFilter = {_id:1}
            
            collection.find(convertFilter(args), {projection: returnValueFilter}).toArray((err, results)=>{
                // handle errors
                if (err) {return reject(err) }
                resolve(results.map(each=>each._id))
            })
        }))

        // 
        // sample
        // 
        endpointWithReturnValue('sample', async ({ quantity, filter }) => {
            let results = await collection.aggregate([
                { $match: { _id:{$exists: true}, ...convertFilter(filter)} },
                { $project: { _id: 1 }},
                { $sample: { size: quantity }, }
            ]).toArray()
            return results.map(each=>each._id)
        })
    }
}