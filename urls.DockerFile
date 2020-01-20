FROM ruby:2.5

RUN gem install nokogiri atk_toolbox statistics2
RUN apt-get update && apt-get install -y curl
RUN curl -L https://yt-dl.org/downloads/latest/youtube-dl -o /usr/local/bin/youtube-dl
RUN chmod a+rx /usr/local/bin/youtube-dl

WORKDIR /project

ENTRYPOINT [ "ruby" ]