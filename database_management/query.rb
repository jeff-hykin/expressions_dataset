require 'atk_toolbox'
require_relative Info.paths["ruby_tools"] # the (path) inside info.yaml 


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



puts Video['8wOJw4VhmYs']
# puts Video['K72HTHUwP54'].metadata.to_yaml
# puts Video['xnkCgOVBOsI'].all_faces_in_frames.to_yaml