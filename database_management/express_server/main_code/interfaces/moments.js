let path = require("path")
let { app } = require("../server")
const lib = require("good-js")
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
    hiddenKeys,
} = require("../endpoint_tools")
const {
    get,
    set,
    merge,
    valueIs,
    checkIf,
    requireThat,
    dynamicSort,
    recursivelyAllAttributesOf,
} = require("good-js")

const fileName = path.basename(__filename, '.js')
let collection
module.exports = {
    // called right after mongo connects
    setup: ({ db, client })=> {
        collection = db.collection(fileName)
        // connect each of the functions to the network
        for (let each in module.exports.functions) {
            // no return value (faster)
            if (["set", "delete", "merge"].includes(each)) {
                endpointNoReturnValue(fileName+'/'+each, (args)=>module.exports.functions[each](...args))
            // return value
            } else {
                endpointWithReturnValue(fileName+'/'+each, (args)=>module.exports.functions[each](...args))
            }
        }
    },
    getCollection() {
        return collection
    },
    functions: {
        get: async ({keyList}) => {
            if (keyList.length == 0) {
                throw Error("Get was called but keyList was empty, so I couldn't get any moment")
            } else if (keyList.length == 1) {
                
                let momentId = keyList[0]
                let moment = decodeValue(await collection.findOne({ _id: `${momentId}` }))
                console.debug(`moment is:`, moment)
                if (moment == null) {
                    return null
                }
                // generate the id field
                moment.id = momentId
                return moment
            } else {
                // FIXME: this is terrible for performance, this should use collectionMethods.get for non-moment keys
                let [id, ...otherKeys] = keyList
                let wholeItem = await module.exports.functions.get({ keyList: [ id ] })
                return get({ keyList: otherKeys, from: wholeItem })
            }
        },
        set: async ({keyList, value}) => {
            if (keyList.length == 0) {
                throw Error("Set was called but keyList was empty, so I couldn't set any moment")
            } else if (keyList.length == 1) {
                let [id, ...otherKeys] = keyList
                // 
                // remove
                // 
                delete value.id
                
                // TODO: consider adding checks here otherwise data could get messed up
                // like the listIndex of the id not matching the actual listIndex

                // 
                // save moment
                // 
                await collectionMethods.set({
                    from: collection,
                    keyList,
                    to: value,
                })
            } else {
                let [id, ...otherKeys] = keyList
                // FIXME: this method is terrible for performance
                let wholeItem = await module.exports.functions.get({ keyList: [ id ] })
                set({ keyList: otherKeys, to: value, on: wholeItme })
                // recursively call self
                await module.exports.functions.set({ keyList: [ id ], value: wholeItme })
                return
            }
            // FIXME
        },
        delete: async ({keyList, hiddenKeyList}) => {
            // FIXME
            console.error("moments.delete() not implmented yet")
        },
        merge: async ({keyList, hiddenKeyList, value}) => {
            console.error("moments.merge() not implmented yet")
        },
        // TODO: keys
        // TODO: search
        // TODO: sample
    }
}