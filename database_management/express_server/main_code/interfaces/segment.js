let path = require("path")
let { app } = require("../server")
const { 
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

let fileName = path.basename(__filename, '.js')
let collection
module.exports = {
    setup: ({ db, client })=> {
        collection = db.collection(fileName)
        // create an API for this file
        for (let each in module.exports.functions) {
            // no return value (faster)
            if (["set", "delete", "merge"].includes(each)) {
                endpointNoReturnValue(fileName+'/'each, module.exports.functions[each])
            // return value
            } else {
                endpointWithReturnValue(fileName+'/'each, module.exports.functions[each])
            }
        }
    },
    functions: {
        get: async (keyList) => {
            // FIXME
        },
        set: async (keyList, value) => {
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
