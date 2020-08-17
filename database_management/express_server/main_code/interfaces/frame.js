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
            console.log(`idFilter, valueKey is:`,idFilter, valueKey)
            if (keyList.length == 1) {
                let result = await collection.findOne(idFilter)
                result = decodeValue(result)
                console.log(`result is:`,result)
                return result
            }
            // FIXME
        },
        set: async ({keyList, value}) => {
            let [idFilter, valueKey] = processAndEncodeKeySelectorList(keyList)
            if (keyList.length == 1) {
                let convertedValue = encodeValue(value)
                return await collection.updateOne(
                    idFilter,
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
            // FIXME
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
