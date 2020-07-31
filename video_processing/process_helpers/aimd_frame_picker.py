import math
import include
include.file("../../toolbox/tools.py", globals())
include.file("./data_saver.py", globals())
include.file("./process_log.py", globals())
pick_frame = include.file("./base_picker_function.py").pick_frame
just_got_a_happy_frame = include.file("./base_picker_function.py").just_got_a_happy_frame

class AimdFramePickerClass():
    
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
        self.rate = 32 # reset to 1 frame per sec assuming video is 32fps

    def pick_frame(self, frame_index, each_frame):
        return pick_frame(self, frame_index, each_frame)
    
    def pick_next_frame(self, current_frame_index):
        self.total_frames += 1
        
        if just_got_a_happy_frame(self):
            self.successful_frames += 1
            # decrease quickly
            self.rate = math.ceil(self.rate/2)
        else:
            # increase slowly
            self.rate = self.rate + 1
        
        # cap self.rate (don't skip more than 30 min chunks)
        if self.rate > 100000: # 30min of 60fps footage
            self.rate = 100000
        
        return current_frame_index + self.rate