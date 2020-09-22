// import some basic tools for object manipulation
const { recursivelyAllAttributesOf, get, merge, valueIs, logBlock, dynamicSort } = require("good-js")
// import project-specific tools
const { 
    smartEndpoints,
    collectionMethods,
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
    setupEndpoints: ({ db, mainCollection, client })=> {
        let { app } = require("./server")
        
        // allow querying what endpoints are avalible
        endpointWithReturnValue(`smartEndpoints`, ()=>smartEndpoints)
        endpointWithReturnValue(`collections`, async ()=>(await db.listCollections({},{}).toArray()).map(each=>each.name))

        // expose the collection methods
        collectionMethods.db = db // should probably change this to be less global-var-like
        for (let eachMethod in collectionMethods) {
            endpointWithReturnValue(`raw/${eachMethod}`, (args)=>{
                return collectionMethods[eachMethod](...args)
            })
        }

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

            await mainCollection.updateOne(idFilter,
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

                await mainCollection.updateOne(idFilter,
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
                let output = await mainCollection.findOne(idFilter)
                currentValue = get(output, valueKey, null)
            } catch (error) {}
            
            // add it all the new data without deleting existing data
            // TODO: probably a more efficient way to do this in mongo instead of JS
            newValue = merge(currentValue, newValue)

            await mainCollection.updateOne(idFilter,
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
                        let output = await mainCollection.findOne(idFilter)
                        currentValue = get(output, valueKey, null)
                    } catch (error) {}
                    
                    // add it all the new data without deleting existing data
                    // TODO: probably a more efficient way to do this in mongo instead of JS
                    newValue = merge(currentValue, newValue)

                    await mainCollection.updateOne(idFilter,
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
        // summary/labels
        // 
        endpointWithReturnValue('summary/labels', async ({ keyList }) => {
            // TODO: eventually this will need to be done in a generator-like fasion because there will be too many moments
            // TODO: this could probably all be done with a single mongo query
            let moments = await collectionMethods.all({
                from: 'moments',
                // for now, only look for ones with key segments
                // otherwise this function will consume +8Gb of ram
                where: [
                    {
                        valueOf: ["type"],
                        is: "keySegment",
                    }
                ]
            })
            let results = {}
            
            // TODO: find a better solution for this
            // combine the data from all sources into a single source
            for (let eachSegment of moments) {
                let combinedData = {}
                // basically ignore who said what and just grab the data
                for (const [eachUsername, eachObservation] of Object.entries(eachSegment.observations)) {
                    combinedData = { ...combinedData, ...eachObservation }
                }
                eachSegment.data = combinedData
            }
            
            let videosWithLabels = new Set()

            // count the label for each
            for (const eachMoment of moments) {
                videosWithLabels.add(eachMoment.videoId)
                // init
                if (!(eachMoment.data.label in results)) {
                    results[eachMoment.data.label] = {}
                    results[eachMoment.data.label].videos = {[eachMoment.videoId]: 1}
                    results[eachMoment.data.label].segmentCount = 1
                // update
                } else {
                    results[eachMoment.data.label].videos[eachMoment.videoId] += 1
                    results[eachMoment.data.label].segmentCount += 1
                }
            }
            
            // generate videoCount
            for (const [key, value] of Object.entries(results)) {
                // record length
                value.videoCount = Object.keys(value.videos).length
                // sort by segment count (split into [keys, values], then sort by value (e.g. 1))
                value.videos = Object.fromEntries(Object.entries(value.videos).sort(dynamicSort([1], true)))
            }

            // show how many videos are unlabelled
            let videosWithoutLabels = await collectionMethods.all({
                from:"videos",
                where: [
                    {
                        hiddenValueOf: [ "_id" ],
                        isNotOneOf: [...videosWithLabels]
                    }
                ],
                forEach: {
                    extractHidden: [ "_id" ]
                },
            })
            results["(No Segments)"] = {
                videos: Object.fromEntries([...videosWithoutLabels].map(each=>[each, 1])),
                segmentCount: 0,
            }

            // sort results by largest segmentCount
            results = Object.fromEntries(Object.entries(results).sort(dynamicSort([1, "segmentCount"], true)))

            return results
        })
        
        // 
        // get
        // 
        endpointWithReturnValue('get', async ({ keyList }) => {
            // argument processing
            let [idFilter, valueKey] = processKeySelectorList(keyList)
            // TODO: improve this by adding a return value filter
            let output = await mainCollection.findOne(idFilter)
            
            let returnValue = get(output, valueKey, null)
            // try to get the value (return null if unable)
            return returnValue
        })

        // 
        // delete
        //
        endpointNoReturnValue('delete', async ({ keyList }) => {
            // argument processing
            let [idFilter, valueKey] = processKeySelectorList(keyList)
            // if deleting the whole element
            if (keyList.length == 1) {
                return await mainCollection.deleteOne(idFilter)
            } else if (keyList.length > 1) {
                return await mainCollection.updateOne(idFilter,
                    {
                        $unset: { [valueKey]: "" },
                    }
                )
            }
        })
        
        // 
        // size
        //
        endpointWithReturnValue('size', () => mainCollection.countDocuments())

        // 
        // eval
        // 
        endpointWithReturnValue('eval', ({ key, args }) => {
            return mainCollection[key](...args)
        })
        
        // 
        // all // TODO: remove all replace with "each"
        // 
        endpointWithReturnValue('all', (args) => new Promise((resolve, reject)=>{
            mainCollection.find().toArray((err, results)=>{
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
            mainCollection.find({}, {projection: returnValueFilter}).toArray((err, results)=>{
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
            
            mainCollection.find(
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
            mainCollection.find(
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
            let results = await mainCollection.aggregate([
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
                    let video = await mainCollection.findOne({_id: videoId })
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
                    let video = await mainCollection.findOne({_id: videoId })
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