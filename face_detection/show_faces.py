from pathlib import Path
from os.path import join, dirname
exec(Path(join(dirname(__file__),'./tools.py')).read_text())

# if main program then print output
if __name__ == "__main__":
    image = Image(sys.argv[1])
    image.with_facial_bounding_boxes().show()