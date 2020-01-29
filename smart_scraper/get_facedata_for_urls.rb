# how this file works
    # pick random a video
    # make sure its long enough/short enough
    # collect random frames from it
    # run the facial expression dector on the frames
    # if 70% have faces that are 1/3 of the height of the video, then keep the video

require 'atk_toolbox'
require_relative Info.paths["ruby_tools"] # the (path) inside info.yaml 

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
    log "Evaluating Video: #{"#{random_video.id.to_s}".blue}".light_cyan
    duration = random_video.duration

    # 
    # create an assembly line that only (in theory) modifies new_facedata
    # 
    new_facedata = {}
    
    # 
    # create a directory for that video and switch to it
    # 
    video_path = $paths["filtered_videos"]/random_video.id+".nosync"
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
            log "    video duration insufficient #{"#{duration}".blue}, moving along".light_black.underline
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
        log "    downloading video: (duration=#{duration}seconds)".light_black
        new_facedata["frames"] = {}

        # download the video
        begin
            # 
            # create a crude timeout system via multithreading
            # 
            # (sometimes video's get hung up and need to be killed)
            video_still_waiting = true
            frozen_check_interval = 1 # second
            timeout_checker = Thread.new do
                total_time_waited = 0
                loop do
                    sleep frozen_check_interval
                    total_time_waited += frozen_check_interval
                    if not video_still_waiting
                        break
                    end
                    # if the video is taking forever to download
                    if total_time_waited > duration
                        log "    Video appears to be caught/hung-up while downloading".yellow
                        log "    Now killing all youtube-dl processes as a way to reset the system".yellow
                        # kill all youtube-dl processes
                        Console.run!("ps -eaf | grep \"youtube-dl\" | grep -v grep | awk '{ print $2 }' | xargs kill -9", silent: true)
                    end
                end
            end
            random_video.download() # downloads to current dir folder with id as the name 
            video_still_waiting = false
            timeout_checker.join # wait for the timeout_checker
        rescue CommandResult::Error => exception
            # if the video is unavailable, remember that
            if exception.command_result.read =~ /ERROR: This video is unavailable./
                log "    video #{random_video.id} unavailable".yellow
                new_facedata["unavailable"] = true
            else
                log "    unknown issue downloading video: #{exception.command_result.read}"
            end
            next
        end
        
        # 
        # download the frames as images
        # 
        # pick some evenly-spread-out times based on the duration
        frame_sample_indexes = (1..number_of_sample_frames).to_a.map{ |each| ((duration / 11.0) * each ).to_i }
        # keep track of where these are going to be saved
        for each in frame_sample_indexes
            screenshot_path = "#{random_video.id}_#{each}.png"
            # download each screenshot
            random_video.get_frame(at_second: each, save_to: screenshot_path)
            # record successful frames
            new_facedata["frames"][each] = screenshot_path
        end
    rescue => exception
        new_facedata["download_error"] = true if not new_facedata["unavailable"]
        if new_facedata["frames"].keys.size == 0
            log "exception is: #{exception} "
        end
    end
    
    # 
    # filter by avalible frames
    # 
    if new_facedata["frames"].keys.size == 0
        log "    no frames found after attempted download, moving on".light_black.underline if ! new_facedata["unavailable"] 
        next
    end
    
    # 
    # frame analysis
    # 
    log "    begining frame analysis".light_black
    good_frames = 0
    for each_index, each_frame_img_path in new_facedata["frames"].clone
        log "        looking at the frame: #{"#{each_index}".yellow} seconds".light_black
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
                good_frames += 1
                log "            face found: (big?: #{"true".green}) x:#{x}, y:#{y}, width:#{width}, height:#{height}".light_black
                break
            end
            log "            face found: (big?: #{"false".red}) x:#{x}, y:#{y}, width:#{width}, height:#{height}".light_black
        end
    end
    
    # 
    # check if video is just a picture (a static image)
    #
    def frequency(array)
       array.inject(Hash.new(0)) { |h,v| h[v] += 1; h }
    end
    highest_number_of_exact_repeats = frequency(new_facedata["frames"].map{|k,v| v["faces"].size>0?(v["faces"]):(nil)}.compact).map{|k,v| v}.max
    new_facedata["max_repeated_face"] = highest_number_of_exact_repeats
    log "    max_repeated_face: #{highest_number_of_exact_repeats}".light_black
    
    
    # 
    # check if has good (big) faces (afer removing exact-duplicate faces)
    # 
    if good_frames >= number_of_frames_needed
        new_facedata["good_faces"] = true
        log "    good_faces? true".green.underline
    end
    
    end #in_dir
end

