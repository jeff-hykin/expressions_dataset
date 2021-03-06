require 'atk_toolbox'

puts "\n\n========="
puts "Installing ruby dependencies"
puts "========="

# install all the ruby dependencies
system "gem install bundler"
system "bundle"

require_relative Info.paths["ruby_tools"] # corrisponds to the "(path)" inside info.yaml file


# keep a log of the current abs path of your project
# this is needed for starting up docker instances
project_path = FS.absolute_path($info.folder)
FS.write(project_path, to: $paths["project_dir_file"])


# 
# check for docker
# 
if !Console.has_command "docker"
    Console.ok <<~HEREDOC
        
        
        #{"=========".red}
        #{"It looks like you don't have docker installed/running".red}
        I'll try to run the setup anyways, but it is unlikely to work
        #{"=========".red}
    HEREDOC
end

# 
# build all the docker images
# 
for each in [ $paths["dockerfiles"]/"database.DockerFile" ]
    puts ""
    puts "Building docker file: #{FS.basename(each).to_s.green}"
    puts ""
    *folders, name, ext = FS.path_pieces(each)
    # build each dockerfile
    LocalDocker.new(name).build(
        $paths["dockerfiles"]/"#{name}.DockerFile",
        files_to_include:[
            "project_bin",
            *FS.list_files
        ],
    )
end

puts "#".green
puts "# setup complete".green
puts "#".green