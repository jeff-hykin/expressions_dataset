require 'atk_toolbox'
require_relative Info.paths["ruby_tools"] # corrisponds to the "(path)" inside info.yaml file

first_argument, *other_arguments = Console.args

# give yourself permission to execute the executable
if OS.is?(:unix)
    system("chmod", "u+x", $paths['(executables)']/first_argument)
end

exec( $paths['(executables)']/first_argument, *other_arguments )