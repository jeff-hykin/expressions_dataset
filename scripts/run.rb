require 'atk_toolbox'
$info = Info.new # load the info.yaml

docker = $info['(project)']['docker']

def options(name)
    if Console.args.include?(name)
        Console.args.delete(name)
        return true
    end
end

interactive = ' -it ' if options("--interactive")
show_commands = ' -it ' if options("--show_commands")

arg1, *other_args = Console.args
if arg1 == 'url_collector'
    image_id = docker['executables']['url_collector']['image_id']
    command = "docker run --rm #{interactive} #{docker['volume']} #{image_id} ./automated_downloading/url_collector.rb "+Console.make_arguments_appendable(other_args)
    puts command if show_commands
    system command
else
    raise <<-HEREDOC.remove_indent
        
        
        Run command #{arg1} not recognized
    HEREDOC
end
