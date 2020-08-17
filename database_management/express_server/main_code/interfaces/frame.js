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
const { recursivelyAllAttributesOf, get, set, merge, valueIs, checkIf } = require("good-js")

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
        get: async ({keyList}) => {
            return collectionMethods.get({ keyList, from: collection })
            // FIXME: needs special handling of some keys
        },
        set: async ({keyList, value}) => {
            return collectionMethods.set({ keyList, from: collection, to: value })
            // FIXME: needs special handling of some keys
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
