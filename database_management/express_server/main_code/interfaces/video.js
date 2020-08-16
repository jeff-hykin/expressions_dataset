let path = require("path")
let { app } = require("../server")
const { 
    convertKeys,
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
                endpointNoReturnValue(fileName+'/'+each, module.exports.functions[each])
            // return value
            } else {
                endpointWithReturnValue(fileName+'/'+each, module.exports.functions[each])
            }
        }
    },
    functions: {
        get: async (keyList) => {
            // set the whole video
            if (keyList.length == 1) {
                return await collection.findOne({ _id: keyList[0] })
            }
            // FIXME
        },
        set: async (keyList, value) => {
            // set the whole video
            if (keyList.length == 1) {
                // 
                // overwrite/correct
                // 
                // TODO: change summary.id
                
                let convertedValue = convertKeys(value)
                // 
                // extract
                // 
                // FIXME: pull out human_data, video_formats.frames, video_formats.segements
                
                // 
                // add
                // 
                convertedValue._id = keyList[0]

                // set
                console.log(`setting the video ${JSON.stringify(keyList)}`)
                await collection.updateOne({ _id: keyList[0] },
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
