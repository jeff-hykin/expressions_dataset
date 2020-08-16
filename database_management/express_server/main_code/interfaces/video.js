let path = require("path")
let { app } = require("../server")
const { 
    encodeValue,
    decodeValue,
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
} = require("../endpoint_tools")
const { recursivelyAllAttributesOf, get, set, merge, valueIs } = require("good-js")

let fileName = path.basename(__filename, '.js')
let collection
module.exports = {
    setup: ({ db, client })=> {
        collection = db.collection(fileName)
        // create an API for this file
        for (let each in module.exports.functions) {
            // no return value (faster)
            if (["set", "delete", "merge"].includes(each)) {
                endpointNoReturnValue(fileName+'/'+each, module.exports.functions[each])
            // return value
            } else {
                endpointWithReturnValue(fileName+'/'+each, module.exports.functions[each])
            }
        }
    },
    functions: {
        get: async (keyList) => {
            if (keyList.length == 0) {
                throw Error("Get was called but keyList was empty, so I couldn't get any video")
            // set the whole video
            } else if (keyList.length == 1) {
                let id = keyList[0]
                let video = await collection.findOne({ _id: id })
                // video doesn't exist
                if (video == null) {
                    return null
                }
                // this will cause problems with decoding if we don't remove it
                delete video['_id']
                video = decodeValue(video)
                console.log(`Object.keys(video) is:`,Object.keys(video))
                console.log(`JSON.stringify(video) is:`,JSON.stringify(video))
                // FIXME: get the frames
                // FIXME: get the segments
                // FIXME: generate the human data
                
                // generate the summary data if necessary
                valueIs(Object, video.summary) || set(video, ["summary"], {})
                valueIs(String, video.summary.title)    || set(video, ["summary", "title"], null)
                valueIs(String, video.summary.source)   || set(video, ["summary", "source"], null)
                valueIs(Number, video.summary.duration) || set(video, ["summary", "duration"], null)
                valueIs(String, video.summary.url)      || set(video, ["summary", "url"], null)
                valueIs(String, video.summary.creator)  || set(video, ["summary", "creator"], null)
                // always overwite the id
                set(video, ["summary", "id"], id)
                // ensure video_formats
                valueIs(Array, video.video_formats) || set(video, ["video_formats"], [])
                // ensure large_metadata
                valueIs(Object, video.related_videos) || set(video, ["related_videos"], {})
                // ensure large_metadata
                valueIs(Object, video.large_metadata) || set(video, ["large_metadata"], {})
                // ensure incomplete processes
                valueIs(Object, video.processes && video.processes.incomplete) || set(video, ["processes", "incomplete"], {})
                // ensure complete processes
                valueIs(Object, video.processes && video.processes.completed) || set(video, ["processes", "completed"], {})
                // ensure complete processes
                valueIs(Object, video.human_data ) || set(video, ["human_data"], {})
                
                
                return video
            } else {
                // FIXME: convert the keyList, figure out if generated or non-generated data
                if (keyList[1] == "frames" ) {
                    
                }
            }
            // FIXME
            // get the frames if needed, get the segments if needed
        },
        set: async (keyList, value) => {
            // set the whole video
            if (keyList.length == 1) {
                // 
                // overwrite/correct
                // 
                // TODO: change summary.id
                
                let convertedValue = encodeValue(value)
                // 
                // extract
                // 
                // FIXME: pull out human_data, video_formats.frames, video_formats.segements
                
                // 
                // add
                // 
                convertedValue._id = keyList[0]

                // set
                console.log(`setting the video ${JSON.stringify(keyList)}`)
                await collection.updateOne({ _id: keyList[0] },
                    {
                        $set: convertedValue,
                    },
                    {
                        upsert: true, // create it if it doesnt exist
                    }
                )
            }
            // FIXME
        },
        delete: async (keyList) => {
            // FIXME
        },
        merge: async (keyList, value) => {
            // FIXME
        },
        // TODO: keys
        // TODO: search
        // TODO: sample
    }
}
