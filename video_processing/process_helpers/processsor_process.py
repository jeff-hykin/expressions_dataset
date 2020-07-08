class ProcessorProcess:
    # called once
    def __init__(self):
        pass
    
    # called once at the begining of video processing
    def on_new_video(self, video_object, video_data):
        pass
    
    # call once per frame 
    def on_new_frame(self, frame_index, frame):
        pass
    
    def on_completed_video(self,):
        pass