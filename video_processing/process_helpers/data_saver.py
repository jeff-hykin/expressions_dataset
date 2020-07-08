from include import include
include("../../toolbox/tools.py", globals())
include("./processsor_process.py", globals())

class DataSaverClass(ProcessorProcess):
    global SAVE_EACH_VIDEO_TO_FILE, SAVE_TO_DATABASE, FACE_FINDER_KEY, PROCESS_KEY
    
    def on_new_video(self, video_object, video_data, start_time=None):
        self.video_object = video_object
        self.video_data = video_data
    
        if SAVE_TO_DATABASE:
            self.video_data["messages"]["running_processes"].append(PROCESS_KEY)
            self.video_object["messages", "running_processes"] = self.video_data["messages"]["running_processes"]
    
    def save_frame(self, frame_index, face_data):
        # save to variable (later written to file)
        if SAVE_EACH_VIDEO_TO_FILE:
            self.video_data["frames"][frame_index] = self.video_data["frames"].get(frame_index, {})
            self.video_data["frames"][frame_index][FACE_FINDER_KEY] = face_data
        # save the data to databse
        if SAVE_TO_DATABASE:
            self.video_object["frames", frame_index, FACE_FINDER_KEY] = face_data

    def on_completed_video(self):
        # get processes from database
        self.video_data["messages"]["running_processes"] = self.video_object["messages", "running_processes"]
        # remove this process since its finished
        self.video_data["messages"]["running_processes"] = [ each for each in self.video_data["messages"]["running_processes"] if each != PROCESS_KEY ]
        # set the data on the database
        self.video_object["messages", "running_processes"] = self.video_data["messages"]["running_processes"]
        
        # optionally save video data to file
        if SAVE_EACH_VIDEO_TO_FILE:
            FS.write(json.dumps(self.video_data), to=FS.join(paths["video_cache"], self.video_object.id+".json"))

DataSaver = DataSaverClass()