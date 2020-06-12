require 'atk_toolbox'
require_relative Info.paths["ruby_tools"] # corrisponds to the "(path)" inside info.yaml file


# now try running the thing
first_argument, *other_arguments = Console.args
executable = Console.path_for(first_argument) || first_argument

# update the pythonpath
ENV["PYTHONPATH"] = "#{ENV["PYTHONPATH"]}:#{Info.folder}"
# update the actual path
ENV["PATH"] = "#{Info.folder/"project_bin"}:#{ENV["PATH"]}"

exec(executable, *other_arguments)