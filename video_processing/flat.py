#
#  outline
#
    # for each video
    #     call on_new_video() for VideoData/Stats/Logging/etc
    #     if video meets requirements (duration, framerate, etc)
    #         what_frame = frame_picker(accumulated_frame_data)
    #         get_frame(what_frame)
    # 
    #         for each face in frame
    #              get emotion
    #         save the data somewhere
    #
    # # everything else is pretty much just recording stats, error handling, logging output, and saving data to files/database


#
# Flat general idea
#
    # process all frames in order 


# 
# imports
# 
import include
include.file("../toolbox/tools.py", globals())
# process helpers
include.file("./process_helpers/process_log.py", globals())
include.file("./process_helpers/data_saver.py", globals())
include.file("./process_helpers/flat_frame_picker.py", globals())

# 
# constants + globals
#
PROCESS_KEY = "flat_0-0-1"
FACE_FINDER_KEY = "faces_haarcascade_0-0-2"
EMOTION_FINDER_KEY = "emotion_vgg19_0-0-2"
SAVE_EACH_VIDEO_TO_FILE = False
SAVE_TO_DATABASE = True
FIVE_MINUTES = (5 * 60)
FORCE_CANCEL_LIMIT = 5
stats = {}
stop_on_next_video = 0
DataSaver = DataSaverClass(SAVE_EACH_VIDEO_TO_FILE, SAVE_TO_DATABASE, FACE_FINDER_KEY, PROCESS_KEY)
FlatFramePicker = FlatFramePickerClass(DataSaver, ProgressLog, stats, stop_on_next_video, FORCE_CANCEL_LIMIT, EMOTION_FINDER_KEY)

# 
# performance statistics
# 
# the file name will increment each time the program is successfully run
stats_file_name = FS.generate_unique_file_name(paths["process_emotion_stats"])
stats.update({
    "total": {
        "successful_video_count": 0,
        "processing_time": 0,
        "sum_video_duration": 0,
        "database_time": 0,
        "face_time": 0,
        "emotion_time": 0,
        "attempted_video_count": 0,
        "frames_evaluated": 0,
        "frames_downloaded": 0,
    },
    "percent": {
        "successful_video": 0,
        "database_time": 0,
        "face_time": 0,
        "emotion_time": 0,
        "frames_evaluated": 0,
    },
    "per_video_average": {
        "duration": None,
        "processing_time": None,
    },
    "local": {
        "start_time": 0,
        "face_frame_count": 0,
        "find_faces_duration" : 0, 
        "find_emotion_duration" : 0, 
    },
    "global_start_time": time.time(),
    "videos_processed": [],
})

# grab some videos
print("retriving videos")
Console.start_color("red")
for video_count, each_video in enumerate(VideoSelect().is_downloaded.has_basic_info.then.has_basic_info.has_related_videos.retrive()):
    Console.stop_color()
    video_data = {}
    
    # get basic info
    start = time.time()
    video_data["basic_info"] = each_video["basic_info"]
    stats["total"]["database_time"] += time.time() - start
    
    # ensure basic info exists and is properly structured
    video_data["basic_info"] = video_data["basic_info"] if type(video_data["basic_info"]) == dict else {}
    video_data["basic_info"]["duration"] = video_data["basic_info"].get("duration", 0)
    video_data["basic_info"]["fps"]      = video_data["basic_info"].get("fps", 0)
    video_data["messages"] = video_data.get("messages", {})
    video_data["messages"]["running_processes"] = video_data.get("messages", {}).get("running_processes", [])
    video_data["frames"] = {}
    
    # logging
    stats["total"]["attempted_video_count"] = video_count+1
    stats["total"]["processing_time"] = time.time() - stats["global_start_time"]
    ProgressLog.on_new_video(each_video, video_data, video_count)
    
    # stop from keyboard
    if stop_on_next_video > 0:
        print('process_emotion successfully shutdown gracefully')
        break
    
    # videos shorter than a certain amount of time
    if video_data["basic_info"]["duration"] < FIVE_MINUTES:
        try:
            start_time = time.time()
            
            ProgressLog.on_new_confirmed_video(each_video, video_data, start_time)
            DataSaver.on_new_confirmed_video(each_video, video_data)
            FlatFramePicker.on_new_confirmed_video()
            
            stats["local"] = {
                "start_time": start_time,
                "face_frame_count": 0,
                "find_faces_duration" : 0, 
                "find_emotion_duration" : 0,
                "face_sequences": [ [None, None] ],
            }
            
            largest_index = 0
            frame_index = None
            frame = None
            while 1:
                frame_index = FlatFramePicker.pick_frame(frame_index, frame)
                if frame_index is None:
                    break
                else:
                    largest_index = frame_index if frame_index > largest_index else largest_index
                # returns None when frame index is too big
                frame = each_video.get_frame(frame_index)
            
            DataSaver.on_completed_video()
            print(Console.color("\n# Video Successfully Processed", foreground="white", background="blue"))

            # 
            # stats
            # 
            now = time.time()
            stats["total"]["frames_downloaded"] += largest_index
            stats["total"]["successful_video_count"] += 1
            stats["total"]["sum_video_duration"] += video_data["basic_info"]["duration"]
            stats["total"]["database_time"]      += each_video.processing_time
            stats["total"]["face_time"]          += stats["local"]["find_faces_duration"]
            stats["total"]["emotion_time"]       += stats["local"]["find_emotion_duration"]
            stats["total"]["processing_time"]    = now - stats["global_start_time"]
            stats["local"].update({
                "frame_count"     : largest_index,
                "processing_time" : now - stats["local"]["start_time"],
                # remove the (None, None) sequences
                "face_sequences"  : list(filter(lambda each: each[1] is not None, stats["local"]["face_sequences"])),
            })
            stats["videos_processed"].append({ each_video.id : dict(stats["local"]) })
            successful_video = int(round((    stats["total"]["successful_video_count"]   /   stats["total"]["attempted_video_count"]     )*100,0))
            database_time    = int(round((    stats["total"]["database_time"]            /   stats["total"]["processing_time"]           )*100,0))
            face_time        = int(round((    stats["total"]["face_time"]                /   stats["total"]["processing_time"]           )*100,0))
            emotion_time     = int(round((    stats["total"]["emotion_time"]             /   stats["total"]["processing_time"]           )*100,0))
            frames_evaluated = int(round((    stats["total"]["frames_evaluated"]         /   stats["total"]["frames_downloaded"]         )*100,0))
            stats.update({
                "percent": {
                    "successful_video": f"{successful_video}%",
                    "database_time":    f"{database_time}%",
                    "face_time":        f"{face_time}%",
                    "emotion_time":     f"{emotion_time}%",
                    "frames_evaluated": f"{frames_evaluated}%",
                },
                "per_video_average": {
                    "duration":        stats["total"]["sum_video_duration"] / stats["total"]["successful_video_count"],
                    "processing_time": stats["total"]["processing_time"]    / stats["total"]["successful_video_count"],
                }
            })
            # write the stats to a file
            FS.write(yaml.dump(stats, default_flow_style=False), to=stats_file_name)
            
        except KeyboardInterrupt:
            exit(0)
        
        # skip videos that can't be downloaded/processed for whatever reason
        except Exception as the_exception:
            print(f"\n[video select] hit an error when trying to process frames...skipping ",Console.color(f"{each_video.id} ", foreground="yellow"))
            print(Console.color(f'[exception]', foreground="white", background="red"), Console.color(f'{the_exception}',foreground="red"))
            # print the traceback of unknown exceptions
            if not re.match(r'Download of youtube video [\w\-]+ failed', f"{the_exception}"):
                Console.start_color("yellow")
                traceback.print_tb(the_exception.__traceback__)
                Console.stop_color()
            print("\n")
            # try the next video
            continue