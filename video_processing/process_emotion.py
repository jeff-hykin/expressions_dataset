from pathlib import Path
from os.path import join, dirname
exec(Path(join(dirname(__file__), '..', 'toolbox', 'tools.py')).read_text())

# get the emotion tools
from toolbox.face_tools.expressions.Facial_expressions_detection import network_output as get_emotion_data
from toolbox.face_tools.expressions.Facial_expressions_detection import preprocess_face

SAVE_TO_DATABASE = True
SAVE_EACH_VIDEO_TO_FILE = False
five_minutes = (5 * 60)
FORCE_CANCEL_LIMIT = 5

face_cascade = cv.CascadeClassifier(paths['haarcascade_frontalface_default'])
def get_faces(image):
    face_dimensions = face_cascade.detectMultiScale(image, scaleFactor=1.1, minNeighbors=1, minSize=(100, 100), flags=cv.CASCADE_SCALE_IMAGE)
    cropped_faces = [ image[y:y + h, x:x + w] for x, y, w, h in face_dimensions ]
    return cropped_faces, face_dimensions

# 
# performance statistics
# 
# the file name will increment each time the program is successfully run
stats_file_name = FS.generate_unique_file_name(paths["process_emotion_stats"])
stats = {
    "total": {
        "successful_video_count": 0,
        "processing_time": 0,
        "sum_video_duration": 0,
        "database_time": 0,
        "face_time": 0,
        "emotion_time": 0,
        "attempted_video_count": 0,
    },
    "percent": {
        "successful_video": 0,
        "database_time": 0,
        "face_time": 0,
        "emotion_time": 0,
    },
    "per_video_average": {
        "duration": None,
        "processing_time": None,
    },
    "local": {
        "start_time": 0,
        "face_frame_count": 0,
        "database_save_duration": 0,
        "find_faces_duration" : 0, 
        "find_emotion_duration" : 0, 
    },
    "global_start_time": time.time(),
    "videos_processed": [],
}

# grab some videos
print("retriving videos")
stop_on_next_video = 0
Console.start_color("red")
for video_count, each_video in enumerate(VideoSelect().has_basic_info.has_related_videos.retrive()):
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
    stats["total"]["attempted_video_count"] = video_count
    stats["total"]["processing_time"] = time.time() - stats["global_start_time"]
    approximate_frame_count = video_data["basic_info"]["duration"] * video_data["basic_info"]["fps"]
    print(
        Console.color(f"[video={video_count}][ approximate_frame_count:", foreground="green"),
        Console.color(approximate_frame_count, foreground="yellow"),
        Console.color(f"]", foreground="green"),
        Console.color(each_video.id)
    )
    
    # stop from keyboard
    if stop_on_next_video > 0:
        print('process_emotion successfully shutdown gracefully')
        break
    
    # videos shorter than a certain amount of time
    if video_data["basic_info"]["duration"] < five_minutes:
        try:
            stats["local"] = {
                "start_time": time.time(),
                "face_frame_count": 0,
                "find_faces_duration" : 0, 
                "find_emotion_duration" : 0,
                "database_save_duration": 0,
                "face_sequences": [ [None, None] ],
            }
            
            # 
            # running_processes indicator
            # 
            # tell the database a video is being processed encase it fails in the middle and corrupts data
            process_name = "faces_haarcascade_0-0-2"
            if SAVE_TO_DATABASE:
                video_data["messages"]["running_processes"].append(process_name)
                start = time.time()
                each_video["messages", "running_processes"] = video_data["messages"]["running_processes"]
                stats["local"]["database_save_duration"] += time.time() - start
            
            # each video frame
            previous_frame = None
            for frame_index, each_frame in enumerate(each_video.frames):
                try:
                    # check for duplicate frames
                    if np.array_equal(previous_frame, each_frame):
                        # the face_data variable will have a value left over from the previous iteration
                        
                        # save to variable (later written to file)
                        if SAVE_EACH_VIDEO_TO_FILE:
                            video_data["frames"][frame_index] = video_data["frames"].get(frame_index, {})
                            video_data["frames"][frame_index]["faces_haarcascade_0-0-2"] = face_data
                        # save the data to databse
                        if SAVE_TO_DATABASE:
                            start = time.time()
                            each_video["frames", frame_index, "faces_haarcascade_0-0-2"] = face_data
                            stats["local"]["database_save_duration"]  += time.time() - start
                        # skip to the next frame
                        continue
                    else:
                        previous_frame = each_frame
                    
                    # 
                    # progress logging
                    # 
                    if frame_index % 100 == 0:
                        # newline every 13 outputs
                        end = "" if frame_index % 1300 == 0 else "\n"
                        estimated_time = ""
                        if frame_index != 0:
                            how_long_it_took = start - stats["local"]["start_time"]
                            time_per_frame = how_long_it_took / frame_index
                            estimated_time = int(time_per_frame * approximate_frame_count)
                            estimated_time = Console.color(f"{round(estimated_time/60,1)}",foreground="magenta")
                            estimated_time = Console.color(f"ETA: ",foreground="white") + estimated_time + Console.color(f"min ",foreground="white")
                        face_count = stats["local"]["face_frame_count"]
                        percent_completion = (frame_index/approximate_frame_count)*100
                        Console.start_color("blue")
                        Console.progress(percent=percent_completion, additional_text=estimated_time+f"{face_count} face-frames")
                        Console.stop_color()
                    
                    # 
                    # find faces
                    # 
                    start = time.time()
                    # actual machine learning usage
                    face_images, dimensions = get_faces(each_frame)
                    faces_exist = len(face_images) != 0
                    face_data = []
                    stats["local"]["find_faces_duration"]     += time.time() - start
                    stats["local"]["face_frame_count"]        += 1 if faces_exist else 0
                    
                    # 
                    # record face_sequences
                    # 
                    # each sequence is a length-2 list, first element == start index, second element = end index
                    # there is a (None, None) tuple that will often be trailing the end of stats["local"]["face_sequences"]
                    most_recent_sequence = stats["local"]["face_sequences"][-1]
                    sequence_was_started = most_recent_sequence[0] is not None
                    if not faces_exist:
                        # close off the old sequence by adding a new one
                        if sequence_was_started:
                            stats["local"]["face_sequences"].append([None, None])
                        else:
                            # do nothing if a sequence hadn't even been started
                            pass
                    # if faces exist
                    else:
                        if sequence_was_started:
                            # then just add onto the end of the sequence
                            most_recent_sequence[1] = frame_index
                        else:
                            # start a sequence by setting the start/end value
                            most_recent_sequence[0] = frame_index
                            most_recent_sequence[1] = frame_index
                    
                    #
                    # find emotion
                    #
                    start = time.time()
                    for each_face_img, each_dimension in zip(face_images, dimensions):
                        face_data.append({
                            "x" : int(each_dimension[0]),
                            "y" : int(each_dimension[1]),
                            "width" : int(each_dimension[2]),
                            "height" : int(each_dimension[3]),
                            "emotion_vgg19_0-0-2" : get_emotion_data(preprocess_face(each_face_img)),
                        })
                        # round all the emotions up to ints
                        probabilities = face_data[-1]["emotion_vgg19_0-0-2"]["probabilities"]
                        for each_key in probabilities:
                            probabilities[each_key] = int(round(probabilities[each_key], 0))
                    stats["local"]["find_emotion_duration"] += time.time() - start
                    
                    
                    #
                    # save frame data
                    #
                    
                    # save to variable (later written to file)
                    if SAVE_EACH_VIDEO_TO_FILE:
                        video_data["frames"][frame_index] = video_data["frames"].get(frame_index, {})
                        video_data["frames"][frame_index]["faces_haarcascade_0-0-2"] = face_data
                    # save the data to databse
                    if SAVE_TO_DATABASE:
                        start = time.time()
                        each_video["frames", frame_index, "faces_haarcascade_0-0-2"] = face_data
                        stats["local"]["database_save_duration"]  += time.time() - start
                    
                except KeyboardInterrupt:
                    print(f'\nGot the message, stopping on video completion\nNOTE: interrupt {FORCE_CANCEL_LIMIT - stop_on_next_video} more times to cause a force cancel')
                    stop_on_next_video += 1
                    # if the user says to end repeatedly
                    if stop_on_next_video > FORCE_CANCEL_LIMIT:
                        # stop immediately, causing partially bad data
                        exit(0)
            # 
            # cleanup
            #
            
            start = time.time()
            # get processes from database
            video_data["messages"]["running_processes"] = each_video["messages", "running_processes"]
            # remove this process since its finished
            video_data["messages"]["running_processes"] = [ each for each in video_data["messages"]["running_processes"] if each != process_name ]
            # set the data on the database
            each_video["messages", "running_processes"] = video_data["messages"]["running_processes"]
            stats["local"]["database_save_duration"]  += time.time() - start
            print(Console.color("\n# Video Successfully Processed", foreground="white", background="blue"))
            
            # optionally save video data to file
            if SAVE_EACH_VIDEO_TO_FILE:
                FS.write(json.dumps(video_data), to=FS.join(paths["video_cache"], each_video.id+".json"))

            # 
            # stats
            # 
            now = time.time()
            stats["total"]["successful_video_count"] += 1
            stats["total"]["sum_video_duration"] += video_data["basic_info"]["duration"]
            stats["total"]["database_time"]      += stats["local"]["database_save_duration"]
            stats["total"]["face_time"]          += stats["local"]["find_faces_duration"]
            stats["total"]["emotion_time"]       += stats["local"]["find_emotion_duration"]
            stats["total"]["processing_time"]    = now - stats["global_start_time"]
            stats["local"].update({
                "frame_count"     : frame_index,
                "processing_time" : now - stats["local"]["start_time"],
                # remove the (None, None) sequences
                "face_sequences"  : list(filter(lambda each: each[1] is not None, stats["local"]["face_sequences"])),
            })
            stats["videos_processed"].append({ each_video.id : dict(stats["local"]) })
            successful_video = int(round((    stats["total"]["successful_video_count"]   /   stats["total"]["attempted_video_count"]+1   )*100,0))
            database_time    = int(round((    stats["total"]["database_time"]            /   stats["total"]["processing_time"]           )*100,0))
            face_time        = int(round((    stats["total"]["face_time"]                /   stats["total"]["processing_time"]           )*100,0))
            emotion_time     = int(round((    stats["total"]["emotion_time"]             /   stats["total"]["processing_time"]           )*100,0))
            stats.update({
                "percent": {
                    "successful_video": f"{successful_video}%",
                    "database_time":    f"{database_time}%",
                    "face_time":        f"{face_time}%",
                    "emotion_time":     f"{emotion_time}%",
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