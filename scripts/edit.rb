require 'atk_toolbox'
require_relative Info.paths["ruby_tools"] # corrisponds to the "(path)" inside info.yaml file

first = Console.args.shift
LocalDocker.new(first).edit(*Console.args)