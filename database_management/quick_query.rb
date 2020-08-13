require 'atk_toolbox'
require_relative Info.paths["database_api"] # the (path) inside info.yaml


local_database = EzDatabase.new(Info["parameters"]["database"]["url"])

puts local_database.size
# 
# all_labels = []
# # for all videos with frames, query their labels
# count = -1
# vids_with_frames = local_database.find({ "frames.0" => {"$exists"=>true}, "frames.1" => {"$exists"=>true} })
# for each in vids_with_frames
#     count += 1
#     puts "count is: #{count} "
#     begin
#         all_labels.push(local_database.custom("booleanHappyLabels", each))
#     rescue => exception
#         puts "exception is: #{exception} "
#     end
# end
# all_bools = all_labels.map(&:values).flatten
# class Array
#     def frequency
#         self.inject(Hash.new(0)) { |h,v| h[v] += 1; h }
#     end
#     def mean
#         self.sum / self.size.to_f
#     end
# end
# puts all_bools.frequency
# FS.write(all_labels.map{|each| freq = each.values.frequency; freq[1]/(freq[0]+freq[1]+0.0)}.to_yaml, to: "./freq.nosync.yaml")
# puts local_database.sample(1,{ "frames.0" => {"$exists"=>true} })
# puts local_database.sample(1,{ "frames.0" => {"$exists"=>true} })
# puts FS.write(local_database[ "fX3TcVJqOZE", "frames" ].to_yaml, to: "./frames.nosync.yaml")
# puts FS.write(, to: "./boolean_labels.nosync.yaml")
# puts FS.write(local_database.grab(search_filter: { "basic_info": { "$exists" => true }, "related_videos" => { "$exists": true }  }, return_filter: { "basic_info": 1 }).to_yaml, to:"./result.nosync" )
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
