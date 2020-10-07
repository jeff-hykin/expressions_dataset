const { recursivelyAllAttributesOf, get, merge, valueIs, logBlock, dynamicSort, checkIf, requireThat } = require("good-js")
const { v4: generateUuid } = require('uuid')
const { smartEndpoints, collectionMethods, } = require("./endpoint_tools")

module.exports = async ([observationEntry]) => {
    console.debug(`observationEntry is:`,observationEntry)
    // basic checks on the input
    requireThat({value: observationEntry.videoId,     is: String, failMessage: `\`videoId\` should be the id (string) of for the video. Instead it was ${observationEntry.videoId}`})
    requireThat({value: observationEntry.startTime,   is: Number, failMessage: `The \`startTime\` should be an float (seconds). Instead it was ${observationEntry.startTime}`      })
    requireThat({value: observationEntry.endTime,     is: Number, failMessage: `The \`endTime\` should be an float (seconds). Instead it was ${observationEntry.endTime}`          })
    requireThat({value: observationEntry.observer,    is: String, failMessage: `\`observer\` should be a unique id for what process/human created the data. Instead it was ${observationEntry.observer}`})
    requireThat({value: observationEntry.observation, is: Object, failMessage: `\`observation\` should be an object/dictionary. Instead it was ${observationEntry.observation}`})
    
    let idForNewMoment = generateUuid()
    console.debug(`idForNewMoment is:`,idForNewMoment)

    // set the new moment
    await collectionMethods.set({
        keyList: [ idForNewMoment ],
        from: "observations",
        to: {
            ...observationEntry,
            type: "segment",
        },
    })
    return idForNewMoment
}