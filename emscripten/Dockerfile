FROM ubuntu:16.04
RUN apt-get update && apt-get install -y --no-install-recommends \
        python2.7 default-jre build-essential cmake wget git unzip texinfo && \
    ln -s /usr/bin/python2.7 /usr/bin/python 
WORKDIR app
RUN wget https://s3.amazonaws.com/mozilla-games/emscripten/releases/emsdk-portable.tar.gz && \
    tar -xvzf emsdk-portable.tar.gz && rm emsdk-portable.tar.gz && \
    cd emsdk-portable && ./emsdk update
RUN cd emsdk-portable && ./emsdk install latest
RUN cd emsdk-portable && ./emsdk activate latest
ENV PATH /app/emsdk-portable:/app/emsdk-portable/clang/e1.37.9_64bit:/app/emsdk-portable/node/4.1.1_64bit/bin:/app/emsdk-portable/emscripten/1.37.9:$PATH
RUN emcc --version