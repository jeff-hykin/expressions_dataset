# how this file works
    # pick random a video
    # make sure its long enough/short enough
    # collect random frames from it
    # run the facial expression dector on the frames
    # if 70% have faces that are 1/3 of the height of the video, then keep the video

require_relative '../automated_downloading/helpers'

number_of_sample_frames = 10
number_of_frames_needed = 70.percent * number_of_sample_frames
required_face_size      = 50.percent * Video.frame_height

# continually try different videos until one is long enough
loop do
    # retrive the video data
    random_video = Video.random
    duration = random_video.duration
    # make sure the video is a moderate duration and hasn't been categorized
    if duration < 100.seconds && random_video.metadata["good_faces"] == nil
        next
    else
        puts "Evaluating: #{random_video}"
        # pick some evenly-spread-out times based on the duration
        frame_sample_indexes = (1..number_of_sample_frames).to_a.map{ |each| ((duration / 11.0) * each ).to_i }
        # download frames from those times
        random_video.get_frame(at: frame_sample_indexes, save_it_to: __dir__()/random_video.id/"#{random_video.id}_.png")
        # keep track of iterator data
        random_video.metadata["frames"] = {}
        number_of_big_faces = 0
        # inside that video folder
        FS.in_dir(__dir__()/random_video.id) do
            # go over each picture
            for each_picture in FS.glob("*.png")
                # run the face detection
                faces = JSON.load(`python3 '#{__dir__()/".."/"face_detection"/"face_detection.py"}' '#{each_picture}'`)
                # add info to metadata
                index = each_picture.sub(/.+_(\d+)\.png$/, '\1').to_i
                if not random_video.metadata["frames"][index].is_a?(Hash)
                    random_video.metadata["frames"][index] = {}
                end
                random_video.metadata["frames"][index]["faces"] = faces
                # check if face is big enough
                for each_face in faces
                    x, y, width, height = each_face
                    if height > required_face_size
                        number_of_big_faces += 1
                        break
                    end
                end
            end
        end
        if number_of_big_faces >= number_of_frames_needed 
            random_video.metadata["good_faces"] = true
        else
            random_video.metadata["good_faces"] = false
        end
        random_video.save_metadata
        break
    end
end

