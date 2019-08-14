require 'atk_toolbox'
require 'nokogiri'
require 'open-uri'

# this gets its value from the info.yaml file
path_to_urls = Info['paths']['all_urls']

def get_video_ids_for(url)
    return Hash[ Nokogiri::HTML.parse(open(url).read).css('*').map{ |each| each['href'] =~ /^\/watch\?v=(.+)/ && $1 }.compact.collect{ |item| [item, {}] } ]
end

def get_full_url(video_id)
    "https://www.youtube.com/watch?v=" + video_id
end

# just ids to random youtube videos
urls = JSON.load(FS.read(path_to_urls))

# create some threads for grabbing urls
threads = []
for each in 1..20
    threads.push Thread.new {
        loop do
            # pick a random video
            random_video_id = urls.keys.sample
            new_urls = get_video_ids_for(get_full_url(random_video_id))
            # add all it's urls to the main list
            urls.merge!(new_urls) { |key, v1, v2| v1 }
        end
    }
end

# create a thread for occasionally saving data to a file
threads.push Thread.new {
    loop do
        # wait a bit before writing to disk
        sleep 15
        # overwrite the file
        FS.write(urls.to_json, to: path_to_urls)
    end
}


# end after there are 1 million urls
# print out the number of urls once every few seconds
number_of_urls = urls.keys.size
until number_of_urls > 1_000_000
    sleep 10
    number_of_urls = urls.keys.size
    puts number_of_urls
end
