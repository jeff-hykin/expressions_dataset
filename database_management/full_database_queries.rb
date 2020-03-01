require 'atk_toolbox'
require_relative './database_api.rb'


local_database = EzDatabase.new(Info["parameters"]["database"]["url"])
local_database["dummyKey1"] = "test value #1" 
local_database["dummyKey2"] = "test value #2" 
puts local_database.all