from include import include
include("../../toolbox/tools.py", globals())
include("./processsor_process.py", globals())

class ProgressLogClass(ProcessorProcess):
    def on_new_video(self, video_object, video_data, start_time=None):
        if not start_time:
            self.video_start_time = time.time()
        else:
            self.video_start_time = start_time
            
    
    def on_new_frame(self, frame_index, frame, face_frame_count, approximate_frame_count):
        if frame_index % 100 == 0:
            # newline every 13 outputs
            end = "" if frame_index % 1300 == 0 else "\n"
            estimated_time = ""
            if frame_index != 0:
                how_long_it_took = time.time() - self.video_start_time
                time_per_frame = how_long_it_took / frame_index
                estimated_time = int(time_per_frame * approximate_frame_count)
                estimated_time = Console.color(f"{round(estimated_time/60,1)}",foreground="magenta")
                estimated_time = Console.color(f"ETA: ",foreground="white") + estimated_time + Console.color(f"min ",foreground="white")
            percent_completion = (frame_index/approximate_frame_count)*100
            Console.start_color("blue")
            Console.progress(percent=percent_completion, additional_text=estimated_time+f"{face_frame_count} face-frames")
            Console.stop_color()

ProgressLog = ProgressLogClass()