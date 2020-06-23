// import some basic tools for object manipulation
const { recursivelyAllAttributesOf, get, merge, valueIs } = require("good-js")
// import project-specific tools
let { app } = require("./server")

module.exports = {
    doAsyncly(aFunction) {
        let asyncFuncion = async ()=>aFunction()
        // start the async function
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
                    let output = await theFunction(args)
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

