
# 
# ez_database api
# 
# this file should stay independent of this specific project and should eventually go into a ruby gem
require 'net/http'
require 'json'
require 'uri'

class EzDatabase
    def initialize(url)
        @url = url
    end
    
    def all()
        self.request(url: "#{@url}/all")
    end
    
    def get(key)
        self.request(url: "#{@url}/get")
    end
    
    def set(key, value)
        self.request(url: "#{@url}/set")
    end

    def delete(key)
        self.request(url: "#{@url}/delete")
    end
    
    def size()
        self.request(url: "#{@url}/size")
    end
    
    def keys()
        self.request(url: "#{@url}/keys")
    end
    
    def find(query)
        self.request(url: "#{@url}/find", send: query)
    end
    
    def eval(key, args)
        self.request(url: "#{@url}/eval", send: {key: key.to_s, args: args})
    end
    
    def [](key)
        return self.get(key)
    end
    
    def []=(key, value)
        return self.set(key, value)
    end
    
    def json_post(url, hash)    
        uri = URI(url)
        req = Net::HTTP::Post.new(uri, 'Content-Type' => 'application/json')
        req.body = hash.to_json
        res = Net::HTTP.start(uri.hostname, uri.port) do |http|
            http.request(req)
        end
        return res
    end
    
    def handle_response(value)
        data = JSON.parse(value.body)
        value = data["value"]
        error = data["error"]
        exists = data["exists"]
        if error != nil
            raise <<~HEREDOC
                
                
                Error from server: #{error}
            HEREDOC
        end
        return value
    end
    
    def request(url:nil, send:nil)
        if send == nil
            send = {}
        end
        return self.handle_response(self.json_post(url, send))
    end
end