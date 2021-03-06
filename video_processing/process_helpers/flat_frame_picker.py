import include
include.file("../../toolbox/tools.py", globals())
include.file("./data_saver.py", globals())
include.file("./process_log.py", globals())
pick_frame = include.file("./base_picker_function.py").pick_frame
just_got_a_happy_frame = include.file("./base_picker_function.py").just_got_a_happy_frame

class FlatFramePickerClass():
    
    # pull all the data in
    def __init__(self, DataSaver, ProgressLog, stats, stop_on_next_video, FORCE_CANCEL_LIMIT, EMOTION_FINDER_KEY):
        self.faces_exist = False
        # keep cache of previous_frame encase the frame is the same as the previous frame
        self.previous_frame = None
        self.DataSaver = DataSaver
        self.ProgressLog = ProgressLog
        self.EMOTION_FINDER_KEY = EMOTION_FINDER_KEY
        self.FORCE_CANCEL_LIMIT = FORCE_CANCEL_LIMIT
        self.stats = stats
        self.stop_on_next_video = stop_on_next_video
        self.rate = 1
        self.total_frames = 0
        self.successful_frames = 0
    
    def on_new_confirmed_video(self, video_object=None, video_data=None, start_time=None):
        # keep cache of last faces seen encase the frame is the same as the previous frame
        self.face_data = []
    
    def pick_frame(self, frame_index, each_frame):
        return pick_frame(self, frame_index, each_frame)

    def pick_next_frame(self, current_frame_index):
        self.total_frames += 1
        
        # check for a happy person
        at_least_one_happy_person = True
        for each in self.face_data:
            most_likely = each.get(self.EMOTION_FINDER_KEY, {}).get("most_likely", None)
            probability_of_happy = each.get(self.EMOTION_FINDER_KEY, {}).get("probabilities", {}).get("happy",0)
            if most_likely == "happy" or probability_of_happy > 0.5:
                at_least_one_happy_person = True
                break
        
        if just_got_a_happy_frame(self):
            self.successful_frames += 1
        
        return current_frame_index + 1
        
