require 'atk_toolbox'
require 'nokogiri'
require 'open-uri'

require_relative './get_video_frames'

# this gets its value from the info.yaml file
path_to_urls = Info['(project)']['(paths)']['all_urls']

def get_video_ids_for(url)
    return Hash[ Nokogiri::HTML.parse(open(url).read).css('*').map{ |each| each['href'] =~ /^\/watch\?v=([^\&]+)/ && $1 }.compact.collect{ |item| [item, {}] } ]
end

def get_full_url(video_id)
    "https://www.youtube.com/watch?v=" + video_id
end

def get_metadata_for(url)
    all_data = JSON.load(`youtube-dl -j '#{url}'`)
    return {
        duration: all_data["duration"],
        fps: all_data["fps"],
        height: all_data["height"],
        width: all_data["width"],
    }
end