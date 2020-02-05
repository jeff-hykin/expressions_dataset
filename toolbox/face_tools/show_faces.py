import toolbox.tools

# if main program then print output
if __name__ == "__main__":
    image = Image(sys.argv[1])
    image.with_facial_bounding_boxes().show()