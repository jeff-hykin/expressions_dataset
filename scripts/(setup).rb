require 'atk_toolbox'
require_relative Info.paths["ruby_tools"] # corrisponds to the "(path)" inside info.yaml file

Console.ok("Hey, just FYI glf(git large file) is required\nhttps://git-lfs.github.com/\n\n#{"If you clone the repo without glf things will break\n".red}")

# keep a log of the current abs path of your project
# this is needed for starting up docker instances
project_path = FS.absolute_path($info.folder)
FS.write(project_path, to: $paths["project_dir_file"])

# 
# build all the docker images
# 
for each in FS.list_files($paths["dockerfiles"])
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