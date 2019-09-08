# how this file works
    # pick random a video
    # make sure its long enough/short enough
    # collect random frames from it
    # run the facial expression dector on the frames
    # if 70% have faces that are 1/3 of the height of the video, then keep the video

require_relative '../automated_downloading/helpers'

Console.verbose = true

storage_cap               = 100 # number of good videos (generally 10Mb of screenshots per video)
number_of_sample_frames   = 10
number_of_frames_needed   = 50.percent * number_of_sample_frames
required_face_size        = 25.percent * Video.frame_height
similarity_rejection_rate = 50.percent * number_of_frames_needed

# continually try different videos until one is long enough
loop do
    # retrive the video data
    random_video = Video.random()
    duration = random_video.duration
    # make sure the video is a moderate duration and hasn't been categorized
    if duration < 100.seconds && random_video.metadata["good_faces"] == nil
        next
    else
        log "Evaluating: #{random_video.id.to_s.blue}"
        # pick some evenly-spread-out times based on the duration
        frame_sample_indexes = (1..number_of_sample_frames).to_a.map{ |each| ((duration / 11.0) * each ).to_i }
        # download frames from those times
        log "    begining to get frames"
        failed_to_get_frames = false
        begin
            paths = random_video.get_frame(at: frame_sample_indexes, save_it_to: __dir__()/random_video.id/"#{random_video.id}_.png")
        rescue => exception
            failed_to_get_frames = true
            log '    hit error while waiting for video to load'
        end
        log "    frames retrieved"
        # check if the video is actuall just a picture
        first_file, *other_files = paths
        number_of_identical_frames = other_files.count{|each| FileUtils.compare_file(first_file, each)}
        if failed_to_get_frames
            random_video.metadata["failed_to_load"] = true
        elsif number_of_identical_frames > similarity_rejection_rate
            random_video.metadata["is_picture"] = true
            random_video.metadata["good_faces"] = false
            log '    most of the frames were identical: assuming video is actually picture and skipping'
        else
            # keep track of iterator data
            random_video.metadata["frames"] = {}
            number_of_big_faces = 0
            face_coordinates = {}
            # inside that video folder
            FS.in_dir(__dir__()/random_video.id) do
                pictures = FS.glob("*.png")
                face_coordinates = {}
                # go over each picture
                for each_picture in pictures
                    index = each_picture.sub(/.+_(\d+)\.png$/, '\1').to_i
                    log "    looking at frame: #{index.to_s.yellow}"
                    # run the face detection
                    faces = JSON.load(`python3 '#{Info.paths["face_detector"]}' '#{each_picture}'`)
                    # add info to metadata
                    if not random_video.metadata["frames"][index].is_a?(Hash)
                        random_video.metadata["frames"][index] = {}
                    end
                    random_video.metadata["frames"][index]["faces"] = faces
                    # check if face is big enough
                    face_coordinates[index] = []
                    for each_face in faces
                        x, y, width, height = each_face
                        face_coordinates[index] << each_face
                        is_big = height > required_face_size
                        # color it green if true
                        if is_big
                            number_of_big_faces += 1
                            is_big = is_big.to_s.green 
                            log "        face found: (big?: #{is_big}) x:#{x}, y:#{y}, width:#{width}, height:#{height}"
                            break
                        end
                        log "        face found: (big?: #{is_big}) x:#{x}, y:#{y}, width:#{width}, height:#{height}"
                    end
                end
            end
            # if most of the faces are in a similar place
            if face_coordinates.values.count{|each| each == face_coordinates.values[-2]} > similarity_rejection_rate
                random_video.metadata["is_picture"] = true
                random_video.metadata["good_faces"] = false
            elsif number_of_big_faces >= number_of_frames_needed 
                random_video.metadata["good_faces"] = true
            else
                random_video.metadata["good_faces"] = false
            end
            if random_video.metadata["good_faces"]
                log "    good_faces? " + "#{random_video.metadata["good_faces"]}".green
            else
                log "    good_faces? #{random_video.metadata["good_faces"]}"
            end
            random_video.save_metadata
        end
        
        
        
        # delete if not useful frames
        if random_video.metadata["good_faces"] == false || random_video.metadata["failed_to_load"] == true
            FS.delete(__dir__()/random_video.id)
        # save, and potencially break if video is useful
        else
            log "Number of useful videos: #{FS.list_folders(__dir__).size()}"
            # break looping 
            if FS.list_folders(__dir__).size() > storage_cap
                break
            end
        end
    end
end

