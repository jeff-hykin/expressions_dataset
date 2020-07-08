from include import include
include("../../toolbox/tools.py", globals())
include("./data_saver.py", globals())
include("./process_log.py", globals())

face_cascade = cv.CascadeClassifier(paths['haarcascade_frontalface_default'])
def get_faces(image):
    face_dimensions = face_cascade.detectMultiScale(image, scaleFactor=1.1, minNeighbors=1, minSize=(100, 100), flags=cv.CASCADE_SCALE_IMAGE)
    cropped_faces = [ image[y:y + h, x:x + w] for x, y, w, h in face_dimensions ]
    return cropped_faces, face_dimensions

class AimdFramePickerClass():
    global EMOTION_FINDER_KEY, stats, stop_on_next_video
    
    def __init__(self, ):
        self.faces_exist = False
        self.previous_frame = None
        self.rate = 1
    
    def on_new_confirmed_video(self, video_object=None, video_data=None, start_time=None):
        self.face_data = []
        self.rate = 32 # reset to 1 frame per sec assuming video is 32fps

    def pick_frame(self, frame_index, each_frame, stats):
        """
        frame_index:
        .    starts off as None
        .    otherwise is an int of which frame was just provided
        each_frame:
        .   expects None if the index didn't exist in the video
        .   otherwise expects numpy array
        
        return:
        .   int, the index of the next frame it wants to evaluate
        .   return None if the video is completely processed
        """
        # start by asking for the first frame
        if type(frame_index) == type(None):
            return 0
        
        # once the final frame is found, simply stop
        if type(each_frame) == type(None):
            return None

        try:
            stats["total"]["frames_evaluated"] += 1
            
            # check for duplicate frames
            if np.array_equal(self.previous_frame, each_frame):
                DataSaver.save_frame(frame_index, self.face_data)
                # skip to the next frame
                return frame_index + 1
            else:
                self.previous_frame = each_frame
            
            face_frame_count = stats["local"]["face_frame_count"]
            ProgressLog.on_new_frame(
                frame_index,
                each_frame,
                show=f"face-frames:{face_frame_count} rate:{self.rate}"
            )
            
            # 
            # find faces
            # 
            start = time.time()
            # actual machine learning usage
            face_images, dimensions = get_faces(each_frame)
            self.faces_exist = len(face_images) != 0
            self.face_data = []
            stats["local"]["find_faces_duration"]     += time.time() - start
            stats["local"]["face_frame_count"]        += 1 if self.faces_exist else 0
            
            # 
            # record face_sequences
            # 
            # each sequence is a length-2 list, first element == start index, second element = end index
            # there is a (None, None) tuple that will often be trailing the end of stats["local"]["face_sequences"]
            most_recent_sequence = stats["local"]["face_sequences"][-1]
            sequence_was_started = most_recent_sequence[0] is not None
            if not self.faces_exist:
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
                self.face_data.append({
                    "x" : int(each_dimension[0]),
                    "y" : int(each_dimension[1]),
                    "width" : int(each_dimension[2]),
                    "height" : int(each_dimension[3]),
                    EMOTION_FINDER_KEY : get_emotion_data(preprocess_face(each_face_img)),
                })
                # round all the emotions up to ints
                probabilities = self.face_data[-1][EMOTION_FINDER_KEY]["probabilities"]
                for each_key in probabilities:
                    probabilities[each_key] = int(round(probabilities[each_key], 0))
            stats["local"]["find_emotion_duration"] += time.time() - start
            
            DataSaver.save_frame(frame_index, self.face_data) 

        except KeyboardInterrupt:
            print(f'\nGot the message, stopping on video completion\nNOTE: interrupt {FORCE_CANCEL_LIMIT - stop_on_next_video} more times to cause a force cancel')
            stop_on_next_video += 1
            # if the user says to end repeatedly
            if stop_on_next_video > FORCE_CANCEL_LIMIT:
                # stop immediately, causing partially bad data
                exit(0)
        
        return self.pick_next_frame(frame_index)
    
    def pick_next_frame(self, current_frame_index):
        if self.faces_exist:
            # decrease quickly
            self.rate = int((self.rate / 2) + 1)
        else:
            # increase slowly
            self.rate = self.rate + 1
        
        # cap self.rate (don't skip more than 30 min chunks)
        if self.rate > 100000: # 30min of 60fps footage
            self.rate = 100000
        
        return current_frame_index + self.rate
        

AimdFramePicker = AimdFramePickerClass()
