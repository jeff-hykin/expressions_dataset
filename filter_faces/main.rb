# how this file works
    # pick random a video
    # make sure its long enough/short enough
    # collect random frames from it
    # run the facial expression dector on the frames
    # if 70% have faces that are 1/3 of the height of the video, then keep the video

require_relative '../automated_downloading/helpers'



# videos = JSON.load(FS.read(Info["(project)"]["(paths)"]["all_urls"]))
# # delete all the ones without metadata
# videos = videos.delete_if {|key, value| value.keys.size == 0} 


# loop do
#     random_video_id = videos.keys.sample
#     random_url = get_full_url(random_video_id)
#     duration = videos[random_video_id]["duration"]

#     # make sure the video is a moderate duration
#     if duration > 10.minutes || duration < 100.seconds
#         next
#     else
#         # pick some indexes based on the duration
#         frame_sample_indexes = (1..10).to_a.map{ |each| ((duration / 11.0) * each ).to_i }
#         # download frames from those indexes
#         get_frame(from: random_url, at: frame_sample_indexes, save_it_to: __dir__()/random_video_id/"#{random_video_id}_.png")
#         break
#     end
# end


# run the python code
faces = JSON.load(`python3 '#{__dir__()/".."/"face_detection"/"face_detection.py"}' '#{__dir__()/"./DawrlSwHUiM/DawrlSwHUiM_148.png"}'`)

