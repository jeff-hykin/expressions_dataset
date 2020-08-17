let path = require("path")
let { app } = require("../server")
const { 
    encodeValue,
    decodeValue,
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
} = require("../endpoint_tools")
const { recursivelyAllAttributesOf, get, set, merge, valueIs } = require("good-js")

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
            if (keyList.length == 1) {
                return await collection.findOne(idFilter)
            }
            // FIXME
        },
        set: async ({keyList, value}) => {
            // set the whole video
            if (keyList.length == 1) {
                //
                // overwrite/correct
                //
                
                // FIXME: require segment_index, format_index, video_id to exist
                let convertedValue = encodeValue(value)

                let id = keyList[0]
                await collection.updateOne({ _id: id },
                    {
                        $set: {
                            ...convertedValue,
                            _id: id,
                        },
                    },
                    {
                        upsert: true, // create it if it doesnt exist
                    }
                )
            }
        },
        delete: async ({keyList}) => {
            // TODO: add error handling for no keys
            // argument processing
            let [idFilter, valueKey] = processAndEncodeKeySelectorList(keyList)
            // if deleting the whole element
            if (keyList.length == 1) {
                return await collection.deleteOne(idFilter)
            } else if (keyList.length > 1) {
                return await collection.updateOne(idFilter,
                    {
                        $unset: { [valueKey]: "" },
                    }
                )
            }
            // FIXME
        },
        merge: async ({keyList, value}) => {
            let oldValue = module.exports.functions.get({keyList})
            module.exports.functions.set({keyList, value: merge(oldValue, value)})
            // FIXME
        },
        // TODO: keys
        // TODO: search
        // TODO: sample
    }
}
