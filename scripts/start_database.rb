require 'atk_toolbox'
require_relative Info.paths["ruby_tools"] # corrisponds to the "(path)" inside info.yaml file

name_of_docker_database_container = "database"
docker_image = LocalDocker.new(name_of_docker_database_container)

# ensure the folder exists
FS.touch_dir($paths['database_data'])
# perform a kind of work-around for windows
system(*[
    "docker",
    "run",
    "-it",  # interactive
    "--rm", # remove it after its done
    # which port
    ["--publish", "#{PARAMETERS["database"]["port"]}:3000" ],
    # mount the database files
    ["--volume",   $paths['database_data'] + ":/data/db" ],
    ["--volume",   $paths['database_server'] + ":/project" ],
    # which image to use
    docker_image.image_name
].flatten)