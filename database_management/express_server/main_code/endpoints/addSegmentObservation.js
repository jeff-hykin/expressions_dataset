const { recursivelyAllAttributesOf, get, merge, valueIs, logBlock, dynamicSort, checkIf, requireThat } = require("good-js")
const { v4: generateUuid } = require('uuid')
const { smartEndpoints, collectionMethods, } = require("../endpoint_tools")
const validateObservation = require("../../structures/validate_observation")

module.exports = async ([observationEntry]) => {
    console.debug(`observationEntry is:`,observationEntry)
    console.debug(`validateObservation is:`,validateObservation)
    // basic checks on the input
    let result = validateObservation(observationEntry)
    if (result !== true) {
        throw Error(result)
    }
    print('hodwy 1')
    let idForNewMoment = generateUuid()
    print('hodwy 2')
    
    // set the new moment
    await collectionMethods.set({
        keyList: [ idForNewMoment ],
        from: "observations",
        to: {
            ...observationEntry,
            type: "segment",
        },
    })
    print('hodwy 3')
    
    return idForNewMoment
}