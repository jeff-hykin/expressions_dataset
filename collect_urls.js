const fs = require("fs")
const request = require("request")
const cheerio = require("cheerio")

let allUrls = new Set()
let allNodes = new Set()
let $
let findUrls = (nodes, reset = true) => {
    if (reset) {
        allUrls = new Set()
        allNodes = new Set()
    }
    nodes.each((i, each) => {
        each = $(each)
        // get href
        if (each instanceof Object && each.attr instanceof Function) {
            let href = each.attr("href")
            if (typeof href == "string") {
                if (href.startsWith("/watch?")) {
                    allUrls.add(href)
                }
            }
        }
        // if not seen before, and hash children
        if (!allNodes.has(each) && each.each instanceof Function) {
            // recurse
            findUrls(each, false)
        }
        // add node to allNodes to prevent infinite looping
        allNodes.add(each)
    })
    return allUrls
}
// make the request to youtube
request("https://www.youtube.com", (error, response, html) => {
    if (!error && response.statusCode == 200) {
        $ = cheerio.load(html)

        let body = $("body")
        let urls = findUrls(body)
    }
})
