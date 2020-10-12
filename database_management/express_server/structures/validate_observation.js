const { recursivelyAllAttributesOf, get, merge, valueIs, logBlock, dynamicSort, checkIf, requireThat } = require("good-js")
/**
 * Function
 *
 * @param {Object} observation
 * @return {Boolean|String} true if valid, string-error if invalid
 *
 */
module.exports = (observation)=>{
    if (!(observation instanceof Object)) {return `observations need to be an object/dictionary. Instead a ${observation} was received`}
    if (observation.type == "segment") {
        if (!checkIf({value: each.videoId,     is: String})) { return `\`videoId\` should be the id (string) of for the video. Instead it was ${each.videoId}` }
        if (!checkIf({value: each.startTime,   is: Number})) { return `The \`startTime\` should be an float (seconds). Instead it was ${each.startTime}`       }
        if (!checkIf({value: each.endTime,     is: Number})) { return `The \`endTime\` should be an float (seconds). Instead it was ${each.endTime}`           }
        if (!checkIf({value: each.observer,    is: String})) { return `\`observer\` should be a unique id for what process/human created the data. Instead it was ${each.observer}` }
        if (!checkIf({value: each.observation, is: Object})) { return `\`observation\` should be an object/dictionary. Instead it was ${each.observation}` }
    }
    return true
}