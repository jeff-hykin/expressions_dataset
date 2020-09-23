let mongoSetup = require("../main_code/mongo_setup")
let endpointTools = require("../main_code/endpoint_tools.js")

;;(async _=>{
    let moments = await endpointTools.collectionMethods.all({
        from: 'moments',
        where: [
            {
                valueOf: ["type"],
                is: "fixedFrame",
            },
            {
                sizeOf: ["observations", "faces-haarcascade-v1", "faces"],
                isGreaterThan: 0,
            },
        ],
    })
})()



// TODO: remove video.duration