FROM latexjs/thintexlive
# 1. Get hold of the latest sources for texlive 2016.
RUN wget http://mirror.ox.ac.uk/sites/ctan.org/systems/texlive/Source/texlive-20160523b-source.tar.xz && \
	tar xJvf texlive-20160523b-source.tar.xz && \
    mkdir texlive_binary_build && cd ./texlive_binary_build && \
    ../texlive-*-source/configure \
        --without-x \
        --disable-shared \
        --disable-all-pkgs \
        --enable-pdftex \
        --enable-bibtex \
        --enable-native-texlive-build && make
# 2. Build the binaries for pdftex/bibtex for real. The compilation
# process of pdftex etc uses some of these binaries, so we make them
# natively so we can provide them below.
RUN cd ./texlive_binary_build/texk/web2c && make pdftex && make bibtex
# 3. Now attemt to make an emscripten build of pdftex - we know this
# will fail without the native binaries...
RUN mkdir texlive_emscripten_build && cd ./texlive_emscripten_build && \
    EMCONFIGURE_JS=0 emconfigure ../texlive-*-source/configure \
        --without-x \
        --disable-shared \
        --disable-all-pkgs \
        --enable-pdftex \
        --enable-bibtex \
        --enable-native-texlive-build CC=emcc CFLAGS='-DELIDE_CODE -O3'
RUN cd ./texlive_emscripten_build && EMCONFIGURE_JS=0 emconfigure make
RUN cd ./texlive_emscripten_build/texk/web2c && emmake make pdftex; exit 0
# 4. Copy in the binaries from above and rebuild, this time we will succeed.
RUN cd /app/texlive_binary_build/texk/web2c/ && \
    cp ctangle tangle tie pdftex-pool.c /app/texlive_emscripten_build/texk/web2c/ && \
    cd /app/texlive_emscripten_build/texk/web2c/ && \
    chmod 777 ctangle tangle tie pdftex-pool.c && \
    cd /app/texlive_binary_build/texk/web2c/web2c/ && \
    cp fixwrites splitup web2c /app/texlive_emscripten_build/texk/web2c/web2c/ && \
    cd /app/texlive_emscripten_build/texk/web2c/web2c/ && \
    chmod 777 fixwrites splitup web2c
RUN cd ./texlive_emscripten_build/texk/web2c && emmake make pdftex \
        CC=emcc CFLAGS='-DELIDE_CODE -O3 --profiling-funcs' \
        -o tangle -o tie -o web2c -o pdftex-pool.c
RUN cd ./texlive_emscripten_build/texk/web2c && emmake make bibtex \
        CC=emcc CFLAGS='-DELIDE_CODE -O3 --profiling-funcs' \
        -o tangle -o tie -o web2c -o pdftex-pool.c
# All that's left to do is the final compile for both pdflatex.js, bibtex.js and kpsewhich.js.
COPY pre.js latex.js latexjs.json latexmk_config.pl demo.tex ./
RUN cp ./texlive_emscripten_build/texk/web2c/pdftex pdftex.bc && \
    emcc -v --memory-init-file 0 -O3 --profiling-funcs \
    -s TOTAL_MEMORY=134217728 -s INVOKE_RUN=1 \
    --pre-js pre.js -o pdflatex.js pdftex.bc && \
    \
    cp ./texlive_emscripten_build/texk/web2c/bibtex bibtex.bc && \
	emcc -v --memory-init-file 0 -O3 --profiling-funcs \
    -s TOTAL_MEMORY=134217728 -s INVOKE_RUN=1 \
    --pre-js pre.js -o bibtex.js bibtex.bc && \
    \
    cp ./texlive_emscripten_build/texk/kpathsea/kpsewhich kpsewhich.bc && \
    emcc -v --memory-init-file 0 -O3 --profiling-funcs \
    -s INVOKE_RUN=1 \
    --pre-js pre.js -o kpsewhich.js kpsewhich.bc && \
    \
    rm pdftex.bc bibtex.bc  kpsewhich.bc pre.js
# Test everything is working.
RUN node pdflatex.js --version && \
    node pdflatex.js -synctex=1 -interaction=nonstopmode -output-format pdf demo.tex && \
    node bibtex.js --version && \
    node kpsewhich.js --version && \
    rm -rf demo.* /root/.latexjs
# Clear up all the build dirs (we don't need them)
# TODO We will squash all this to keep it compact.
RUN rm -rf texlive-*-source* texlive_binary_build texlive_emscripten_build
# Tidy up the build apps into their own dir.
RUN mkdir apps && mv latex.js pdflatex.js bibtex.js kpsewhich.js latexmk_config.pl ./apps/ && \
    cp ./texlive/texmf-dist/scripts/latexmk/latexmk.pl ./apps/
COPY build_manifest.py ./
RUN python build_manifest.py && rm build_manifest.py
