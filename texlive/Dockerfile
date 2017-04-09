FROM latexjs/emscripten
COPY profile.input .
RUN wget http://mirror.ctan.org/systems/texlive/tlnet/install-tl-unx.tar.gz && \
    mkdir -p texlive && \
	tar xzvf install-tl-unx.tar.gz && \
    cd ./install-tl-*/ && \
    ./install-tl -profile /app/profile.input && \
    cd .. && rm -rf profile.input ./install-tl-*
