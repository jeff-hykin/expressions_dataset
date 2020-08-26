let mongoSetup = require("../main_code/mongo_setup")
let endpointTools = require("../main_code/endpoint_tools.js")

;;(async _=>{
    let result = await mongoSetup.connectToMongoDb()
    db = global.db = result.db

    videos = require("../main_code/interfaces/video")
    segment = require("../main_code/interfaces/segment")


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
            video_formats: [],
            human_data: {
                segments: [
                    { start: 163000, end:   199000, label: "Happy (test)", original_source: "jeff.hykin", original_source_was_human: true, },
                    { start: 240985, end:   399000, label: "Happy (test)", original_source: "jeff.hykin", original_source_was_human: true, },
                    { start: 263000, end:   299000, label: "Happy (test)", original_source: "jeff.hykin", original_source_was_human: true, },
                    { start: 363000, end:   399000, label: "Happy (test)", original_source: "jeff.hykin", original_source_was_human: true, },

                    { start: 163000, end:   199000, label: "Sad (test)", original_source: "jeff.hykin", original_source_was_human: true, },
                    { start: 240985, end:   399000, label: "Sad (test)", original_source: "jeff.hykin", original_source_was_human: true, },
                    { start: 263000, end:   299000, label: "Sad (test)", original_source: "jeff.hykin", original_source_was_human: true, },
                    { start: 363000, end:   399000, label: "Sad (test)", original_source: "jeff.hykin", original_source_was_human: true, },
                    
                    { start: 163000, end:   199000, label: "Angry (test)", original_source: "jeff.hykin", original_source_was_human: true, },
                    { start: 240985, end:   399000, label: "Angry (test)", original_source: "jeff.hykin", original_source_was_human: true, },
                    { start: 263000, end:   299000, label: "Angry (test)", original_source: "jeff.hykin", original_source_was_human: true, },
                    { start: 363000, end:   399000, label: "Angry (test)", original_source: "jeff.hykin", original_source_was_human: true, },
                ]
            }
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
            video_formats: [],
            human_data: {
                segments: [
                    { start: 163000, end:   199000, label: "Happy (test)", original_source: "jeff.hykin", original_source_was_human: true, },
                    { start: 240985, end:   399000, label: "Happy (test)", original_source: "jeff.hykin", original_source_was_human: true, },
                    { start: 263000, end:   299000, label: "Happy (test)", original_source: "jeff.hykin", original_source_was_human: true, },
                    { start: 363000, end:   399000, label: "Happy (test)", original_source: "jeff.hykin", original_source_was_human: true, },

                    { start: 163000, end:   199000, label: "Sad (test)", original_source: "jeff.hykin", original_source_was_human: true, },
                    { start: 240985, end:   399000, label: "Sad (test)", original_source: "jeff.hykin", original_source_was_human: true, },
                    { start: 263000, end:   299000, label: "Sad (test)", original_source: "jeff.hykin", original_source_was_human: true, },
                    { start: 363000, end:   399000, label: "Sad (test)", original_source: "jeff.hykin", original_source_was_human: true, },
                    
                    { start: 163000, end:   199000, label: "Angry (test)", original_source: "jeff.hykin", original_source_was_human: true, },
                    { start: 240985, end:   399000, label: "Angry (test)", original_source: "jeff.hykin", original_source_was_human: true, },
                    { start: 263000, end:   299000, label: "Angry (test)", original_source: "jeff.hykin", original_source_was_human: true, },
                    { start: 363000, end:   399000, label: "Angry (test)", original_source: "jeff.hykin", original_source_was_human: true, },
                ]
            }
        },
    })
    
})()