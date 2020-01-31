from pathlib import Path
from os.path import join, dirname
exec(Path(join(dirname(__file__), '..', 'toolbox', 'tools.py')).read_text())

# if main program then print output
if __name__ == "__main__":
    video_id = sys.argv[1]
    frame_time = sys.argv[2]
    frame_path = sys.argv[3]
    video = Video(path=f"{dirname(__file__)}/{video_id}", id=video_id)
    video.download()
    video.get_frame(frame_time, frame_path)