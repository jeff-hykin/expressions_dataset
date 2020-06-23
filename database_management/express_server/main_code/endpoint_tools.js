// import some basic tools for object manipulation
const { recursivelyAllAttributesOf, get, merge, valueIs } = require("good-js")
// import project-specific tools
let { app } = require("./server")

// list of functions that need to get executed in o
let functionSchedule = []
module.exports = {
    // this function might seem redundant given the async nature of Node.js 
    // the need for this arises because of a few things
    // 1. we want to respond to any of the POST/GET reqests that are not retrieving data
    //    waiting for set (vs get) operations would just be making the other end 
    //    wait for something it doesn't need to wait on
    // 2. #1 is easy, the real problem is that MongoDB throws an error whenever
    //    database action #2 gets started before database action #1 finished
    // so this function ensures database operations effectively happen 
    // in a synchronous order, while responding to requests asynchonously
    scheduleAction(aFunction) {
        let asyncAction = async ()=>{
            // schedule the action
            functionSchedule.push(aFunction)
            // do functions in FIFO order
            let firstFunctionIn = functionSchedule[0]
            await firstFunctionIn()
            // unschedule them once done
            functionSchedule = functionSchedule.filter(each=>each!=firstFunctionIn)
        }
        // start (but dont wait on) the async function
        asyncFuncion()
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
                    throw new Error(`\n\nThere's a key ${keyList} being set that contains\neither a \$ or a \.\nThose are not allowed in MongoDB`);
                }
            } else {
                throw new Error(`\n\nThere's a key in ${keyList} and the value of it isn't a number or a string\n(which isn't allowed for a key)`);
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
}