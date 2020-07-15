require 'atk_toolbox'
require_relative Info.paths["database_api"] # the (path) inside info.yaml 


local_database = EzDatabase.new(Info["parameters"]["database"]["url"])

puts local_database.size
# puts local_database["gZhHTIDOT8c", "frames", 0].to_yaml
# size_should_be = 494071
# puts local_database["8zvAqNsplUc"].to_yaml
# puts local_database.sample(5).to_yaml
# data = { _test_data: "deleteme" }
# puts local_database.merge("V47pFY9K4eg","basic_info", with: data)
# puts local_database.delete("V47pFY9K4eg","basic_info","_test_data")
# puts FS.write(local_database["V47pFY9K4eg","basic_info"].to_yaml, to:"./example.nosync.yaml")
# null_example = local_database["zn9vPzAZp3Y"].to_yaml
# face_example = local_database["ERMtBEgk9ls"].to_yaml

# find examples:
#     # { $in: [ "ALGOL", "Lisp" ] } # the list is an OR statement
#     # { $all: [ "ALGOL", "Lisp" ] } # the list is an AND statement
#     # { $size: 4 } # length of an array
#     # { "name.last": { $regex: /^N/ } }
#     # { $lt: new Date('1920-01-01') },
#     # { $gt: new Date('1920-01-01') },
#     # { $exists: false }
# puts local_database.find({ "related_videos" => { "$exists" => true} })

# puts "relative_videos_example is: #{relative_videos_example} "