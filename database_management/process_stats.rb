require "atk_toolbox"

data = YAML.load_file("./process_emotion.stats.nosync.yaml")
totals = Hash.new(0)

for each in data["videos_processed"]
    vid_data = each.values[0]
    totals[:database_time] += vid_data["database_save_duration"]
    totals[:face_time]     += vid_data["find_faces_duration"]
    totals[:frame_count]   += vid_data["frame_count"]
    totals[:face_count]    += vid_data["face_frame_count"]
    totals[:total_time]    += vid_data["processing_time"]
end
puts totals.to_yaml