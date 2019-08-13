const fs = require("fs")
const request = require("request")
const cheerio = require("cheerio")

let allUrls = new Set()
let allNodes = new Set()
let $
let body = null

let htmlSample = (node) => {
    string = $(node).html() 
    if (typeof string == 'string') {
        string = string.trim()
        string = string.replace(/\n/g, "\\n")
        return `${string.substr(0,60)}`
    }
    return ""
}
let depth = ""
let findUrls = (nodes, reset = true) => {
    if (reset) {
        allUrls = new Set()
        allNodes = new Set()
    }
    // $(nodes).each((i,each)=>{
    for (let each of nodes) {
        each = $(each)

        // if it hasn't been seen then evaluate it
        if (!allNodes.has(each)) {
            // check href
            
        }
    }
    // }) 

    return allUrls
}
// make the request to youtube
request("https://www.youtube.com", (error, response, html) => {
    if (!error && response.statusCode == 200) {
        $ = cheerio.load(html)
        let allNodes = $('*')
        // allow iterating on the children
        allNodes.constructor.prototype[Symbol.iterator] = function () {
            let index = -1
            let all = []
            while(this[++index] != undefined) {
                all.push(this[index])
            }
            return {
                next() {
                    return {
                        value: all.length && all.pop(),
                        done: !all.length
                    }
                }
            }
        }
        for (let each of allNodes) {
            each = $(each)
            if (each instanceof Object && each.attr instanceof Function) {
                let href = each.attr("href")
                if (typeof href == "string") {
                    if (href.startsWith("/watch?")) {
                        allUrls.add(href)
                    }
                }
            }
        }
        let existingUrls = require("./urls.json")
        for (let each of allUrls) {
            console.log(`each is:`,each)
            existingUrls[each] = true
        }
        fs.writeFileSync("./urls.json", JSON.stringify(existingUrls))
    }
})
