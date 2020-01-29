# how this file works
    # pick random a video
    # make sure its long enough/short enough
    # collect random frames from it
    # run the facial expression dector on the frames
    # if 70% have faces that are 1/3 of the height of the video, then keep the video

require_relative './helpers.rb'
Console.verbose = true
# import PARAMETERS as variables
storage_cap               = eval"#{PARAMETERS["facedata_collector"]["storage_cap"               ]}"
number_of_sample_frames   = eval"#{PARAMETERS["facedata_collector"]["number_of_sample_frames"   ]}"
number_of_frames_needed   = eval"#{PARAMETERS["facedata_collector"]["number_of_frames_needed"   ]}"
required_face_size        = eval"#{PARAMETERS["facedata_collector"]["required_face_size"        ]}"
similarity_rejection_rate = eval"#{PARAMETERS["facedata_collector"]["similarity_rejection_rate" ]}"


# this file adds the following fields to the database.json
facedata_version = 1.1
# {
#     unavailable:
#     good_faces:
#     is_picture:
#     facedata_version: # the most-recent version of facedata that has been added to this video (since things may be added to this file/process in the future)
#     max_repeated_face: 
#     faces: []
# }

# continually try different videos until one is long enough
downloaded_videos = 0
new_facedata = {}
video_path = nil 
random_video = nil
loop do
    # 
    # perform cleanup of previous video
    # 
    if not new_facedata["good_faces"]
        # remove the folder created for it
        FS.delete(video_path) if video_path
    end
    
    if new_facedata.keys.size != 0
        random_video.metadata.merge!(new_facedata)
        random_video.save_metadata()
    end
    
    # 
    # report progress
    # 
    number_of_filtered_videos = FS.list_folders($paths["filtered_videos"]).size()
    log "Number of filtered videos: #{"#{number_of_filtered_videos}".yellow}".light_black 
    # break looping
    if number_of_filtered_videos >= storage_cap
        puts ""
        puts "============================================================".yellow
        puts "   Storage Cap of #{storage_cap} videos has been reached".yellow
        puts "============================================================".yellow
        break
    end

    # 
    # pick a video
    # 
    random_video = Video.random()
    log "Evaluating Video: #{"#{random_video.id.to_s}".blue}".light_black
    duration = random_video.duration

    # 
    # create an assembly line that only (in theory) modifies new_facedata
    # 
    new_facedata = {}
    
    # 
    # create a directory for that video and switch to it
    # 
    video_path = $paths["filtered_videos"]/random_video.id
    FS.touch_dir(video_path)
    FS.in_dir(video_path) do
    
    # 
    # filter by metadata
    # 
        # if seen before
        if random_video.metadata["facedata_version"] != nil
            log "    video already labelled, moving along".light_black.underline
            next
        end
        
        # unavailable
        if random_video.metadata["unavailable"]
            log "    video is unavailable, moving along".light_black.underline
            next
        end
        
        # duration
        if !duration.is_a?(Numeric) || duration < 100.seconds
            log "    video duration insufficient, moving along".light_black.underline
            next
        end

    
    # 
    # add a has-been-checked flag
    # 
    new_facedata["facedata_version"] = facedata_version
    
    # 
    # download video and frames
    # 
    begin
        log "    begining to get frames".light_black
        new_facedata["frames"] = {}

        # download the video
        begin
            random_video.download() # downloads to current dir folder with id as the name 
        rescue CommandResult::Error => exception
            # if the video is unavailable, remember that
            if exception.command_result.read =~ /ERROR: This video is unavailable./
                log "    video #{random_video.id} unavailable".yellow
                new_facedata["unavailable"] = true
            end
        end
        
        # 
        # download the frames as images
        # 
        # pick some evenly-spread-out times based on the duration
        frame_sample_indexes = (1..number_of_sample_frames).to_a.map{ |each| ((duration / 11.0) * each ).to_i }
        # keep track of where these are going to be saved
        for each in frame_sample_indexes
            screenshot_path = "#{random_video.id}_#{each}.png"
            new_facedata["frames"][each] = screenshot_path
            # download each screenshot
            random_video.get_frame(at_second: each, save_to: screenshot_path)
        end
    rescue => exception
        new_facedata["download_error"] = true if not new_facedata["unavailable"]
    end
    
    # 
    # filter by avalible frames
    # 
    if new_facedata["frames"].keys.size == 0
        log "    no frames found after attempted download, moving on".light_black.underline
        next
    end
    
    # 
    # frame analysis
    # 
    log "    begining frame analysis".light_black
    for each_index, each_frame_img_path in new_facedata["frames"].clone
        log "        looking at frame: #{"#{each_index}".yellow}".light_black
        # 
        # run the face detection
        # 
        faces = []
        begin
            # FIXME: improve this interpolation (single quotes will cause breakage)
            faces = JSON.load(`python3 '#{$paths["face_detector"]}' '#{each_frame_img_path}'`)
        rescue => exception
            log "        error getting faces for this frame, moving to next frame".yellow
            new_facedata["frames"][each_index] = { "faces" => nil }
        end
        
        # create face data record
        new_facedata["frames"][each_index] = {
            "faces" => faces ,
            "big_faces_>=1" => false
        }
        
        # 
        # check if there is 1 face that is big enough
        # 
        for x, y, width, height in faces
            # color it green if true
            if height > required_face_size
                new_facedata["frames"][each_index]["big_faces_>=1"] = true
                log "            face found: (big?: #{"#{is_big}".green}) x:#{x}, y:#{y}, width:#{width}, height:#{height}".light_black
                break
            end
            log "            face found: (big?: #{"#{is_big}".red}) x:#{x}, y:#{y}, width:#{width}, height:#{height}".light_black
        end
    end
    
    # 
    # check if video is just a picture (a static image)
    #
    def frequency(array)
       array.inject(Hash.new(0)) { |h,v| h[v] += 1; h }
    end
    highest_number_of_exact_repeats = frequency(new_facedata["frames"].map{|k,v| v["faces"]}.compact).map{|k,v| v}.max
    new_facedata["max_repeated_face"] = highest_number_of_exact_repeats
    
    
    # 
    # check if has good (big) faces (afer removing exact-duplicate faces)
    # 
    number_of_big_faces = Set.new(new_facedata["frames"].map{|k,v| v["faces"]}.compact).map{|k,v| v["big_faces_>=1"]||nil}.compact.size
    if number_of_frames_needed >= number_of_frames_needed
        new_facedata["good_faces"] = true
        log "    good_faces? true".green.underline
    end
    
    end #in_dir
end

