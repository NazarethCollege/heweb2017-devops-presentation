FROM phusion/baseimage:0.9.20

# These packages are useful for web applications.  This installs
# basic functionality for webpack and typescript. 

# Update the apt repository metadata so apt-get works and then install common packages
RUN apt-get update && apt-get install -y \    
    # Install the node package manager, used later to get JavaScript dependencies
    npm && \
    
    # This symlink is necessary because some programs look for node in the wrong location
    ln -s /usr/bin/nodejs /usr/bin/node && \

    # Finally install packages using npm
    npm install -g \      

    # Webpack & loaders
    webpack@"<1.14" \
    style-loader@"<0.14" \ 
    css-loader@"<0.26" \
    ts-loader@"<0.9" \
    sass-loader@"<4.1" \
    url-loader@"<0.6" \                  
    file-loader@"<0.12.0" \      
    extract-text-webpack-plugin@"<1.2" \
    html-webpack-plugin@"<2.31" \

    # TypeScript dependencies
    typings@"<1.5" \
    typescript@"2.2.2" \
    node-sass@"<3.11" \      
    
    # React libraries
    react@"<15.7.0" \
    react-dom@"<15.7.0" \

    # Third-party libraries
    isotope-layout@"<3.1.0" \
    isotope-packery@"<2.2.0" \
    lodash@"<4.18" \
    d3@"<4.11.0"

RUN add-apt-repository ppa:gophers/archive && apt update && \
    apt-get install -y \
    
    # Used to download golang packages
    git \
    # Go will host the eventual website and will scrape instagram for data
    golang-1.8-go

# The command above is all one statement because it saves space, look at the Docker union file system and layers for more information.

ADD usr /usr
ADD etc /etc

ARG version

RUN echo "INSTAMAP_VERSION=${version}" > /etc/environment && \
    echo "GOPATH=/workspace/src/backend/vendor" >> /etc/environment && \
    chmod +x /etc/environment

ENTRYPOINT ["/usr/local/bin/entrypoint"]
CMD ["start"]