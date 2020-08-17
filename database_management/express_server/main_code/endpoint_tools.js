
// import some basic tools for object manipulation
const { recursivelyAllAttributesOf, get, merge, valueIs, logBlock, checkIf } = require("good-js")
// import project-specific tools
let { app } = require("./server")
const { response } = require("express")
let package = require('../package.json')
let compressionMapping = require("../"+package.parameters.pathToCompressionMapping)
let fs = require("fs")
let md5 = require("crypto-js/md5")
typeof BigInt == 'undefined' && (BigInt = require('big-integer')) // the '&&' is to handle old node versions that don't have BigInt

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

    processAndEncodeKeySelectorList(keySelectorList) {
        keySelectorList = [...keySelectorList]
        let idFilter = { _id: keySelectorList.shift() }
        let decodedKeyList = keySelectorList.map(each=>module.exports.getEncodedKeyFor(each))
        return [idFilter, decodedKeyList.join(".")]
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
    
    getEncodedKeyFor(string, saveToFile=true) {
        let originalKey = `${string}`
        let encodedKey = compressionMapping.getEncodedKeyFor[originalKey]
        if (encodedKey) {
            return encodedKey
        } else {

            // increase the index, use BigInt which has no upper bound
            // to save on string space, use the largest base conversion
            const maxAllowedNumberBaseConversion = 36
            compressionMapping.totalCount = (BigInt(compressionMapping.totalCount)+1).toString(maxAllowedNumberBaseConversion)
            // need a two way mapping for incoming and outgoing data
            encodedKey = '@'+compressionMapping.totalCount
            compressionMapping.getOriginalKeyFor[encodedKey] = originalKey
            compressionMapping.getEncodedKeyFor[originalKey] = encodedKey
            if (saveToFile) {
                // save the new key to disk
                fs.writeFileSync(package.parameters.pathToCompressionMapping, JSON.stringify(compressionMapping))
            }
            return encodedKey
        }
    },

    getDecodedKeyFor(string, saveToFile=true) {
        let encodedKey = `${string}`
        let originalKey = compressionMapping.getOriginalKeyFor[encodedKey]
        if (originalKey) {
            return originalKey
        } else {
            throw Error(`Couldn't find decoded key for ${JSON.stringify(encodedKey)}`)
        }
    },

    encodeKeyList(keyList) {
        if (keyList instanceof Array) {
            return keyList.map(each=>module.exports.getEncodedKeyFor(each))
        } else {
            return null
        }
    },
    
    /**
     * Encode value to MongoDb safe form
     *
     * @param {any} dataValue ex: { thing: ['a', 'b', 'c'], hello: "world" }
     * @return {any} ex: { '@1': { 'size': 3, 'isArray':true, '1':'a', '2':'b', '3':'c' }, "@2": "world" }
     *
     * @example
     *     encodeValue({
     *         thing: ['a', 'b', 'c'],
     *         hello: "world"
     *     })
     *     // results in:
     *     // {
     *     //     "size": 2,
     *     //     "keys": [ '@1', '@2' ]
     *     //     '@1': {
     *     //         'size': 3,
     *     //         '1':'a',
     *     //         '2':'b',
     *     //         '3':'c'
     *     //     },
     *     //     "@2": "world",
     *     // }
     */
    encodeValue(dataValue, saveToFile=true) {
        let output = dataValue
        if (dataValue instanceof Object) {
            output = {}

            // record size
            let keys = Object.keys(dataValue)
            output.size = keys.length

            // init recording keys (if not array)
            let isAnArray = dataValue instanceof Array
            if (!isAnArray) {
                output.keys = []
            }

            for (let eachOriginalKey in dataValue) {
                // convert the key to an encoded value
                let encodedKey
                // no encoding needed for array indices
                if (isAnArray) {
                    encodedKey = eachOriginalKey
                // encode, then record key
                } else {
                    encodedKey = module.exports.getEncodedKeyFor(eachOriginalKey, saveToFile)
                    output.keys.push(encodedKey)
                }
                output[encodedKey] = module.exports.encodeValue(dataValue[eachOriginalKey], saveToFile)
            }
        }
        return output
    },

    decodeValue(dataValue, saveToFile=true) {
        let output = dataValue
        if (dataValue instanceof Object) {
            // 
            // figure out if array or object
            // 
            let isArray = null
            let size = checkIf({value:dataValue.size , is: Number}) && dataValue.size
            if (size && !checkIf({value: dataValue.keys, is: Array})) {
                isArray = true
            // if theres a size but no keys, then its an array
            // (note != false is important, otherwise size==0 will fail)
            } else if (size !== false) {
                isArray = false
            } else {
                let keys = Object.keys(dataValue)
                if (keys.length == 0) {
                    return {}
                // if has a numeric index
                } else if (keys.find(each=>each.match(/^\d+$/))) {
                    size = Math.max(...keys.filter(each=>each.match(/^\d+$/)))  +  1
                    isArray = true
                // otherwise assume object
                }
            }
            
            // 
            // handle objects
            // 
            if (!isArray) {
                output = {}
                for (let eachEncodedKey in dataValue) {
                    // if encoded key then decode and include it
                    if (checkIf({ value: eachEncodedKey, is: String }) && eachEncodedKey.match(/^@/)) {
                        // convert the key to an encoded value
                        output[module.exports.getDecodedKeyFor(eachEncodedKey, saveToFile)] = module.exports.decodeValue(dataValue[eachEncodedKey], saveToFile)
                    }
                }
            // 
            // handle arrays
            // 
            } else {
                output = []
                start = -1
                while (++start < size) {
                    output[start] = dataValue[start]
                }
            }
        }
        return output
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
    },
    
    /**
     * convertSearchFilter
     *
     * @param {Array} filters - an array with all elements being something like { valueOf: ["id234", "name"], is: "bob" }
     * @return {Object} the equivlent MongoDb query
     *
     * @example
     * convertSearchFilter([
     *    {
     *        valueOf: ["id234", "name"],
     *        is: "bob"
     *    },
     *    {
     *        valueOf: ["id234", "frame_count"],
     *        isLessThan: 15
     *    },
     * ])
     *     
     */
    convertSearchFilter(filters) {
        let mongoFilter = {}
        // TODO:
        //     matches: $regex
        //     oneOf, $or
        //     size of
        //     keys of
        for (let each of filters) {
            if ("valueOf" in each) {
                // TODO make sure valueOf is an Array
                let mongoKeyList = module.exports.encodeKeyList(each.valueOf).join(".")
                // ensure the filter exists
                if (!(mongoFilter[mongoKeyList] instanceof Object)) {
                    mongoFilter[mongoKeyList] = {}
                }

                // operators
                if ("exists"                  in each) { mongoFilter[mongoKeyList] = { ...mongoFilter[mongoKeyList], "$exists": each.exists              }}
                if ("is"                      in each) { mongoFilter[mongoKeyList] = { ...mongoFilter[mongoKeyList], "$eq": each.is                      }}
                if ("isNot"                   in each) { mongoFilter[mongoKeyList] = { ...mongoFilter[mongoKeyList], "$ne": each.isNot                   }}
                if ("isOneOf"                 in each) { mongoFilter[mongoKeyList] = { ...mongoFilter[mongoKeyList], "$in": each.isOneOf                 }}
                if ("isNotOneOf"              in each) { mongoFilter[mongoKeyList] = { ...mongoFilter[mongoKeyList], "$nin": each.isNotOneOf             }}
                if ("isLessThan"              in each) { mongoFilter[mongoKeyList] = { ...mongoFilter[mongoKeyList], "$lt": each.isLessThan              }}
                if ("isLessThanOrEqualTo"     in each) { mongoFilter[mongoKeyList] = { ...mongoFilter[mongoKeyList], "$lte": each.isLessThanOrEqualTo    }}
                if ("isGreaterThan"           in each) { mongoFilter[mongoKeyList] = { ...mongoFilter[mongoKeyList], "$gt": each.isGreaterThan           }}
                if ("isGreaterThanOrEqualTo"  in each) { mongoFilter[mongoKeyList] = { ...mongoFilter[mongoKeyList], "$gte": each.isGreaterThanOrEqualTo }}
                if ("contains"                in each) { mongoFilter[mongoKeyList] = { ...mongoFilter[mongoKeyList], "$elemMatch": each.contains         }}
                if ("isNotEmpty"              in each) { mongoFilter[mongoKeyList] = { ...mongoFilter[mongoKeyList], "1": { "$exists": true }            }} // TODO: test me 
                if ("isEmpty"                 in each) { mongoFilter[mongoKeyList] = { ...mongoFilter[mongoKeyList], "1": { "$exists": false }           }} // TODO: test me 

                // FIXME: throw error if query empty
            }
        }
        return mongoFilter
    },

    collectionMethods: {
        async get({ keyList, from }) {
            if (keyList.length == 0) {
                console.error("\n\nget: keyList was empty\n\n")
                return null
            } else {
                let [idFilter, encodedKeyListString] = module.exports.processAndEncodeKeySelectorList(keyList)
                let output
                if (encodedKeyListString) {
                    output = await from.findOne(idFilter, {projection: {[encodedKeyListString]:1}})
                } else {
                    output = await from.findOne(idFilter)
                }
                let extractedValue = get({keyList:encodedKeyListString, from: output, failValue: null})
                let decodedOutput = module.exports.decodeValue(extractedValue)
                return decodedOutput
            }
        },
        async set({ keyList, from, to}) {
            if (keyList.length == 0) {
                console.error("\n\nset: keyList was empty\n\n")
                return null
            } else {
                let [idFilter, valueKey] = module.exports.processAndEncodeKeySelectorList(keyList)
                // if top-level value
                if (keyList.length == 1) {
                    return await from.updateOne(
                        idFilter,
                        {
                            $set: module.exports.encodeValue(to),
                        },
                        {
                            upsert: true, // create it if it doesnt exist
                        }
                    )
                } else {
                    return await from.updateOne(
                        idFilter,
                        {
                            $set: { [valueKey]: module.exports.encodeValue(to) },
                        },
                        {
                            upsert: true, // create it if it doesnt exist
                        }
                    )
                }
            }
        },
        async delete({keyList, from}) {
            if (keyList.length == 0) {
                console.error("\n\ndelete: keyList was empty\n\n")
                return null
            } else {
                // argument processing
                let [idFilter, valueKey] = module.exports.processAndEncodeKeySelectorList(keyList)
                // if deleting the whole element
                if (keyList.length == 1) {
                    return await from.deleteOne(idFilter)
                } else if (keyList.length > 1) {
                    return await from.updateOne(
                        idFilter,
                        {
                            $unset: { [valueKey]: "" },
                        }
                    )
                }
            }
        },
        async merge({ keyList, from, to}) {
            if (keyList.length == 0) {
                console.error("\n\nmerge: keyList was empty\n\n")
                return null
            } else {
                let existingData = await module.exports.collectionMethods.get({ keyList, from })
                // TODO: think about the consequences of overwriting array indices
                return await module.exports.collectionMethods.set({ keyList, from, to: merge(existingData, to) })
            }
        },
    }
}