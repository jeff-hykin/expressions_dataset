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
            console.log(`idFilter is:`,idFilter)
            console.log(`keyList is:`,keyList)
            if (keyList.length == 1) {
                let convertedValue = encodeValue(value)
                console.log(`convertedValue is:`,convertedValue)
                // FIXME: require segment_index, format_index, video_id to exist
                convertedValue._id = idFilter._id
                console.log(`convertedValue is:`,convertedValue, null, 4)
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
        
        /**
         * Segment Search
         *
         * @param {Object[]} args.where - A list of requirements
         * @param {string[]} args.forEach.extract - A list of keys leading to a specific value
         * @param {string[][]} args.forEach.onlyKeep - A list of lists of keys leading to a specific value
         * @param {string[][]} args.forEach.exclude - A list of lists of keys leading to a specific value
         *
         * @return {Object[]} Array of segments or values from within segments
         *
         * @example
         *     all()
         *     all({where: []})
         */
        all: async ({where, forEach}={}) => {
            // TODO: add sort
            // FIXME: convert all arrays to lists

            // 
            // process args
            // 
            where = where||[]
            let { extract, onlyKeep, exclude } = forEach || {}
            
            // 
            // convert arguments to mongo form
            // 
            let mongoSearchFilter = convertSearchFilter(where)
            
            // 
            // build the projection
            // 
            
            // encode 'onlyKeep'
            let mongoProjection = {}
            if (onlyKeep instanceof Array) {
                for (let each of onlyKeep.map(each=>encodeKeyList(each))) {
                    // mongo uses 1 to indicate keeping
                    mongoProjection[ onlyKeep.join(".") ] = 1
                }
            }
            
            


            // 
            let returnMapper = (each)=> {
                each
            }

            // encode 'extract'
            extract = encodeKeyList(extract)
            
            
            // encode 'exclude'
            if (exclude  instanceof Array) { exclude  = exclude.map(each=>encodeKeyList(each)) }
            
            
            collection.find(
                mongoSearchFilter,
                {projection: returnValueFilter}
            ).toArray((err, results)=>{
                // handle errors
                if (err) {return reject(err) }
                resolve(results.map(each=>each._id))
            })

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
        // TODO: keys
        // TODO: sample
    }
}