global.mongoSetup = require("../main_code/mongo_setup")
global.endpointTools = require("../main_code/endpoint_tools.js")

// a helper for getting async values inside of a command line instance
Object.defineProperty(Object.prototype, "wait", {
    get() {
        let dataWrapper = {}
        this.then(result=>dataWrapper.result=result)
        return dataWrapper
    }
})

global.endpoints = require('require-all')({
    dirname:  __dirname + '/../main_code/endpoints',
    filter:  /.+\.js$/,
    recursive: true
})

module.exports = (async _=>{
    let result = await mongoSetup.connectToMongoDb()
    global.db = result.db
    global.collectionMethods = endpointTools.collectionMethods
    console.log(`finished setup`)
})()