let mongoSetup = require("../main_code/mongo_setup")
let endpointTools = require("../main_code/endpoint_tools.js")
let {checkIf} = require("good-js")



// 
// autoSegments arent going to work until the total number of frames can be confirmed for videos 
//
;const e = require("express");
const { collectionMethods } = require("../main_code/endpoint_tools.js");
;(async _=>{
    let videoIds = await endpointTools.collectionMethods.all({
        from: 'videos',
        forEach: {
            extractHidden: ["_id"]
        },
    })
    // for each video
    for (let eachVideoId of videoIds) {
        // get the frames
        let framesToAutoLabel = await endpointTools.collectionMethods.all({
            from: 'moments',
            where: [
                { valueOf: ["type"],    is: "fixedFrame", },
                { valueOf: ["videoId"], is: eachVideoId , },
                { sizeOf: ["observations", "faces-haarcascade-v1", "faces"], isGreaterThan: 0, },
            ],
            sortBy: [
                { keyList: ["frameIndex"] , order: "smallestFirst" },
            ]
        })

        // brute force try each emotion
        let interval = {start: null, end: null}
        let autoSegments = []
        let countdown = 0
        const minDistance = 32 // frames
        for (let eachEmotion of ["neutral", "happy", "sad", "surprise", "fear", "disgust", "anger", "contempt", "uncertain"]) {
            for (let eachFrame of framesToAutoLabel) {
                let index = eachFrame.frameIndex-0
                for (let eachFace of eachFrame.observations["faces-haarcascade-v1"].faces) {
                    if (eachFace.mostLikely == eachEmotion) {
                        if (interval.start == null) {
                            interval.start = index
                        } else {
                            let indexIsWithinBounds = index - interval.end < minDistance
                            // if out of bounds
                            if (!indexIsWithinBounds) {
                                // failed to find a segment
                                if (!checkIf({value: interval.end, is: Number})) {
                                    // reset the segment
                                    interval = {start: index, end: null}
                                // finished (closed-off a segment)
                                } else {
                                    autoSegments.push({...interval, label: eachEmotion})
                                }
                            // if in bounds
                            } else {
                                // then extend (or create) the end of the interval
                                interval.end = index
                            }
                        }
                    }
                }
            }

            // check edgecase of uncommited interval        
            if (checkIf({value: interval.start, is: Number}) && checkIf({value: interval.end, is: Number})) {
                autoSegments.push({...interval, label: eachEmotion})
            }
            // 
            // create the new autogenerated segments
            // 
            // TODO: get the length of the segments list for this video, for this formatIndex, then increment that for each moment being added
            let formatIndex = framesToAutoLabel[0].formatIndex
            let listIndex =   // FIXME
            for (let eachSegment of autoSegments) {
                let argument = {
                    keyList: [ `${eachVideoId}@${"fixedSegment"}${formatIndex}#${listIndex}`],
                    from: "moments",
                    to: {
                        "type": "fixedSegment",
                        "videoId": eachVideoId,
                        "listIndex": listIndex,
                        "formatIndex": formatIndex,
                        "startIndex": eachSegment.start,
                        "endIndex": eachSegment.end,
                        "observations": {
                            "faces-haarcascade-v1": {
                                "label": eachSegment.label,
                            }
                        },
                    },
                }
                // TODO: add 
                // endpointTools.collectionMethods.set(argument)
            }
        }
    }
})()



// TODO: remove video.duration