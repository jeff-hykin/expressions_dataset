// import some basic tools for object manipulation
const { recursivelyAllAttributesOf, get, merge, valueIs } = require("good-js")
// import project-specific tools
const { doAsyncly, createEndpoint, validateKeyList, validateValue, processKeySelectorList } = require("./endpoint_tools")

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

module.exports = {
    setupEndpoints: ({ db, collection })=> {
        let { app } = require("./server")

        // 
        // just a ping method to check if running/accessible
        // 
        app.get('/', (req, res) => {
            res.send('EZ database server is running!')
        })

        // 
        // set
        // 
        createEndpoint('set', async ({ keyList, value }) => doAsyncly(_=>{
            // argument processing
            let [idFilter, valueKey] = processKeySelectorList(keyList)
            // check for invalid keys inside the value
            validateValue(value)

            collection.updateOne(idFilter,
                {
                    $set: { [valueKey]: value },
                },
                {
                    upsert: true, // create it if it doesnt exist
                }
            )
        }))

        // 
        // bulkSet
        // 
        createEndpoint('bulkSet', async (setters) => {
            for (let { keyList, value } of setters) {
                // argument processing
                let [idFilter, valueKey] = processKeySelectorList(keyList)
                // check for invalid keys inside the value
                validateValue(value)

                collection.updateOne(idFilter,
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
        createEndpoint('merge', async ({ keyList, value }) => {
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

            collection.updateOne(idFilter,
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
        createEndpoint('bulkMerge', async (mergers) => doAsyncly(_=>{
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

                    collection.updateOne(idFilter,
                        {
                            $set: { [valueKey]: newValue },
                        },
                        {
                            upsert: true, // create it if it doesnt exist
                        }
                    )
                })
            }
        }))

        // 
        // get
        // 
        createEndpoint('get', async ({ keyList }) => {
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
        createEndpoint('delete', async ({ keyList }) => {
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
        createEndpoint('size', () => collection.count())

        // 
        // eval
        // 
        createEndpoint('eval', ({ key, args }) => {
            return collection[key](...args)
        })
        
        // 
        // all // TODO: remove all replace with "each"
        // 
        createEndpoint('all', (args) => new Promise((resolve, reject)=>{
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
        createEndpoint('keys', (args) => new Promise((resolve, reject)=>{
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
        createEndpoint('find', (args) => new Promise((resolve, reject)=>{
            let returnValueFilter = {_id:1}
            // put "_v." in front of all keys being accessed by find
            for(let eachKey in args) {
                if (typeof eachKey == 'string' && eachKey.length != 0) {
                    if (eachKey[0] != '$' && eachKey[0] != '_') {
                        // create a new (corrected) key with the same value
                        args['_v.'+eachKey] = args[eachKey]
                        // remove the old key
                        delete args[eachKey]
                    }
                }
            }
            collection.find({...args}, {projection: returnValueFilter}).toArray((err, results)=>{
                // handle errors
                if (err) {return reject(err) }
                resolve(results.map(each=>each._id))
            })
        }))

        // 
        // sample
        // 
        createEndpoint('sample', async ({ quantity, filter }) => {
            let results = await collection.aggregate([{ $match: { _id:{$exists: true}, ...filter} }, { $project: { _id: 1 }}, { $sample: { size: quantity }, } ]).toArray()
            return results.map(each=>each._id)
        })
    }
}