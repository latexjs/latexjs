FROM ubuntu:16.04
RUN apt-get update && \
    apt-get install --no-install-recommends --no-install-suggests -y \
        build-essential \
        cmake \
        nodejs \
        npm \
        python2.7 \
        wget \
        && rm -rf /var/lib/apt/lists/* && \
    ln -s /usr/bin/nodejs /usr/bin/node
WORKDIR app
COPY profile.input .
RUN wget http://mirror.ctan.org/systems/texlive/tlnet/install-tl-unx.tar.gz && \
    mkdir -p texlive && \
	tar xzvf install-tl-unx.tar.gz && \
    cd ./install-tl-*/ && \
    ./install-tl -profile /app/profile.input && \
    cd .. && rm -rf profile.input ./install-tl-*
COPY build_raw_stats.js build_thinfs_db.py /app/
RUN mkdir /app/build_thinfs_db/ && \
    cd /app/build_thinfs_db && mv ../build_raw_stats.js ../build_thinfs_db.py . && \
    npm install glob && node build_raw_stats.js && python build_thinfs_db.py && \
    cd /app/ && mv ./build_thinfs_db/thinfs_db.json . && rm -rf ./build_thinfs_db && \
    mv texlive thinfs && mkdir -p texlive/2016 && mv thinfs thinfs_db.json texlive/2016/
