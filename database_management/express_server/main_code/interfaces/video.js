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
    hiddenKeys,
} = require("../endpoint_tools")
const lib = require("good-js")
const { recursivelyAllAttributesOf, get, set, merge, valueIs, checkIf, requireThat, dynamicSort } = require("good-js")

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

                // get the frames
                let frames = await collectionMethods.all({
                    from: 'frame',
                    where: [
                        {
                            valueOf: ["video_id"],
                            is: id,
                        },
                    ]
                })
                
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

                // generate the human data
                video.human_data = {
                    frames: frames.filter(
                            each=>(each.format_index==null)
                        ).sort(
                            dynamicSort("frame_index")
                        ),
                    segments: segments.filter(
                            each=>(each.format_index==null)
                        ).sort(
                            dynamicSort("segment_index")
                        )
                }
                
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
                // attach all the frames
                for (let eachFormatIndex in video.video_formats) {
                    video.video_formats[eachFormatIndex].frames = frames.filter(
                            each=>(each.format_index==eachFormatIndex)
                        ).sort(
                            dynamicSort("frame_index")
                        )
                }
                // attach all the segments
                for (let eachFormatIndex in video.video_formats) {
                    video.video_formats[eachFormatIndex].segments = segments.filter(
                            each=>(each.format_index==eachFormatIndex)
                        ).sort(
                            dynamicSort("segment_index")
                        )
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

                // remove the uneeded keys from segments
                for (let each of segments) {
                    delete each["video_id"]
                }
                
                console.log(`getting the video ${JSON.stringify(video, null, 4)}`)
                return video
            } else {
                // FIXME: this is terrible for performance, this should use collectionMethods.get for non-frame, non-segment keys
                let wholeVideo = await module.exports.functions.get({ keyList: [ keyList[0] ] })
                return get({ keyList, from: wholeVideo })
            }
        },
        set: async ({keyList, value}) => {
            // set the whole video
            if (keyList.length == 1) {
                const videoId = keyList[0]
                let videoData = value
                // 
                // remove
                // 
                delete videoData.id
                
                // 
                // 
                // extract
                // 
                // 
                let frames = []
                let segmentValues = []
                
                let setFrame = (frameIndex, formatIndex, frame) => {
                    console.error("Called setFrame() but setFrame() isn't implemented")
                }
                let setSegment = (segmentIndex, formatIndex, segment) => {
                    // 
                    // check requirements
                    // 
                    try {
                        requireThat({ value: segment,                 is: Object })
                        requireThat({ value: segment.start,           is: Number })
                        requireThat({ value: segment.end,             is: Number })
                        requireThat({ value: segment.label,           is: String })
                        requireThat({ value: segment.original_source, is: String })
                        // ensure formatIndex is null
                        if (segment.original_source_was_human === true) {
                            formatIndex = null
                        }
                        // swap start and end if needed
                        if (segment.start > segment.end) {
                            let start = segment.end
                            segment.end = segment.start
                            segment.start = start
                        }
                        // cut end sort if needed
                        let duration = get(videoData, ["summary", "duration"], null)
                        if (duration) {
                            let endingInSeconds = segment.end/1000
                            if (endingInSeconds > duration) {
                                segment.end = duration*1000
                            }
                        }
                    } catch (error) {
                        // TODO: decide if this should throw an error all the way to the frontend or not
                        console.error(error)
                        return
                    }
                    let originalSourceWasHuman = segment.original_source_was_human ? { original_source_was_human: true } : {}
                    segmentValues.push({
                        keyList: [ `${videoId}-seg${segmentIndex}`],
                        from: 'segment',
                        to: {
                            video_id: videoId,
                            segment_index: segmentIndex,
                            format_index: formatIndex,
                            start: segment.start,
                            end:   segment.end,
                            label: segment.label,
                            original_source: segment.original_source,
                            ...originalSourceWasHuman
                        },
                    })
                }
                
                // 
                // process video_formats
                // 
                for (const [eachFormatIndex, eachVideoFormat] of Object.entries(get(videoData, ["video_formats"], []))) {
                    // extract segments
                    if (eachVideoFormat.segments instanceof Array) {
                        for (const [eachSegmentIndex, eachSegment] of Object.entries(eachVideoFormat.segments)) {
                            setSegment(eachSegmentIndex, eachFormatIndex, eachSegment)
                        }
                        lib.delete({keyList: ["segments"], from: eachVideoFormat})
                    }
                    // TODO extract frames
                }
                
                // 
                // process human_data
                // 
                let humanData = videoData.human_data || {}
                // segments
                let humanSegments = humanData.segments || []
                humanSegments.forEach((each, eachIndex)=>setSegment(eachIndex, null, humanSegments[eachIndex]))
                lib.delete({keyList: ["human_data", "segments"], from: videoData})
                
                // TODO: frames
                
                // dont save empty value if its not needed (would happen often otherwise)
                if (Object.keys(humanData).length == 0) {
                    delete videoData.human_data
                }

                // FIXME: add checking that the format contains valid data (height width etc) and that the video duration, and total_number_of_frames
                
                // 
                // 
                // database actions
                //
                // 
                // these are at the bottom so that if an error is thrown, it won't result in corrupt data
                
                // 
                // segments
                // 
                // delete all the existing ones
                await collectionMethods.deleteAll({
                    from: 'segment',
                    where: [
                        {
                            valueOf: ["video_id"],
                            is: videoId,
                        },
                    ],
                    forEach: {
                        extractHidden: ["_id"],
                    }
                })
                // set all the new ones // TODO: collectionMethods.setAll
                for (let each of segmentValues) {
                    await collectionMethods.set(each)
                }
                // TODO: frames
                
                // 
                // video data
                // 
                await collectionMethods.set({
                    from: collection,
                    keyList,
                    to: videoData,
                })
            }
            // FIXME
        },
        delete: async ({keyList, hiddenKeyList}) => {
            // delete all the existing ones
            if (keyList.length == 1) {
                const videoId = keyList[0]
                // delete related segments
                await collectionMethods.deleteAll({
                    from: 'segment',
                    where: [
                        {
                            valueOf: ["video_id"],
                            is: videoId,
                        },
                    ],
                    forEach: {
                        extractHidden: ["_id"],
                    }
                })
                // delete related frames
                await collectionMethods.deleteAll({
                    from: 'frame',
                    where: [
                        {
                            valueOf: ["video_id"],
                            is: videoId,
                        },
                    ],
                    forEach: {
                        extractHidden: ["_id"],
                    }
                })
            }
            // FIXME: needs to handle special cases of frames and videos
            return collectionMethods.delete({ keyList, hiddenKeyList, from: collection })
        },
        merge: async ({keyList, hiddenKeyList, value}) => {
            // FIXME: needs special handling of some keys
            return collectionMethods.merge({ keyList, hiddenKeyList, from: collection, to: value })
        },
        // TODO: keys
        // TODO: search
        // TODO: sample
    }
}
