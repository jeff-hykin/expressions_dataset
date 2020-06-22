let { connectToMongoDb } = require("./main_code/mongo_setup")
let { setupEndpoints } = require("./main_code/endpoints")
let { startServer } = require("./main_code/server")

async function asyncMain() {
    // first connect to the database
    const { db, collection } = await connectToMongoDb()
    // then setup the endpoints that expose the database
    setupEndpoints({db, collection})
    // then start the server
    await startServer()
}
asyncMain()