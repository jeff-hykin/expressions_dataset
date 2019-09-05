require 'atk_toolbox'
require 'nokogiri'
require 'open-uri'
require 'statistics2'

# this gets its value from the info.yaml file
path_to_urls = Info.paths['all_urls']

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

class Numeric
    def percent
        return self/100.0
    end
end

def confidence_interval(total_num_of_trys, num_of_successes, confidence:0.95)
    return 0 if total_num_of_trys == 0
    
    p_hat                     = 1.0*num_of_successes / total_num_of_trys
    # num_of_negative_events    = total_num_of_trys - num_of_successes
    # positive_deviation        = num_of_successes * ((1 - p_hat) ** 2)
    # negative_deviation        = num_of_negative_events * ((0 - p_hat) ** 2)
    # variance                  = (positive_deviation + negative_deviation) / (total_num_of_trys - 1)
    # sample_standard_deviation = Math.sqrt(variance)
    # estimated_stdev           = sample_standard_deviation / Math.sqrt(total_num_of_trys)
    allowable_error           = 1 - confidence
    allowable_error_per_side  = allowable_error / 2
    one_sided_confidence      = 1 - allowable_error_per_side
    
    z                   = Statistics2.pnormaldist(one_sided_confidence)
    z_squared_per_event = z*z / total_num_of_trys
    main_p_hat          = p_hat             + z_squared_per_event/2
    inverse_p_hat       = p_hat*(1-p_hat)   + z_squared_per_event/4
    
    top_part    = main_p_hat - z * Math.sqrt(inverse_p_hat/total_num_of_trys)
    bottom_part = 1 + z_squared_per_event
    lower_bound = top_part / bottom_part
    difference  = p_hat - lower_bound
    upper_bound = difference + p_hat
    return [lower_bound, upper_bound]
end

# 
# Frame grab huristic
# 
# the job of this function is to do one of three things
# 1. report failure (reject a video)
# 2. report success (accept a video)
# 3. ask for more data (uncertain)
# this could be used to help minimize the number of frame grabs/network requests
fail_succeed_or_try_again = ->(total_number_of_frames, number_of_frames_with_recognized_faces) do
    face_display_time = 75.percent
    decision_buffer   = 5.percent * face_display_time
    
    lower_bound, upper_bound = confidence_interval(total_number_of_frames, number_of_frames_with_recognized_faces, confidence: 95.percent)
    # if mostly confident that faces are visible
    if lower_bound > face_display_time - decision_buffer
        return :succeed
    # if 95% confident that faces are visible for less than ~70% of the time 
    elsif upper_bound < face_display_time + decision_buffer
        return :fail
    else
        return :try_again
    end
end


# the purpose of this program is to take a url of a video and return keyframes from it as pictures
# it does this without downloading the whole video first

require 'selenium-webdriver'
require 'active_support/all' # this allows for time durations like 1.seconds and/or 2.days
# this part of the code was derived from https://blog.francium.tech/object-pool-design-pattern-when-and-how-to-use-one-5790fb3e5a93
def get_html(url)
    browser = Selenium::WebDriver.for :chrome
    browser.navigate.to url  
    html = browser.page_source
    browser.quit
    return html
end

def html_from_browser(url)
    browser = BrowserPool.instance.get_browser
    browser.navigate.to url
    html = browser.page_source
    BrowserPool.instance.release!(browser)
    return html
end

class BrowserPool
    include Singleton
    MAX_POOL_SIZE = 25
    def initialize
        @browsers = SizedQueue.new(MAX_POOL_SIZE)
        MAX_POOL_SIZE.times{ @browsers.push(new_browser) }
    end
    def get_browser
        @browsers.pop
    end
    def release!(browser)
        @browsers.push(browser)
    end
    private
    def new_browser
        options = Selenium::WebDriver::Chrome::Options.new(args: ['--headless'])
        options.add_argument('--ignore-certificate-errors')
        options.add_argument('--disable-translate')
        options.add_argument("--load-extension=#{Info.paths["adblock"]}")
        driver = Selenium::WebDriver.for :chrome, options: options
    end
end

class Video
    @@videos = nil
    @@frame_height = 1125
    @@path_to_videos = Info.paths["all_urls"]
    # 
    # class methods
    # 
    def self.load_all()
        # load all of the collected urls
        videos = JSON.load(FS.read(@@path_to_videos))
        # remove all entrys without metadata
        videos = videos.delete_if {|key, value| value.keys.size == 0}
        for each_key, each_value in videos
            videos[each_key] = Video.new(each_key, each_value)
        end
        @@videos = videos
    end
    
    def self.random
        Video.load_all if @@videos == nil
        return @@videos.values.sample
    end
    
    def self.[](video_id)
        Video.load_all if @@videos == nil
        return @@videos[video_id]
    end
    
    def self.frame_height
        @@frame_height
    end
    
    # 
    # constructor
    # 
    def initialize(video_id, metadata)
        @id = video_id
        @url = "https://www.youtube.com/watch?v=" + video_id
        @metadata = metadata
    end
    
    # 
    # methods
    # 
    
    def url
        return @url
    end
    
    def id
        return @id
    end
    
    def duration
        return @metadata["duration"]
    end
    
    def save_metadata
        videos = JSON.load(FS.read(@@path_to_videos))
        videos[@id] = @metadata
        FS.save(videos, to: @@path_to_videos, as: :json)
    end
    
    def metadata
        @metadata
    end
    
    # example usage
    # a_video.get_frame(at: 20.seconds, save_it_to: "sample.png")
    def get_frame(at: nil, save_it_to: filepath, timeout: 10, cycle_time: 5)
        # part of this code was derived from https://blog.francium.tech/take-screenshot-using-ruby-selenium-webdriver-b18802822075
        browser = BrowserPool.instance.get_browser
        # load the video at that specific time
        browser.navigate.to(@url)

        # create a helper 
        wait_for_elements = ->(*args) do
            elements = []
            loop do
                elements = browser.find_elements(*args)
                if elements.size() > 0
                    if elements[0].displayed?() and elements[0].enabled?()
                        break
                    end
                else
                    timeout -= cycle_time
                    if timeout < 0
                        debug_browser(browser, "couldn't find elements #{args.inspect} in browser")
                    end
                    sleep cycle_time
                end
            end
            elements
        end

        # resize the page
        browser.manage.window.resize_to(width = (@@frame_height/9)*16, height = @@frame_height) # uses 16:9 aspect ratio for the width

        # try to press the play button
        play_button = wait_for_elements[:class, "ytp-play-button"][0]
        begin
            play_button.click
        # when something is in the way of the play button, fail
        rescue => exception
            BrowserPool.instance.release!(browser)
            return 
        end
        sleep 0.5

        # try to press the skip-advertisement button, and wait until the advertisement is done
        if (ad_button = browser.find_elements(:class, "ytp-ad-preview-container")).size > 0
            log "    waiting on advertisement"
        end
        while (ad_button = browser.find_elements(:class, "ytp-ad-preview-container")).size > 0
            # this redundant assignment actually prevents this error 
            # https://stackoverflow.com/a/54230335/4367134 
            ad_button = browser.find_elements(:class, "ytp-ad-skip-button-text")
            if ad_button.size > 0
                begin
                    ad_button[0].click
                rescue => exception
                    # ignore errors
                end
            end
        end

        # make the video fullscreen (actual fullscreen doesn't work, so this is a makeshift version)
        browser.execute_script <<-HEREDOC
            let videoElement = document.getElementsByClassName("video-stream")[0]
            // move the video to the top
            document.body.insertBefore(videoElement, document.body.childNodes[0])
            // fix the video to the top
            videoElement.style.position = "fixed"
            // put the video on top of everything else
            videoElement.style.zIndex = "999999999"
            // resize it to fullscreen
            videoElement.style.width = "#{width}px"
            videoElement.style.height = "#{height}px"
            // add a black background
            let blackBackground = document.createElement("div")
            blackBackground.style.width = "100vw"
            blackBackground.style.height = "100vh"
            blackBackground.style.position = "fixed"
            blackBackground.style.background = "black"
            blackBackground.style.zIndex = "99999"
            document.body.insertBefore(blackBackground, document.body.childNodes[1])
            // pause the video
            videoElement.pause()
        HEREDOC
        # wait for the page to load
        sleep 0.5
        
        # create a helper
        waitForVideoToLoad = ->(seconds, timeout: 10, interval: 0.05) do
            # go to the designated time
            browser.execute_script <<-HEREDOC
                let videoElement = document.getElementsByClassName("video-stream")[0]
                videoElement.currentTime = #{seconds}
                window.videoHasStartedPlaying = false
                videoElement.play().then(_=>{
                    window.videoHasStartedPlaying = true
                    videoElement.pause()
                })
            HEREDOC
            
            # loop until video playback started
            while browser.execute_script("return window.videoHasStartedPlaying") != true
                timeout -= interval
                if timeout < 0
                    # save a screenshot at that point
                    debug_browser(browser, "error while waiting for video to load new timestamp")
                end
                sleep interval
            end
            # cleanup just encase
            browser.execute_script("window.videoHasStartedPlaying = false")
        end
        
        # if a is a single value
        if at.is_a?(Numeric)
            # go to the designated time
            waitForVideoToLoad[at.to_i]
            # save a screenshot at that point
            FS.makedirs(FS.dirname(save_it_to))
            browser.save_screenshot(save_it_to)
            BrowserPool.instance.release!(browser)
            return [save_it_to]
        # if at is a list of values
        elsif at.is_a?(Array)
            filepaths = []
            for each in at
                log "        getting frame: #{each}"
                # go to the designated time
                waitForVideoToLoad[each.to_i]
                # save a screenshot at that point
                FS.makedirs(FS.dirname(save_it_to))
                filepath = FS.dirname(save_it_to)/FS.basename(save_it_to,".*") + each.to_s + FS.extname(save_it_to)
                filepaths << filepath
                browser.save_screenshot(filepath)
            end
            BrowserPool.instance.release!(browser)
            return filepaths
        end
    end
end

def debug_browser(browser, error_message)
    html = browser.execute_script("return document.body.outerHTML;")
    browser.save_screenshot('selenium_page_with_error.png')
    # if OS.is?("mac")
    #     -"open selenium_page_with_error.png"
    # end
    FS.write(html, to: './selenium_page_with_error.html')
    raise error_message
end