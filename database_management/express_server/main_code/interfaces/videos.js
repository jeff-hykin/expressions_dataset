let path = require("path")
let { app } = require("../server")
const lib = require("good-js")
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
const {
    get,
    set,
    merge,
    valueIs,
    checkIf,
    requireThat,
    dynamicSort,
    recursivelyAllAttributesOf,
} = require("good-js")

const moments = require("./moments")

const fileName = path.basename(__filename, '.js')
let collection
module.exports = {
    // called right after mongo connects
    setup: ({ db, client })=> {
        collection = db.collection(fileName)
        // connect each of the functions to the network
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
    getCollection() {
        return collection
    },
    functions: {
        get: async ({keyList}) => {
            if (keyList.length == 0) {
                throw Error("Get was called but keyList was empty, so I couldn't get any video")
            // set the whole video
            } else if (keyList.length == 1) {
                
                // get the direct data for the video
                let videoId = keyList[0]
                let video = decodeValue(await collection.findOne({ _id: `${videoId}` }))
                console.debug(`video is:`,video)
                // video doesn't exist
                if (video == null) {
                    return null
                }
                
                // generate the summary data if necessary
                valueIs(Object, video.summary) || set(video, ["summary"], {})
                valueIs(String, video.summary.title)    || set(video, ["summary", "title"], null)
                valueIs(String, video.summary.source)   || set(video, ["summary", "source"], null)
                valueIs(Number, video.summary.duration) || set(video, ["summary", "duration"], null)
                valueIs(String, video.summary.url)      || set(video, ["summary", "url"], null)
                valueIs(String, video.summary.creator)  || set(video, ["summary", "creator"], null)
                // always overwite the id
                set(video, ["summary", "id"], videoId)
                // ensure videoFormats
                valueIs(Array, video.videoFormats) || set(video, ["videoFormats"], [])
                // ensure relatedVideos
                valueIs(Object, video.relatedVideos) || set(video, ["relatedVideos"], {})
                // ensure largeMetadata
                valueIs(Object, video.largeMetadata) || set(video, ["largeMetadata"], {})
                // ensure incomplete processes
                valueIs(Object, video.processes && video.processes.incomplete) || set(video, ["processes", "incomplete"], {})
                // ensure complete processes
                valueIs(Object, video.processes && video.processes.completed) || set(video, ["processes", "completed"], {})
                
                // 
                // handle moments
                // 
                let videoMoments = await collectionMethods.all({
                    from: moments.getCollection(),
                    where: [
                        { valueOf: ["videoId"], is: videoId, },
                    ],
                    sortBy: [
                        { keyList: ["listIndex"], order: "smallestFirst" }
                    ],
                })
                
                video.keySegments   = videoMoments.filter(each=>each.type=="keySegment"  )
                video.keyFrames     = videoMoments.filter(each=>each.type=="keyFrame"    )
                const fixedSegments = videoMoments.filter(each=>each.type=="fixedSegment")
                const fixedFrames   = videoMoments.filter(each=>each.type=="fixedFrame"  )
                // place fixed moments indices in the respective formats
                for (let eachFormatIndex in video.videoFormats) {
                    let format = video.videoFormats[eachFormatIndex]
                    // because they're sorted by listIndex, (and filters preseve order)
                    // these are already in the correct order
                    format.segments = fixedSegments.filter(each=>each.formatIndex==eachFormatIndex)
                    format.frames   = fixedFrames.filter(each=>each.formatIndex==eachFormatIndex)
                }
                
                console.log(`getting the video ${JSON.stringify(video, null, 4)}`)
                return video
            } else {
                let [id, ...otherKeys] = keyList
                // FIXME: this is terrible for performance, this should use collectionMethods.get for non-moment keys
                let wholeVideo = await module.exports.functions.get({ keyList: [ id ] })
                return get({ keyList: otherKeys, from: wholeVideo })
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
                // extract moments
                // 
                
                videoData.keySegments = (videoData.keySegments || []).map((each, listIndex)=>({...each, listIndex, videoId, }))
                videoData.keyFrames   = (videoData.keyFrames || []).map((each, listIndex)=>({...each, listIndex, videoId, }))
                let videoMoments = [ ...videoData.keySegments, ...videoData.keyFrames ]
                delete videoData.keySegments
                delete videoData.keyFrames
                if (videoData.videoFormats instanceof Array) {
                    // place fixed moments indices in the respective formats
                    for (const [eachFormatIndex, eachVideoFormat] of Object.entries(videoData.videoFormats)) {
                        // segments
                        for (const [listIndex, eachFixedSegment] of Object.entries(get(eachVideoFormat, ["segments"], []))) {
                            // add each segment, override type and listIndex to force correctness
                            videoMoments.push({...eachFixedSegment, type: "fixedSegment", listIndex, videoId, })
                        }
                        delete eachVideoFormat.segments

                        // frames
                        for (const [listIndex, eachFixedFrame] of Object.entries(get(eachVideoFormat, ["frames"], []))) {
                            // FIXME: add a check for frameIndex
                            // add each frame, override type and listIndex to force correctness
                            videoMoments.push({...eachFixedFrame, type: "fixedFrame", listIndex, videoId,  })
                        }
                        delete eachVideoFormat.frames
                    }
                }

                // 
                // save video
                // 
                await collectionMethods.set({
                    from: collection,
                    keyList,
                    to: videoData,
                })
                // 
                // save moments
                // 
                // delete all the existing ones
                let momentsCollection = moments.getCollection()
                await collectionMethods.deleteAll({
                    from: momentsCollection,
                    where: [
                        {
                            valueOf: ["videoId"],
                            is: videoId,
                        },
                    ]
                })
                // set all the new ones // TODO: collectionMethods.setAll
                for (let eachMoment of videoMoments) {
                    let format = eachMoment.formatIndex!=null ? `@${eachMoment.formatIndex}` : ""
                    let args = {
                        keyList: [ `${videoId}@${eachMoment.type}${format}#${eachMoment.listIndex}`],
                        from: "moments",
                        to: eachMoment,
                    }
                    await collectionMethods.set(args)
                }
            } else {
                let [id, ...otherKeys] = keyList
                // FIXME: this method is terrible for performance
                let wholeVideo = await module.exports.functions.get({ keyList: [ id ] })
                set({ keyList: otherKeys, to: value, on: wholeVideo })
                // recursively call self
                await module.exports.functions.set({ keyList: [ id ], value: wholeVideo })
                return
            }
            // FIXME
        },
        delete: async ({keyList, hiddenKeyList}) => {
            // FIXME
            console.error("videos.delete() not implmented yet")
        },
        merge: async ({keyList, hiddenKeyList, value}) => {
            console.error("videos.merge() not implmented yet")
        },
        largestIndexIn: async ({keyList}) => {
            let [videoId, ...keys] = keyList
            console.debug(`videoId is:`,videoId)
            if (keys[0] == "keySegments") {
                let result = await collectionMethods.all(
                    {
                        from:"moments",
                        maxNumberOfResults: 1,
                        where: [
                            { valueOf: ["type"],    is: "keySegment" },
                            { valueOf: ["videoId"], is: videoId      },
                        ],
                        sortBy: [
                            { keyList: ["listIndex"], order: "largestFirst" }
                        ],
                        forEach: {
                            extract: [ "listIndex"],
                        },
                    },
                )
                if (result[0] == undefined) {
                    return -1
                } else {
                    return 0
                }
            } else {
                throw Error(`sorry not yet implemented for ${keys}`)
            }
        }
        // TODO: keys
        // TODO: search
        // TODO: sample
    }
}
