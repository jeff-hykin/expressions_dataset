global.mongoSetup = require("../main_code/mongo_setup")
global.endpointTools = require("../main_code/endpoint_tools.js")
;;(async _=>{
    let result = await mongoSetup.connectToMongoDb()
    global.db = result.db
    global.videos = require("../main_code/interfaces/videos")
    global.moments = require("../main_code/interfaces/moments")
    console.log(`finished setup`)
})()