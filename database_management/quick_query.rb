require 'atk_toolbox'
require_relative Info.paths["database_api"] # the (path) inside info.yaml 


local_database = EzDatabase.new(Info["parameters"]["database"]["url"])
size_should_be = 494071

puts FS.write(local_database["yYMr4o7SAGc",].to_yaml, to:"./example.nosync.yaml")
null_example = local_database["zn9vPzAZp3Y"].to_yaml
face_example = local_database["ERMtBEgk9ls"].to_yaml

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