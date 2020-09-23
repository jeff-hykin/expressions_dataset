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
                valueOf: ["observations", "faces-haarcascade-v1", "faces"],
                exists: true,
            },
        ],
    })
})()



// TODO: remove video.duration