require 'atk_toolbox'
require_relative Info.paths["database_api"] # the (path) inside info.yaml 


local_database = EzDatabase.new(Info["parameters"]["database"]["url"])
size_should_be = 494071

null_example = local_database["zn9vPzAZp3Y"].to_yaml
face_example = local_database["ERMtBEgk9ls"].to_yaml
relative_videos_example = local_database["EYVjZHJu9Ns"].to_yaml

    # { $in: [ "ALGOL", "Lisp" ] } # the list is an OR statement
    # { $all: [ "ALGOL", "Lisp" ] } # the list is an AND statement
    # { $size: 4 } # length of an array
    # { "name.last": { $regex: /^N/ } }
    # { $lt: new Date('1920-01-01') },
    # { $gt: new Date('1920-01-01') },
    # { $exists: false }
puts local_database.find({ "related_videos" => { "$exists" => true} })

puts "relative_videos_example is: #{relative_videos_example} "