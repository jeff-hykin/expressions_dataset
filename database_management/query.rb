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
    local_database = EzDatabase.new(Info["parameters"]["database"]["url"])
    all_videos = JSON.load(FS.read($paths["new_data"]))
    iter = 0
    total_videos = all_videos.size
    skip_past = 0
    begin
        for each_key, each_value in all_videos
            iter += 1
            if skip_past > iter
                next
            end
            if iter % 1000 == 0
                puts "#{((iter/(total_videos+0.0)) * 100).round}% index: #{iter}"
                skip_past = iter
            end
            local_database[each_key] = each_value
        end
    rescue => exception
        retry # connections sometimes fail
    end
end

load_into_database