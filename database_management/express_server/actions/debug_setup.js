global.mongoSetup = require("../main_code/mongo_setup")
global.endpointTools = require("../main_code/endpoint_tools.js")

module.exports = (async _=>{
    let result = await mongoSetup.connectToMongoDb()
    global.db = result.db
    console.log(`finished setup`)
})()