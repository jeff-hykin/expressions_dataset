let path = require("path")
let { app } = require("../server")
const { 
    encodeValue,
    decodeValue,
    convertSearchFilter,
    encodeKeyList,
    doAsyncly,
    databaseActions,
    endpointWithReturnValue,
    endpointNoReturnValue,
    validateKeyList,
    validateValue,
    processAndEncodeKeySelectorList,
    convertFilter,
    resultsToObject,
    addScheduledDatabaseAction,
    collectionMethods,
} = require("../endpoint_tools")
const { recursivelyAllAttributesOf, get, set, merge, valueIs, checkIf, dynamicSort } = require("good-js")

let fileName = path.basename(__filename, '.js')
let collection
module.exports = {
    setup: ({ db, client })=> {
        collection = db.collection(fileName)
        // create an API for this file
        for (let each in module.exports.functions) {
            // no return value (faster)
            if (["set", "delete", "merge"].includes(each)) {
                endpointNoReturnValue(fileName+'/'+each, (args)=>module.exports.functions[each](...args))
            // return value
            } else {
                endpointWithReturnValue(fileName+'/'+each, (args)=>module.exports.functions[each](...args))
            }
        }
    },
    functions: {
        get: async ({keyList}) => {
            if (keyList.length == 0) {
                throw Error("Get was called but keyList was empty, so I couldn't get any video")
            // set the whole video
            } else if (keyList.length == 1) {
                let id = keyList[0]
                let video = await collection.findOne({ _id: `${id}` })
                // video doesn't exist
                if (video == null) {
                    return null
                }
                video = decodeValue(video)
                
                console.debug(`video is:`,video)

                // FIXME: get the frames
                
                // 
                // get the segments
                // 
                let segments = await collectionMethods.all({
                    from: 'segment',
                    where: [
                        {
                            valueOf: ["video_id"],
                            is: id,
                        },
                    ]
                })

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
                // attach all the segments
                for (let eachFormatIndex in video.video_formats) {
                    video.video_formats[eachFormatIndex].segments = segments.filter(each=>each.format_index==eachFormatIndex).sort(dynamicSort("segment_index"))
                }
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
                video.human_data.segments = segments.filter(each=>each.format_index===null).sort(dynamicSort("segment_index"))

                // remove the uneeded keys from segements
                for (let each of segments) {
                    delete each["video_id"]
                    delete each["segment_index"]
                    delete each["format_index"]
                }
                
                console.log(`getting the video ${JSON.stringify(video, null, 4)}`)
                return video
            } else {
                // FIXME: convert the keyList, figure out if generated or non-generated data
                if (keyList[1] == "frames" ) {
                    
                }
            }
            // FIXME
            // get the frames if needed, get the segments if needed
        },
        set: async ({keyList, value}) => {
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
                // FIXME: call delete on segements and frames if theyre not in the value
                // FIXME: add checking that the format contains valid data (height width etc) and that the video duration, and total_number_of_frames
                
                // 
                // add
                // 
                convertedValue._id = keyList[0]

                // set
                console.log(`setting the video ${JSON.stringify(keyList, null, 4)}`)
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
        delete: async ({keyList}) => {
            return collectionMethods.delete({ keyList, from: collection })
            // FIXME: needs special handling of some keys
        },
        merge: async ({keyList, value}) => {
            return collectionMethods.merge({ keyList, from: collection, to: value })
            // FIXME: needs special handling of some keys
        },
        // TODO: keys
        // TODO: search
        // TODO: sample
    }
}
