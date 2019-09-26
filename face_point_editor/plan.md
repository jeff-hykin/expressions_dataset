script for:
    get a JSON object of all of the points and corrisponding images
    get a folder of images
    add the index to JSON for each image
    add every image to the html with its index as a seperate attribute and its height/width as attributes
javascript for
    import the json of the points
    for the first image tag
        get the index and look it up in the JSON, then add points for each of the locations
    let the user drag the points, and update the JSON accordingly
    once user presses next
        move the image to a "done" stack
        pull the next image into view
        erase all the old DOM points
        create new DOM points
    once user presses save
        generate a copy-and-pasteable JSON object of the points for each image
        
