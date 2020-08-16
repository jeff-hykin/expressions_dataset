
// import some basic tools for object manipulation
const { recursivelyAllAttributesOf, get, merge, valueIs } = require("good-js")
// import project-specific tools
let { app } = require("./server")
const { response } = require("express")
let package = require('../package.json')
let compressionMapping = require("../"+package.parameters.pathToCompressionMapping)
let fs = require("fs")
let md5 = require("crypto-js/md5")
let BigNumber = require('big-number')

const DATABASE_KEY = "4a75cfe3cdc1164b67aae6b413c9714280d2f102"

let databaseActions = []
let databaseActionsAreBeingExecuted = false

// this is basically middleware
// ... should probably make it official middleware but I'll do that later
let processRequest = (request) => {
    // some very very very very very basic form of security
    if (request.body.key == DATABASE_KEY) {
        return request.body.args 
    } else {
        throw new Error(`\n\nThe database got your request and parsed the json. However, it looked for an AUTH key and didn't find one (or didn't find a correct one). If you should be authorized to access this, then post an issue on https://github.com/jeff-hykin/iilvd_interface\n\nPOSTed data:\n${request.body}`)
    }
}
module.exports = {
    databaseActions,
    // 
    // this function helps ensure that all the actions involving the database
    // are performed in FIFO order AND that each action is 100% finished
    // before the next database action is started
    // (if they're not done like this, then MongoDB gets mad and throws an error)
    // 
    addScheduledDatabaseAction(action) {
        // put it on the scheudler 
        databaseActions.push(action)
        
        // if there's already an instance of the executor running
        // then dont start a new one
        if (!databaseActionsAreBeingExecuted) {
            let theActionExecutor = async _=>{
                // if starting
                databaseActionsAreBeingExecuted = true
                // keep looping rather than iterating
                // because more items are going to be added while
                // eariler ones are being executed
                while (true) {
                    let nextAction = databaseActions.shift()
                    if (nextAction === undefined) {
                        break
                    } else {
                        await nextAction()
                    }
                }
                // once all tasks are completed, turn the system off
                databaseActionsAreBeingExecuted = false
            }
            // start the theActionExecutor (but don't wait for it to finish)
            theActionExecutor()
        }
    },

    endpointWithReturnValue(name, theFunction) {
        app.post(
            `/${name}`,
            // this wraps all the api calls 
            // to basically 1. parse the arugments for them 
            // and 2. ensure that the server always sends a response
            (req, res) => {
                // whats going on here with aysnc is complicated
                // basically we need to listen for when theFunction finishes (so we can send a response)
                // BUT we can't start theFunction here because it has database actions, which need to
                // happen FIFO order (first one needs to finish before calling a second one).
                // Code somewhere else (addScheduledDatabaseAction) ensures functions given to it are executed in-order
                // so we create a wrapper for theFunction and give the wrapped function addScheduledDatabaseAction
                // that way, inside the wrapper, we know when theFunction finished even though we don't know when it starts
                module.exports.addScheduledDatabaseAction(async () => {
                    let args
                    try {
                        args = processRequest(req)
                        let output = theFunction(args)
                        if (output instanceof Promise) {
                            output = await output
                        }
                        // send the value back to the requester
                        res.send({ value: output })
                    } catch (error) {
                        // tell the requester there was an error
                        res.send({ error: `${error.message}:\n${JSON.stringify(error)}\n\nfrom: ${name}\nargs:${args}` })
                    }
                })
                 
            }
        )
    },

    endpointNoReturnValue(name, theFunction) {
        app.post(
            `/${name}`,
            // this wraps all the api calls 
            // to basically 1. parse the arugments for them 
            // and 2. ensure that the server always sends a response
            (req, res) => {
                let args
                try {
                    args = processRequest(req)
                    // just tell the requester the action was scheduled
                    res.send({ actionScheduled: true })
                    // then put it on the scheduler
                    module.exports.addScheduledDatabaseAction(_=>theFunction(args))
                } catch (error) {
                    // tell the requester there was an error if the args couldn't be parsed
                    res.send({ error: `${error.message}:\n${JSON.stringify(error)}\n\nfrom: ${name}\nargs:${args}` })
                }
            }
        )
    },

    validateKeyList(keyList) {
        for (let eachIndex in keyList) {
            let eachKey = keyList[eachIndex]
            // convert numbers to strings
            if (valueIs(Number, eachKey)) {
                // mutate the list to convert numbers to strings
                keyList[eachIndex] = `${eachKey}`
            } else if (valueIs(String, eachKey)) {
                if (eachKey.match(/\$|\./)) {
                    throw new Error(`\n\nThere's a key ${keyList} being set that contains\neither a \$ or a \.\nThose are not allowed in MongoDB`)
                }
            } else {
                throw new Error(`\n\nThere's a key in ${keyList} and the value of it isn't a number or a string\n(which isn't allowed for a key)`)
            }
        }
        return keyList.join(".")
    },

    validateValue(valueObject) {
        if (valueObject instanceof Object) {
            for (let eachKeyList of recursivelyAllAttributesOf(valueObject)) {
                module.exports.validateKeyList(eachKeyList)
            }
        }
        return true
    },

    processKeySelectorList(keySelectorList) {
        module.exports.validateKeyList(keySelectorList)
        let id = { _id: keySelectorList.shift() }
        keySelectorList.unshift("_v")
        let valueKey = keySelectorList.join(".")
        return [id, valueKey]
    },

    convertFilter(object) {
        if (!(object instanceof Object)) {
            return {}
        }

        // create a deep copy
        let filter = JSON.parse(JSON.stringify(object))

        // put "_v." in front of all keys being accessed by find
        for(let eachKey in filter) {
            if (typeof eachKey == 'string' && eachKey.length != 0) {
                // special keys start with $ and _
                if (eachKey[0] == '$' || eachKey[0] == '_') {
                    // dont delete it (do nothing)
                } else {
                    // create a new (corrected) key with the same value
                    filter['_v.'+eachKey] = filter[eachKey]
                    // remove the old key
                    delete filter[eachKey]
                }
            } else {
                // delete any random attributes tossed in here (Symbols)
                delete filter[eachKey]
            }
        }

        // TODO: should probably add a error for keys with underscores that are not _v or _id

        return filter
    },

    resultsToObject(results) {
        let actualResults = {}
        for (const each of results) {
            if (each._v) {
                let keyCount  = Object.keys(each._v).length
            }
            actualResults[each._id] = each._v
        }
        return actualResults
    },

    convertKeys(dataValue, saveToFile=true) {
        if (dataValue instanceof Array) {
            let output = []
            for (let each of dataValue) {
                output.push(module.exports.convertKeys(each, saveToFile))
            }
            return output
        } else if (dataValue instanceof Object) {
            let output = {}
            for (let eachOriginalKey in dataValue) {
                // try to get the encoded value (always a string of a positive integer)
                let encodedValue = compressionMapping.getEncodedKeyFor[eachOriginalKey]
                // if the encoded key exists, then use it
                if (!encodedValue) {
                    // increase the index, use BigInt which has no upper bound
                    // to save on string space, use the largest base conversion
                    const maxAllowedNumberBaseConversion = 36
                    let totalCount = BigNumber(compressionMapping.totalCount)
                    compressionMapping.totalCount = `${totalCount.add(1)}`.toString(maxAllowedNumberBaseConversion)
                    // need a two way mapping for incoming and outgoing data
                    compressionMapping.getOriginalKeyFor[compressionMapping.totalCount] = eachOriginalKey
                    compressionMapping.getEncodedKeyFor[eachOriginalKey] = compressionMapping.totalCount
                    encodedValue = compressionMapping.totalCount
                    if (saveToFile) {
                        // save the new key to disk
                        fs.writeFileSync(package.parameters.pathToCompressionMapping, JSON.stringify(compressionMapping))
                    }
                }
                // convert the key to an encoded value
                output[encodedValue] = module.exports.convertKeys(dataValue[eachOriginalKey], saveToFile)
            }
            return output
        } else {
            return dataValue
        }
    },

    convertVersion1ToVersion2(id, oldValue) {
        let newValue = {
            summary: {
                id: id,
                title: null,
                source: "youtube", // hash this value on the way in, unhash it on way out
                duration: null,
                // url: auto generate me on the way out
                creator: null,
            },
            large_metadata: {},
            related_videos: {},
            human_data: {
                frames: null,
                segments: null,
            },
            video_formats: [
                // frames only exist if the duration and max frame count
                // generate the x%, y% etc on the way out
            ],
            processes: {
                incomplete:{
                    
                },
                completed:{

                },
            },
        }

        // skip the id if it is just null
        if (!(oldValue._v != null && Object.keys(oldValue).length > 0)) {
            return null
        }

        let removeFrames = false
        // 
        // [done] summary
        // 
        if (oldValue.basic_info instanceof Object) {
            // cover the summary
            newValue.summary = {
                ...newValue.summary,
                duration: oldValue.basic_info.duration,
            }
            downloadError = oldValue.basic_info.download_error
        }
        // 
        // [done] large_metadata
        // 
        
        // do nothing, no large metadata yet


        // 
        // [done] related videos
        // 
        if (oldValue.related_videos instanceof Object) {
            newValue.related_videos = oldValue.related_videos
        }

        // 
        // [done] processes
        // 

        // don't convert, just clean out the existing frames if needed
        if (oldValue.messages instanceof Object && oldValue.messages.running_processes instanceof Array) {
            if (oldValue.messages.running_processes.length > 0) {
                removeFrames = true
            }
        }

        // 
        // [done] human data
        // 

        // do nothing, no human data yet

        // 
        // video_formats
        // 
        
        let framesExist = !(oldValue.frames instanceof Object) && Object.keys(oldValue.frames) > 0
        if (framesExist && !removeFrames) {
            let largestIndex = Math.max(...Object.keys(oldValue.frames))
            let numberOfFrames = Object.keys(oldValue.frames).length
            // 
            // check if there are any skipped frames
            // 
            // this checking is done by using their sums
            if (largestIndex == numberOfFrames) {
                
                // then assume largest index is the total number of frames in the video for this format
                let totalNumberOfFrames = numberOfFrames
                newValue.video_formats = [ 
                    {
                        height: oldValue.basic_info.height,
                        width: oldValue.basic_info.width,
                        framerate:  (newValue.summary.duration+0.0) / totalNumberOfFrames,
                        file_extension:  "mp4",
                        total_number_of_frames: totalNumberOfFrames,
                        // 
                        // frames
                        // 
                        frames: Object.values(oldValue.frames).map(each=>({
                            "faces_haarcascade-v1": each["faces_haarcascade_0-0-2"] ? ({
                                "x": each["faces_haarcascade_0-0-2"]["x"],
                                "y": each["faces_haarcascade_0-0-2"]["y"],
                                "width": each["faces_haarcascade_0-0-2"]["width"],
                                "height": each["faces_haarcascade_0-0-2"]["height"],
                                "emotion_vgg19-v1": each["faces_haarcascade_0-0-2"]["emotion_vgg19_0-0-2"] || null,
                            }) : null
                        })),
                        // 
                        // segments
                        // 
                        segments: [],
                    }
                ]
            }
            return newValue
        }
    },

    saveFrameV1ToFrameV2(id, frame, frameCollection) {
        // TODO: the x%, y%, for searching parts of a frame even across different resolutions
        // "x%": each["faces_haarcascade-v1"]["x"] /( newValue.video_formats.height ),
        // "y%": each["faces_haarcascade-v1"]["y"] /( newValue.video_formats.width ),
        // "width%": each["faces_haarcascade-v1"]["width"] /( newValue.video_formats.height ),
        // "height%": each["faces_haarcascade-v1"]["height"] /( newValue.video_formats.width ),
        // TODO: maybe add area%
    },

    createHashFrom(object, keys=null) {
        if (!keys) { keys = Object.keys(object)}
        let concatValue = ""
        for (let each in keys.sort()) {
            concatValue += JSON.stringify(object[each])
        }
        return md5(concatValue).toString()
    }
}

