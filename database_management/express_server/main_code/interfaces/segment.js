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
            let [idFilter, valueKey] = processAndEncodeKeySelectorList(keyList)
            console.log(`idFilter, valueKey is:`,idFilter, valueKey)
            if (keyList.length == 1) {
                let result = await collection.findOne(idFilter)
                result = decodeValue(result)
                console.log(`result is:`,result)
                return result
            }
            // FIXME
        },
        set: async ({keyList, value, hiddenValue}) => {
            let [idFilter, valueKey] = processAndEncodeKeySelectorList(keyList)
            if (keyList.length == 1) {
                let convertedValue = encodeValue(value)
                if (hiddenValue instanceof Object) {
                    merge(convertedValue, hiddenValue)
                }
                // FIXME: require segment_index, format_index, video_id to exist
                convertedValue._id = idFilter._id
                
                return await collection.updateOne(
                    idFilter,
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
        
        all: async (arg) => {
            return collectionMethods.all({...arg, from: "segment"})
        },
        // TODO: keys
        // TODO: sample
    }
}