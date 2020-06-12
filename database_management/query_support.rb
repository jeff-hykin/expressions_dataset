require 'atk_toolbox'
require_relative Info.paths["ruby_tools"] # the (path) inside info.yaml 
require_relative Info.paths["database_api"] # the (path) inside info.yaml 


# take a look at the first several videos

def list_nonhelpful_videos()
    for each_video_id in Video.all_videos.keys[1...1000]
        video = Video[each_video_id]
        if not video["unavailable"]
            # if facedata was collected
            if video["facedata_version"] != nil && 
                # but the video wasn't good
                if not video["good_faces"]
                    puts "no good faces: #{video.url}"
                end
            end
        end
    end
end

def convert_old_to_new()
    all_videos = JSON.load(FS.read($paths["all_urls"]))
    new_data = {}
    for each_key, each_value in all_videos
        
        # unavalible
        if each_value == nil || each_value == false || !each_value.is_a?(Hash)  ||  each_value["unavailable"] || each_value["unavailable"]
            new_data[each_key] = false
            next
        end
        
        # basic info
        basic_info = {}
        for each_basic_info in ["duration","fps","height","width","download_error",]
            if each_value[each_basic_info] != nil
                basic_info[each_basic_info] = each_value[each_basic_info]
            end
        end
        basic_info_exists = basic_info.keys.size > 0
        
        # face_data_1.2
        face_data = {}
        if each_value["max_repeated_face"] != nil
            face_data["max_repeated_face"] = each_value["max_repeated_face"]
        end
        for each in [ "good_faces", "is_picture"]
            if each_value[each] != nil
                face_data[each+"?"] = each_value[each]
            end
        end
        face_data_exists = face_data.keys.size > 0
        
        # frames
        frames = {}
        if each_value["frames"] != nil
            for each_frame_index, each_frame_value in each_value["frames"]
                
                frame_value = {}
                big_faces_exist = each_frame_value["big_faces_>=1"] != nil
                
                faces_data_exists = each_frame_value["faces"].is_a?(Array)
                if faces_data_exists
                    faces = []
                    for each in each_frame_value["faces"]
                        faces << {
                            "is_big?": each[0],
                            "x": each[1],
                            "y": each[2],
                            "width": each[3],
                            "height": each[4],
                        }
                    end
                end
                
                if faces_data_exists || big_faces_exist
                    frames[each_frame_index] = {}
                    frames[each_frame_index]["facedata_1.2"] = {}
                    if big_faces_exist
                        frames[each_frame_index]["facedata_1.2"]["big_faces_>=1?"] = each_frame_value["big_faces_>=1"]
                    end
                    if faces_data_exists
                        frames[each_frame_index]["facedata_1.2"]["faces"] = faces
                    end
                end
            end
        end
        frames_exist = frames.keys.size > 0
        
        
        # if no data, then put nil
        if !basic_info_exists && !face_data_exists && !frames_exist
            new_data[each_key] = nil
        else
            new_data[each_key] = {}
            # add basic_info
            if basic_info_exists
                new_data[each_key]["basic_info"] = basic_info
            end
            # add face data
            if face_data_exists
                new_data[each_key]["face_data_1.2"] = face_data
            end
            # add frame data
            if frames_exist
                new_data[each_key]["frames"] = frames
            end
        end
    end
    # save all changes
    FS.write(new_data.to_json, to: $paths["new_data"])
end

def sample_new()
    all_videos = JSON.load(FS.read($paths["new_data"]))
    all_videos.delete_if {|key, value| value == nil || value == false || value["face_data_1.2"] == nil }
    sample  = {}
    for each in all_videos.keys.sample(100)
        sample[each] = all_videos[each]
    end
    puts sample.to_yaml
end

def load_into_database() 
    $local_database = EzDatabase.new(Info["parameters"]["database"]["url"])
    all_videos = JSON.load(FS.read($paths["new_data"]))
    total_videos = all_videos.size
    puts "total_videos is: #{total_videos} "
    skip_past = 0
    new_form = []
    for each_key, each_value in all_videos
        new_form.push({
            _id: each_key,
            _v: each_value
        })
    end

    loop do
        batch = []
        500.times do 
            batch << new_form.pop
            if new_form.size == 0
                break
            end
        end
        puts "#{(1-(new_form.size/(total_videos+0.0)) * 100).round}% remaining: #{new_form.size}"
        $local_database.eval("insertMany", batch) 
        if new_form.size == 0
            break
        end
    end
end

def add_new_values
    $local_database = EzDatabase.new(Info["parameters"]["database"]["url"])
    all_videos = JSON.load(FS.read($paths["new_data"]))
    difference = all_videos.keys - $local_database.keys
    total = difference.size
    iter = 0
    puts "total is: #{total} "
    sleep(2)
    for each in difference
        iter += 1
        begin
            $local_database[each] = all_videos[each]
        rescue => exception
            puts "exception is: #{exception} "
            puts "#{((iter/(total+0.0)) * 100).round}% done: #{iter}"
            sleep(1)
            retry
        end
    end
end

def database_summary_info()
    # things
    is_nil = 0
    is_false = 0
    has_basic_info = 0
    has_related_videos = 0
    has_basic_info_and_related_videos = 0

    count = 0
    each_video ->(each_key , each_value) do
        # get the boolean values
        this_has_basic_info = each_value["basic_info"]["duration"] > 0 rescue false
        this_has_related_videos = each_value["related_videos"].keys.length > 0 rescue false
        
        # set the values
        each_value == nil and is_nil += 1
        each_value == false and is_false += 1
        this_has_basic_info and has_basic_info += 1
        this_has_related_videos and has_related_videos += 1
        (this_has_basic_info && this_has_related_videos) and has_basic_info_and_related_videos += 1
        
        # keep count
        count += 1
        if count % 5000 == 0
            puts "count is: #{count}, has_basic_info: #{has_basic_info}, has_related_videos: #{has_related_videos}, both: #{has_basic_info_and_related_videos}"
        end
    end
    

    puts "is_nil is: #{is_nil} "
    puts "is_false is: #{is_false} " # was 5
    puts "has_basic_info is: #{has_basic_info} " # was 69661
    puts "has_related_videos is: #{has_related_videos} "
    puts "has_basic_info_and_related_videos is: #{has_basic_info_and_related_videos} " # was 66074
end

def each_video(block)
    $local_database = EzDatabase.new(Info["parameters"]["database"]["url"])
    all_videos = $local_database.all
    $count = 0
    for each_key, each_value in all_videos
        # keep count/progress
        $count += 1
        if $count % 5000 == 0
            puts "count is: #{$count}, video is #{each_key}"
        end
        block[each_key, each_value]
    end
end

def validate_database_contents()
    validator = ->(each_key, each_value) do
        case each_value
        when nil
            return :allowed
        when false
            return :allowed
        when Hash
            for each_key, each_value in each_value
                case each_key
                    when "basic_info"
                        return :not_allowed if not (each_value.is_a?(Hash) || each_value != nil)
                        for each_key, each_value in each_value
                            case each_value
                            when "duration"
                                return :not_allowed if value < 0
                            when "fps"
                                return :not_allowed if value <= 0
                            when "height"
                                return :not_allowed if value <= 0
                            when "width"
                                return :not_allowed if value <= 0
                            when "download_error"
                                return :not_allowed if value != true || value != false
                            else
                                return :not_allowed
                            end
                        end
                    when "related_videos"
                        return :not_allowed if not (each_value.is_a?(Hash) || each_value != nil)
                        
                    when "facedata_1.2"
                        return :not_allowed if not (each_value.is_a?(Hash) || each_value != nil)
                        # TODO: add more checks here
                    when "frames"
                        return :not_allowed if not (each_value.is_a?(Hash) || each_value != nil)
                        for each_key, each_value in each_value
                            return :not_allowed if not each_key.is_a?(Integer)
                            return :not_allowed if not (each_value.is_a?(Hash) || each_value != nil)
                        end
                    else
                        return :not_allowed
                end
            end
        else
            return :not_allowed
        end
        # if passes everything then it was allowed
        return :allowed
    end
    
    broken_videos = {}
    
    # things
    is_nil = 0
    is_false = 0
    has_basic_info = 0
    has_related_videos = 0
    has_basic_info_and_related_videos = 0

    count = 0
    each_video ->(each_key, each_value) do
        if validator[each_key, each_value] != :allowed
            broken_videos[each_key] = each_value
        end
        
        # get the boolean values
        this_has_basic_info = each_value["basic_info"]["duration"] > 0 rescue false
        this_has_related_videos = each_value["related_videos"].keys.length > 0 rescue false
        
        # set the values
        each_value == nil and is_nil += 1
        each_value == false and is_false += 1
        this_has_basic_info and has_basic_info += 1
        this_has_related_videos and has_related_videos += 1
        (this_has_basic_info && this_has_related_videos) and has_basic_info_and_related_videos += 1
        
        # keep count
        count += 1
        if count % 5000 == 0
            print "count is: #{count}, has_basic_info: #{has_basic_info}, has_related_videos: #{has_related_videos}, both: #{has_basic_info_and_related_videos}"
        end
    end
    

    puts "is_nil is: #{is_nil} "
    puts "is_false is: #{is_false} " # was 5
    puts "has_basic_info is: #{has_basic_info} " # was 69661
    puts "has_related_videos is: #{has_related_videos} "
    puts "has_basic_info_and_related_videos is: #{has_basic_info_and_related_videos} " # was 66074
    puts "broken_videos.keys.length is: #{broken_videos.keys.length} "
    
    FS.save(broken_videos, to: "./broken_data.yaml", as: :yaml)
end

def clean_up_database
    # try to clean the database
    each_video ->(each_id, each_value) do
        if each_value.is_a?(Hash)
            begin
                new_value = {}
                keep = ->(key){ new_value[key] = each_value[key] if each_value[key].is_a?(Hash) }
                keep["basic_info"]
                keep["frames"]
                keep["related_videos"]
                if new_value.keys.length > 4
                    puts "something went wrong: new_value.keys.length > 4"
                    exit(1)
                end
                # then replace it with only the correct data
                $local_database[each_id] = new_value
            rescue => exception
                retry
            end
        end
    end
end


database_summary_info()