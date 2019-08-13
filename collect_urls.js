const fs = require("fs")
const request = require("request")
const cheerio = require("cheerio")

let exportLocation = process.argv[2]
let allUrls = new Set()
let allNodes = new Set()
let body = null
let $

let htmlSample = (node) => {
    string = $(node).html() 
    if (typeof string == 'string') {
        string = string.trim()
        string = string.replace(/\n/g, "\\n")
        return `${string.substr(0,60)}`
    }
    return ""
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
        let existingUrls = require(exportLocation)
        for (let each of allUrls) {
            // remove the repeated part of the string
            each = each.replace(/^\/watch\?v=/, "")
            existingUrls[each] = 1
        }
        fs.writeFileSync(exportLocation, JSON.stringify(existingUrls))
    }
})
