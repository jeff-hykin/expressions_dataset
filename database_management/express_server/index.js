let { connectToMongoDb } = require("./code/mongo_setup")
let { setupEndpoints } = require("./code/endpoints")
let { startServer } = require("./code/server")

async function asyncMain() {
    // first connect to the database
    const { db, collection } = await connectToMongoDb()
    // then setup the endpoints that expose the database
    setupEndpoints({db, collection})
    // then start the server
    await startServer()
}
asyncMain()