FROM ubuntu:16.04

RUN apt-get update && \
    apt-get install -y \
    sudo \
    php7.0 \
    php7.0-zip \
    php7.0-mbstring \
    php7.0-dom   

ADD opt /opt
RUN php7.0 /opt/composer-installer.php --install-dir=bin --filename=composer 

ADD usr /usr
ENTRYPOINT [ "/usr/local/bin/entrypoint" ]

VOLUME [ "/srv" ]
EXPOSE 8080