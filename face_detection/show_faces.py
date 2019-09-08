from pathlib import Path
from os.path import join, dirname
exec(Path(join(dirname(__file__),'./tools.py')).read_text())

# if main program then print output
if __name__ == "__main__":
    green_color = (0, 255, 0)
    img = cv.imread(sys.argv[1])
    face_boxes = faces_for(img)
    add_boxes_to(img, face_boxes)
    show_img(img)