let { connectToMongoDb } = require("./main_code/mongo_setup")
let { setupEndpoints } = require("./main_code/endpoints")
let { startServer } = require("./main_code/server")
Object.fromEntries || (Object.fromEntries = require('object.fromentries')) // polyfill for an old node version


async function asyncMain() {
    // first connect to the database
    const data = await connectToMongoDb()
    // then setup the endpoints that expose the database
    setupEndpoints(data)
    // then start the server
    await startServer()
}
asyncMain()