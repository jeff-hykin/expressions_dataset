require 'atk_toolbox'
require_relative Info.paths["database_api"] # the (path) inside info.yaml 


local_database = EzDatabase.new(Info["parameters"]["database"]["url"])
size_should_be = 494071

null_example = local_database["zn9vPzAZp3Y"].to_yaml
face_example = local_database["ERMtBEgk9ls"].to_yaml
relative_videos_example = local_database["EYVjZHJu9Ns"].to_yaml

puts "relative_videos_example is: #{relative_videos_example} "