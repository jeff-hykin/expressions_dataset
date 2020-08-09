// import some basic tools for object manipulation
const { recursivelyAllAttributesOf, get, merge, valueIs } = require("good-js")
// import project-specific tools
const { 
    doAsyncly,
    databaseActions,
    endpointWithReturnValue,
    endpointNoReturnValue,
    validateKeyList,
    validateValue,
    processKeySelectorList,
    convertFilter,
    resultsToObject,
    addScheduledDatabaseAction,
} = require("./endpoint_tools")

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
            collection.find().toArray((err, results)=>{
                // handle errors
                if (err) {
                    return reject(err)
                }
                resolve(resultsToObject(results))
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
            
            collection.find(
                convertFilter(args),
                {projection: returnValueFilter}
            ).toArray((err, results)=>{
                // handle errors
                if (err) {return reject(err) }
                resolve(results.map(each=>each._id))
            })
        }))

        // 
        // grab
        // 
        endpointWithReturnValue('grab', ({ searchFilter, returnFilter }) => new Promise((resolve, reject)=>{
            collection.find(
                convertFilter(searchFilter),
                {
                    projection: convertFilter({_id: 1, ...returnFilter})
                }
            ).toArray((err, results)=>{
                // handle errors
                if (err) {return reject(err) }
                resolve(resultsToObject(results))
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

        // 
        // custom
        // 
        endpointWithReturnValue('custom', async ({ operation, args }) => {
            let possibleOperations = {
                booleanFaceLabels: async ()=>{
                    let videoId = get(args, [0], null)
                    // input checking
                    if (!valueIs(String, videoId)) {
                        throw Error(`Inside ${operation}. The argument needst to be a string (a video id). Instead it was:\n${JSON.stringify(videoId)}`)
                    }
                    // get the video
                    let video = await collection.findOne({_id: videoId })
                    // make sure its processes are complete
                    let runningProcesses = get(video,['_v','messages','running_processes'], [])
                    if (runningProcesses.length > 0) {
                        throw Error(`That video id=${videoId} still has running processes: ${runningProcesses}`)
                    }
                    // make sure it actually has frames
                    let frameLabels = {}
                    let frames = get(video, ['_v','frames'], {})
                    for (let eachFrameIndex in frames) {
                        let faces = get(frames, [ eachFrameIndex, 'faces_haarcascade_0-0-2', ], [])
                        if (faces.length > 0) {
                            frameLabels[eachFrameIndex] = 1
                        } else {
                            frameLabels[eachFrameIndex] = 0
                        }
                    }
                    return frameLabels
                },
                booleanHappyLabels: async ()=>{
                    let videoId = get(args, [0], null)
                    // input checking
                    if (!valueIs(String, videoId)) {
                        throw Error(`Inside ${operation}. The argument needst to be a string (a video id). Instead it was:\n${JSON.stringify(videoId)}`)
                    }
                    // get the video
                    let video = await collection.findOne({_id: videoId })
                    // make sure its processes are complete
                    let runningProcesses = get(video,['_v','messages','running_processes'], [])
                    if (runningProcesses.length > 0) {
                        throw Error(`That video id=${videoId} still has running processes: ${runningProcesses}`)
                    }
                    // make sure it actually has frames
                    let frameLabels = {}
                    let frames = get(video, ['_v','frames'], {})
                    for (let eachFrameIndex in frames) {
                        let wasHappy = false
                        let faces = get(frames, [ eachFrameIndex, 'faces_haarcascade_0-0-2', ], [])
                        for (let each of faces) {
                            let mostLikelyEmotion = get(each, ['emotion_vgg19_0-0-2', 'most_likely'], null)
                            let happynessPercent = get(each, ['emotion_vgg19_0-0-2', 'probabilities', 'happy'], 0)
                            if (mostLikelyEmotion == 'wasHappy' || happynessPercent > 50) {
                                wasHappy = true
                                break
                            }
                        }
                        if (wasHappy) {
                            frameLabels[eachFrameIndex] = 1
                        } else {
                            frameLabels[eachFrameIndex] = 0
                        }
                    }
                    return frameLabels
                },
            }
            // check input
            if (!valueIs(Array, args)) {
                throw Error(`when using /custom, the argument should have {operation: (a String), args: (an Array)}, instead args was ${JSON.stringify(args)}`)
            }
            // run the selected operation
            if (valueIs(Function, possibleOperations[operation])) {
                return possibleOperations[operation]()
            } else {
                throw Error(`I don't have a case for that operation. The options are ${Object.keys(possibleOperations)}`)
            }
        })
    }
}