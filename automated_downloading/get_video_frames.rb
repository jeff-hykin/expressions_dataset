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
        Selenium::WebDriver.for :chrome, options: options
    end
end


# example usage
# get_frame(from: "https://www.youtube.com/watch?v=6005JSrES34", at: 20.seconds, save_it_to: "sample.png")
def get_frame(from: nil, at: nil, save_it_to: filepath)
    # part of this code was derived from https://blog.francium.tech/take-screenshot-using-ruby-selenium-webdriver-b18802822075
    browser = BrowserPool.instance.get_browser
    # load the video at that specific time
    browser.navigate.to(from + "?t=#{at.to_i}")

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
                sleep 5
            end
        end
        elements
    end

    # resize the page
    browser.manage.window.resize_to(width = 2000, height = (width/16.0)*9) # uses 16:9 aspect ratio

    # try to press the play button
    play_button = wait_for_elements[:class, "ytp-play-button"][0]
    play_button.click
    sleep 1

    # try to press the skip-advertisement button, and wait until the advertisement is done
    while (ad_button = browser.find_elements(:class, "ytp-ad-preview-container")).size > 0
        ad_button[0].click
    end

    # make the video fullscreen
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
    HEREDOC
    # wait for the page to load
    sleep 0.5
    # go to the designated time
    browser.execute_script <<-HEREDOC
        let videoElement = document.getElementsByClassName("video-stream")[0]
        videoElement.currentTime = #{at.to_i}
    HEREDOC
    # save a screenshot at that point
    browser.save_screenshot(save_it_to)
end
