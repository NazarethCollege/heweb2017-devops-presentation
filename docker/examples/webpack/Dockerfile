FROM ubuntu:16.04

RUN apt-get update && \
    apt-get install -y \
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
    
    # TypeScript dependencies
    typings@"<1.5" \
    typescript@"2.2.2" \
    node-sass@"<3.11"         
    
ADD usr /usr
ENTRYPOINT [ "/usr/local/bin/entrypoint" ]

VOLUME [ "/opt/webpack" ]