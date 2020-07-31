// import some basic tools for object manipulation
const { recursivelyAllAttributesOf, get, merge, valueIs } = require("good-js")
// import project-specific tools
let { app } = require("./server")
const { response } = require("express")

const DATABASE_KEY = "4a75cfe3cdc1164b67aae6b413c9714280d2f102"

let databaseActions = []
let databaseActionsAreBeingExecuted = false

// this is basically middleware
// ... should probably make it official middleware but I'll do that later
let processRequest = (request) => {
    // some very very very very very basic form of security
    if (request.body.key == DATABASE_KEY) {
        return request.body.args
    } else {
        throw new Error(`\n\nThe database got your request and parsed the json. However, it looked for an AUTH key and didn't find one (or didn't find a correct one). If you should be authorized to access this, then post an issue on https://github.com/jeff-hykin/iilvd_interface\n\nPOSTed data:\n${request.body}`)
    }
}
module.exports = {
    databaseActions,
    //
    // this function helps ensure that all the actions involving the database
    // are performed in FIFO order AND that each action is 100% finished
    // before the next database action is started
    // (if they're not done like this, then MongoDB gets mad and throws an error)
    //
    addScheduledDatabaseAction(action) {
        // put it on the scheudler
        databaseActions.push(action)

        // if there's already an instance of the executor running
        // then dont start a new one
        if (!databaseActionsAreBeingExecuted) {
            let theActionExecutor = async _=>{
                // if starting
                databaseActionsAreBeingExecuted = true
                // keep looping rather than iterating
                // because more items are going to be added while
                // eariler ones are being executed
                while (true) {
                    let nextAction = databaseActions.shift()
                    if (nextAction === undefined) {
                        break
                    } else {
                        await nextAction()
                    }
                }
                // once all tasks are completed, turn the system off
                databaseActionsAreBeingExecuted = false
            }
            // start the theActionExecutor (but don't wait for it to finish)
            theActionExecutor()
        }
    },

    endpointWithReturnValue(name, theFunction) {
        app.post(
            `/${name}`,
            // this wraps all the api calls
            // to basically 1. parse the arugments for them
            // and 2. ensure that the server always sends a response
            (req, res) => {
                // whats going on here with aysnc is complicated
                // basically we need to listen for when theFunction finishes (so we can send a response)
                // BUT we can't start theFunction here because it has database actions, which need to
                // happen FIFO order (first one needs to finish before calling a second one).
                // Code somewhere else (addScheduledDatabaseAction) ensures functions given to it are executed in-order
                // so we create a wrapper for theFunction and give the wrapped function addScheduledDatabaseAction
                // that way, inside the wrapper, we know when theFunction finished even though we don't know when it starts
                module.exports.addScheduledDatabaseAction(async () => {
                    let args
                    try {
                        args = processRequest(req)
                        let output = theFunction(args)
                        if (output instanceof Promise) {
                            output = await output
                        }
                        // send the value back to the requester
                        res.send({ value: output })
                    } catch (error) {
                        // tell the requester there was an error
                        res.send({ error: `${error.message}:\n${JSON.stringify(error)}\n\nfrom: ${name}\nargs:${args}` })
                    }
                })

            }
        )
    },

    endpointNoReturnValue(name, theFunction) {
        app.post(
            `/${name}`,
            // this wraps all the api calls
            // to basically 1. parse the arugments for them
            // and 2. ensure that the server always sends a response
            (req, res) => {
                let args
                try {
                    args = processRequest(req)
                    // just tell the requester the action was scheduled
                    res.send({ actionScheduled: true })
                    // then put it on the scheduler
                    module.exports.addScheduledDatabaseAction(_=>theFunction(args))
                } catch (error) {
                    // tell the requester there was an error if the args couldn't be parsed
                    res.send({ error: `${error.message}:\n${JSON.stringify(error)}\n\nfrom: ${name}\nargs:${args}` })
                }
            }
        )
    },
    createEndpoint(name, theFunction){
        app.post(
            `/${name}`,
            // this wraps all the api calls
            // to basically 1. parse the arugments for them
            // and 2. ensure that the server always sends a response
            async (req, res) => {
                try {
                    let args = req.body
                    let output = theFunction(args)
                    if (output instanceof Promise) {
                        output = await output
                    }
                    res.send({ value: output })
                } catch (error) {
                    res.send({ error: `${error.message}:\n${JSON.stringify(error)}` })
                }
            }
        )
    },

    validateKeyList(keyList) {
        for (let eachIndex in keyList) {
            let eachKey = keyList[eachIndex]
            // convert numbers to strings
            if (valueIs(Number, eachKey)) {
                // mutate the list to convert numbers to strings
                keyList[eachIndex] = `${eachKey}`
            } else if (valueIs(String, eachKey)) {
                if (eachKey.match(/\$|\./)) {
                    throw new Error(`\n\nThere's a key ${keyList} being set that contains\neither a \$ or a \.\nThose are not allowed in MongoDB`)
                }
            } else {
                throw new Error(`\n\nThere's a key in ${keyList} and the value of it isn't a number or a string\n(which isn't allowed for a key)`)
            }
        }
        return keyList.join(".")
    },

    validateValue(valueObject) {
        if (valueObject instanceof Object) {
            for (let eachKeyList of recursivelyAllAttributesOf(valueObject)) {
                module.exports.validateKeyList(eachKeyList)
            }
        }
        return true
    },

    processKeySelectorList(keySelectorList) {
        module.exports.validateKeyList(keySelectorList)
        let id = { _id: keySelectorList.shift() }
        keySelectorList.unshift("_v")
        let valueKey = keySelectorList.join(".")
        return [id, valueKey]
    },

    convertFilter(object) {
        if (!(object instanceof Object)) {
            return {}
        }

        // create a deep copy
        let filter = JSON.parse(JSON.stringify(object))

        // put "_v." in front of all keys being accessed by find
        for(let eachKey in filter) {
            if (typeof eachKey == 'string' && eachKey.length != 0) {
                // special keys start with $ and _
                if (eachKey[0] == '$' || eachKey[0] == '_') {
                    // dont delete it (do nothing)
                } else {
                    // create a new (corrected) key with the same value
                    filter['_v.'+eachKey] = filter[eachKey]
                    // remove the old key
                    delete filter[eachKey]
                }
            } else {
                // delete any random attributes tossed in here (Symbols)
                delete filter[eachKey]
            }
        }

        // TODO: should probably add a error for keys with underscores that are not _v or _id

        return filter
    },

    resultsToObject(results) {
        let actualResults = {}
        for (const each of results) {
            if (each._v) {
                let keyCount  = Object.keys(each._v).length
            }
            actualResults[each._id] = each._v
        }
        return actualResults
    }
}
