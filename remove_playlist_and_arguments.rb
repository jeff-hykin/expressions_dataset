require 'atk_toolbox'
path_to_urls = Info["paths"]["all_urls"]
all_urls = JSON.load(FS.read(path_to_urls))

keys = all_urls.keys.dup
keys.map!{ |each| each.sub(/(.+?)\&.+/, '\1')}
all_urls = {}
for each in keys
    all_urls[each] = {}
end

FS.write(all_urls.to_json, to: path_to_urls)
exit