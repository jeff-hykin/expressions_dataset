require 'atk_toolbox'
require_relative Info.paths["database_api"] # the (path) inside info.yaml 


local_database = EzDatabase.new(Info["parameters"]["database"]["url"])
puts local_database.all