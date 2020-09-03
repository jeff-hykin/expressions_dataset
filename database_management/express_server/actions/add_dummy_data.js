let mongoSetup = require("../main_code/mongo_setup")
let endpointTools = require("../main_code/endpoint_tools.js")

;;(async _=>{
    let result = await mongoSetup.connectToMongoDb()
    db = global.db = result.db

    videos = require("../main_code/interfaces/videos")
    moments = require("../main_code/interfaces/moments")


    // 
    // video 1
    // 
    let video
    videos.functions.set(video = {
        keyList: ["EsFheWkimsU"],
        value: {
            summary: {
                source: "youtube",
                title: "Rome, Italy - 4K Virtual Walking Tour around the City - Travel Guide",
                duration: 7202,
            },
            videoFormats: [],
            keySegments: [
                { type: "keySegment", start: 163000, end:   199000, observations: { "jeff.hykin": { fromHuman: true, label: "Happy (test)"}}, },
                { type: "keySegment", start: 240985, end:  3990000, observations: { "jeff.hykin": { fromHuman: true, label: "Happy (test)"}}, },
                { type: "keySegment", start: 263000, end:  2990000, observations: { "jeff.hykin": { fromHuman: true, label: "Happy (test)"}}, },
                { type: "keySegment", start: 363000, end:  4990000, observations: { "jeff.hykin": { fromHuman: true, label: "Happy (test)"}}, },

                { type: "keySegment", start: 163000, end:   199000, observations: { "jeff.hykin": { fromHuman: true, label: "Sad (test)"}}, },
                { type: "keySegment", start: 240985, end:   399000, observations: { "jeff.hykin": { fromHuman: true, label: "Sad (test)"}}, },
                { type: "keySegment", start: 263000, end:   299000, observations: { "jeff.hykin": { fromHuman: true, label: "Sad (test)"}}, },
                { type: "keySegment", start: 363000, end:   399000, observations: { "jeff.hykin": { fromHuman: true, label: "Sad (test)"}}, },
                
                { type: "keySegment", start: 163000, end:   199000, observations: { "jeff.hykin": { fromHuman: true, label: "Angry (test)"}}, },
                { type: "keySegment", start: 240985, end:   399000, observations: { "jeff.hykin": { fromHuman: true, label: "Angry (test)"}}, },
                { type: "keySegment", start: 263000, end:   299000, observations: { "jeff.hykin": { fromHuman: true, label: "Angry (test)"}}, },
                { type: "keySegment", start: 363000, end:   399000, observations: { "jeff.hykin": { fromHuman: true, label: "Angry (test)"}}, },
            ],
        },
    })
    
    // 
    // video 2
    // 
    videos.functions.set(video = {
        keyList: ["u28EnyGxPCg"],
        value: {
            summary: {
                source: "youtube",
                title: "⁴ᴷ⁶⁰ Walking NYC (Narrated) : Fifth Avenue from 60th Street to 23rd Street (Flatiron Building)",
                duration: 3156,
            },
            videoFormats: [],
            keySegments: [
                { type: "keySegment", start: 163000, end:   199000, observations: { "jeff.hykin": { fromHuman: true, label: "Happy (test)"}}, },
                { type: "keySegment", start: 240985, end:   399000, observations: { "jeff.hykin": { fromHuman: true, label: "Happy (test)"}}, },
                { type: "keySegment", start: 263000, end:   299000, observations: { "jeff.hykin": { fromHuman: true, label: "Happy (test)"}}, },
                { type: "keySegment", start: 363000, end:   399000, observations: { "jeff.hykin": { fromHuman: true, label: "Happy (test)"}}, },

                { type: "keySegment", start: 163000, end:   199000, observations: { "jeff.hykin": { fromHuman: true, label: "Sad (test)"}}, },
                { type: "keySegment", start: 240985, end:   399000, observations: { "jeff.hykin": { fromHuman: true, label: "Sad (test)"}}, },
                { type: "keySegment", start: 263000, end:   299000, observations: { "jeff.hykin": { fromHuman: true, label: "Sad (test)"}}, },
                { type: "keySegment", start: 363000, end:   399000, observations: { "jeff.hykin": { fromHuman: true, label: "Sad (test)"}}, },
                
                { type: "keySegment", start: 163000, end:   199000, observations: { "jeff.hykin": { fromHuman: true, label: "Angry (test)"}}, },
                { type: "keySegment", start: 240985, end:   399000, observations: { "jeff.hykin": { fromHuman: true, label: "Angry (test)"}}, },
                { type: "keySegment", start: 263000, end:   299000, observations: { "jeff.hykin": { fromHuman: true, label: "Angry (test)"}}, },
                { type: "keySegment", start: 363000, end:   399000, observations: { "jeff.hykin": { fromHuman: true, label: "Angry (test)"}}, },
            ],
        },
    })
    
    // 
    // video 3
    // 
    videos.functions.set(video = {
        keyList: ["iyz9pBv1bHc"],
        value: {
            summary: {
                source: "youtube",
                title: "TOP 10 Things to do in ROME",
                duration: 439.021,
            },
            videoFormats: [],
            keySegments: [
                { type: "keySegment", start: 163000, end:   199000, observations: { "jeff.hykin": { fromHuman: true, label: "Sad (test)"}}, },
                { type: "keySegment", start: 363000, end:   399000, observations: { "jeff.hykin": { fromHuman: true, label: "Sad (test)"}}, },
                
                { type: "keySegment", start: 163000, end:  199000, observations: { "jeff.hykin": { fromHuman: true, label: "Angry (test)"}}, },
                { type: "keySegment", start: 240985, end:  399000, observations: { "jeff.hykin": { fromHuman: true, label: "Angry (test)"}}, },
                { type: "keySegment", start: 263000, end:  299000, observations: { "jeff.hykin": { fromHuman: true, label: "Angry (test)"}}, },
                { type: "keySegment", start: 363000, end:  499000, observations: { "jeff.hykin": { fromHuman: true, label: "Angry (test)"}}, },
            ],
        },
    })
    
})()