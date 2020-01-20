require 'atk_toolbox'

$info = Info.new # load the info.yaml

docker = $info['(project)']['docker']
interactive = ' -it ' if Console.args.include?("--interactive")

if Console.args[0] == 'url_collector'
    image_id = docker['executables']['url_collector']['image_id']

    # start detached run
    container_id = `docker run -t -d --rm #{docker['volume']} #{image_id}`.chomp
    # put user into the already-running process, let the make whatever changes they want
    system("docker exec -it #{container_id} /bin/sh")
    # once they exit that, ask if they want to save those changes
    if Console.yes?("would you like to save those changes?")
        # save those changes to the container
        system "docker commit #{container_id} #{image_id}"
    end
    
    # kill the detached process (otherwise it will continue indefinitely)
    system( "docker kill #{container_id}", err:"/dev/null")
    system( "docker stop #{container_id}", err:"/dev/null")
    system( "docker rm #{container_id}", err:"/dev/null")
end