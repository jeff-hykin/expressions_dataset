from include import include
include("../../toolbox/tools.py", globals())

class ProgressLogClass:
    def on_new_video(self, each_video, video_data, video_count):
        self.approximate_frame_count = video_data["basic_info"]["duration"] * video_data["basic_info"]["fps"]
        print(
            Console.color(f"[video={video_count}][ approximate_frame_count:", foreground="green"),
            Console.color(self.approximate_frame_count, foreground="yellow"),
            Console.color(f"]", foreground="green"),
            Console.color(each_video.id)
        )
        
    def on_new_confirmed_video(self, video_object, video_data, start_time=None):
        if not start_time:
            self.video_start_time = time.time()
        else:
            self.video_start_time = start_time
    
    def on_new_frame(self, frame_index, frame, show=""):
        if frame_index % 2 == 0:
            estimated_time = ""
            if frame_index != 0:
                how_long_it_took = time.time() - self.video_start_time
                time_per_frame = how_long_it_took / frame_index
                estimated_time = int(time_per_frame * self.approximate_frame_count)
                estimated_time = Console.color(f"{round(estimated_time/60,1)}",foreground="magenta")
                estimated_time = Console.color(f"ETA: ",foreground="white") + estimated_time + Console.color(f"min ",foreground="white")
            percent_completion = (frame_index/self.approximate_frame_count)*100
            Console.start_color("blue")
            Console.progress(percent=percent_completion, additional_text=estimated_time+show)
            Console.stop_color()

ProgressLog = ProgressLogClass()