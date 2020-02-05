from toolbox.tools import Image, json, sys

# if main program then print output
if __name__ == "__main__":
    face_locations = Image(sys.argv[1]).find_faces()
    print(json.dumps(face_locations))