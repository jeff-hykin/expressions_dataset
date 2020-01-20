require 'atk_toolbox'

$info = Info.new

def generate_ignore(name)
    filepath = $info['(ignore_files)'][name]['filepath']
    should_ignore = $info['(ignore_files)'][name]['should_ignore']
    FS.write(should_ignore.join("\n"), to: filepath )
    yield
    FS.delete(filepath)
end

# 
# url collector
# 
generate_ignore('url_collector') do
    puts "building url_collector"
    url_image_id = `docker build --network=host -f "#{FS.basename $info.paths['url_collector_dockerfile']}" .`.chomp.gsub(/[\s\S]*Successfully built (.+)/, '\1')
    puts "    url_collector: image: #{url_image_id.blue} "
end


# DOCKER_FILE_NAME="ruby.dockerfile"
# ADD_CURRENT_DIR="-v \"$PWD\":\"code\""
# builtin cd ./thingys || echo ''

# # TODO: run command needs to start in dir of code
# # TODO: pick a standard volume name
# # TODO: allow making dockerfile from anywhere

# # 
# # build an image varition
# # 
# FORWARD_ALL_PORTS="--network=host"
# IMAGE_ID="$(docker build $FORWARD_ALL_PORTS -f $DOCKER_FILE_NAME . | sub '[\s\S]*Successfully built (.+)' '\\1')"
# # start a interactive detached run, then exec into that run
# container="$(docker run -it -d --rm -v "$PWD":/code $IMAGE_ID /bin/bash)"
# echo "image: $IMAGE_ID"
# echo "container: $container"
# docker exec -it $container /bin/bash
# # commit any changes
# read -p "Do you want to save your changes?" -n 1 -r
# echo    # (optional) move to a new line
# if [[ ! $REPLY =~ ^[Yy][Ee]?[Ss]?$ ]]
#     docker commit $container $image
# then
#     echo "okay, changes wont be saved"
# fi
# # kill/end the detached process
# docker kill $container
# docker stop $container
# docker rm $container