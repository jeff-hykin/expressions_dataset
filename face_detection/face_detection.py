from pathlib import Path
from os.path import join, dirname
exec(Path(join(dirname(__file__), '..', 'toolbox', 'tools.py')).read_text())

# if main program then print output
if __name__ == "__main__":
    face_locations = Image(sys.argv[1]).find_faces()
    print(json.dumps(face_locations))