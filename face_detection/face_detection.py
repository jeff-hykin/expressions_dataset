from pathlib import Path
from os.path import join, dirname
exec(Path(join(dirname(__file__),'./tools.py')).read_text())

# if main program then print output
if __name__ == "__main__":
    image = cv.imread(sys.argv[1])
    print(json.dumps(faces_for(image)))

# if (len(faces)):
    # (x, y, w, h) = faces[0]
    # face = image[y:y + h, x:x + w]
    # cv.rectangle(image, (x, y), (x + w, y + h), (0, 255, 0), 2)
    # final_face = cv.resize(face, (300, 300), cv.INTER_CUBIC)
    # input_face = final_face.astype(np.float32)
    # input_face = input_face / 255.0
    # input_face = np.expand_dims(input_face, axis=0)
    