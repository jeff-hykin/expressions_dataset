require "atk_toolbox"
require_relative Info.paths["database_api"] # the (path) inside info.yaml 

local_database = EzDatabase.new(Info["parameters"]["database"]["url"])

data = YAML.load_file("./process_emotion.stats.nosync.yaml")
totals = Hash.new(0)

totals[:summary] = {}

for each in data["videos_processed"]
    vid_id = each.keys[0]
    vid_data = each.values[0]
    totals[:duration_total] += local_database[ vid_id, "basic_info", "duration" ]
    totals[:database_time]  += vid_data["database_save_duration"]
    totals[:emotion_time]   += vid_data["find_emotion_duration"]
    totals[:face_time]      += vid_data["find_faces_duration"]
    totals[:frame_count]    += vid_data["frame_count"]
    totals[:face_count]     += vid_data["face_frame_count"]
    totals[:total_time]     += vid_data["processing_time"]
end

totals[:summary][:average_duration] = totals[:duration_total] / data["videos_processed"].size
totals[:summary][:database_percent] = (100 * totals[:database_time]/totals[:total_time]).round(1)
totals[:summary][:emotion_percent]  = (100 * totals[:emotion_time]/totals[:total_time]).round(1)
totals[:summary][:face_percent]     = (100 * totals[:face_time]/totals[:total_time]).round(1)
totals[:summary][:database_avg_time] = ((totals[:summary][:database_percent] /100) * totals[:summary][:average_duration]).round(1)
totals[:summary][:emotion_avg_time]  = ((totals[:summary][:emotion_percent]  /100) * totals[:summary][:average_duration]).round(1)
totals[:summary][:face_avg_time]     = ((totals[:summary][:face_percent]     /100) * totals[:summary][:average_duration]).round(1)

puts totals.to_yaml