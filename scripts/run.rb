require 'atk_toolbox'
$info = Info.new # load the info.yaml

docker = $info['(project)']['docker']
interactive = ' -it ' if Console.args.include?("--interactive")

arg1, *other_args = Console.args
if arg1 == 'url_collector'
    image_id = docker['executables']['url_collector']['image_id']
    system "docker run --rm #{interactive} #{docker['volume']} #{image_id} ./automated_downloading/url_collector.rb "+Console.make_arguments_appendable(other_args)
else
    raise <<-HEREDOC.remove_indent
        
        
        Run command #{arg1} not recognized
    HEREDOC
end
