require 'atk_toolbox'
require_relative Info.paths["ruby_tools"] # corrisponds to the "(path)" inside info.yaml file

name_of_docker_database_container = "database"
docker_image = LocalDocker.new(name_of_docker_database_container)
docker_image.run(
    arguments: [],
    options:[
        :interactive,
        :remove_after_completion,
        :access_to_current_enviornment,
        setup_port = "--publish #{PARAMETERS["database"]["port"]}:3000 --publish 27017:27017",
    ]
)