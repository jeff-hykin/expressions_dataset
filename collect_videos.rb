require 'atk_toolbox'

# this gets its value from the info.yaml file
path_to_urls = Info['paths']['all_urls']


def get_full_url(video_id)
    "https://www.youtube.com/watch?v=" + video_id
end

# make sure the size is less than 1Gb
while FS.size?(path_to_urls) < 1000000000
    # make a system call "node ./collect_urls.js urls.json"
    system("node", Info['paths']['collection_js'], path_to_urls)
    puts "Number Of Urls is: #{JSON.load(FS.read(path_to_urls)).keys.size}"
end
puts 'Url file is now larger than a gigabyte'