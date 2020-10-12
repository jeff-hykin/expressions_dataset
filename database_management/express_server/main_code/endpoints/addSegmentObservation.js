const { recursivelyAllAttributesOf, get, merge, valueIs, logBlock, dynamicSort, checkIf, requireThat } = require("good-js")
const { v4: generateUuid } = require('uuid')
const { smartEndpoints, collectionMethods, } = require("../endpoint_tools")
const validateObservation = require("../../structures/validate_observation")

module.exports = async () => {
    // [observationEntry]
    // console.debug(`observationEntry is:`,observationEntry)
    // // basic checks on the input
    // // let result = validateObservation(observationEntry)
    // // if (result !== true) {
    // //     throw Error(result)
    // // }
    // // console.log('hodwy 1')
    // let idForNewMoment = generateUuid()
    // // console.log('hodwy 2')
    
    // // // set the new moment
    // // await collectionMethods.set({
    // //     keyList: [ idForNewMoment ],
    // //     from: "observations",
    // //     to: {
    // //         ...observationEntry,
    // //         type: "segment",
    // //     },
    // // })
    // // console.log('hodwy 3')
    
    // return idForNewMoment
}