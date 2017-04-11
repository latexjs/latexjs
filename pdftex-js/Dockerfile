FROM latexjs/thintexlive
# First job - get hold of the latest sources for pdftex.
# For now we use the release tag on the SVN repo for 
# pdftex...but it seems this is basically a modified
# version of the texlive source tree to just build pdftex.
# As in future we will want to produce more binaries (e.g. bibtex)
# it may be worth moving to using texlive sources instead.
#
# Second job - build the binaries for pdftex for real. The compilation
# process of pdftex uses some of these binaries, and we can just provide
# them below rather than having to transpile more than nessessary.
RUN apt-get install subversion -y
RUN svn co svn://tug.org/pdftex/tags/1.40.17 && \
    mv ./1.40.17/source ./pdftex && rm -rf ./1.40.17 && \
    cp -r pdftex pdftex_binary_build && cd pdftex_binary_build && \
    ./build-pdftex.sh -C \
		--disable-all-pkgs \
		--enable-pdftex \
		--enable-static && \
    cd /app && mkdir pdftex_binaries && \
    cd /app/pdftex_binary_build/build-pdftex/texk/web2c/ && \
    cp ctangle tangle tie pdftex-pool.c /app/pdftex_binaries && \
    cd /app/pdftex_binary_build/build-pdftex/texk/web2c/web2c && \
    cp fixwrites splitup web2c /app/pdftex_binaries && \
    cd /app && rm -rf ./pdftex_binary_build

# We know that this initial attempt to configure will fail with an error something like:
#
#    WEBINPUTS=.:/app/pdftex/src/texk/web2c WEBINPUTS=.:/app/pdftex/src/texk/web2c TEXMFCNF=/app/pdftex/src/texk/web2c/../kpathsea ./tangleboot tangle tangle
#    warning: kpathsea: configuration file texmf.cnf not found in these directories: /app/pdftex/src/texk/web2c/../kpathsea.
#    ./tangleboot: fatal: web file `tangle.web' not found.
#    Makefile:8738: recipe for target 'tangle.p' failed
#
# but that's OK. We're going to re-run with the binaries taken from /app/pdftex_binaries
RUN cd pdftex && \
	EMCONFIGURE_JS=0 emconfigure ./build-pdftex.sh -C \
		--disable-all-pkgs \
		--enable-pdftex \
		--enable-static \
		CC=emcc CFLAGS='-DELIDE_CODE -O3'; exit 0

## Copy in the above binary components that we need and rebuild the relevent stages manually to get a working set of bytecode
RUN cd pdftex_binaries && \
    mv fixwrites splitup web2c /app/pdftex/build-pdftex/texk/web2c/web2c/ && \
    mv ctangle tangle tie pdftex-pool.c /app/pdftex/build-pdftex/texk/web2c/ && \
    rm -rf /app/pdftex_binaries && \
    cd /app/pdftex/build-pdftex/texk/web2c && \
        emmake make pdftex \
        CC=emcc CFLAGS='-DELIDE_CODE -O3 --profiling-funcs' \
        -o tangle -o tie -o web2c -o pdftex-pool.c && \
    cd /app/pdftex/build-pdftex/texk/kpathsea && make clean && \
        emmake make \
        CC=emcc CFLAGS='-DELIDE_CODE -O3 --profiling-funcs'

# This seems to fail as it goes beyond building the lib we expect for 1.40.17 of pdftex (doesn't in older version 1.40.11).
# The makefile then goes on to try and produce libp_a-openclose.o, which fails:
# 
#    emcc -DHAVE_CONFIG_H -I. -I/app/pdftex/src/texk/web2c/lib -I../w2c -I..  -DPTEX -I/app/pdftex/build-pdftex/texk/ptexenc -I/ap
#    p/pdftex/src/texk/ptexenc -I/app/pdftex/src/texk/web2c -I/app/pdftex/build-pdftex/texk -I/app/pdftex/src/texk -DNO_DEBUG  -Wi
#    mplicit -Wreturn-type -Wdeclaration-after-statement -Wno-unknown-pragmas -DELIDE_CODE -O3 --profiling-funcs -MT libp_a-opencl
#    ose.o -MD -MP -MF .deps/libp_a-openclose.Tpo -c -o libp_a-openclose.o `test -f 'openclose.c' || echo '/app/pdftex/src/texk/we
#    b2c/lib/'`openclose.c
#    /app/pdftex/src/texk/web2c/lib/openclose.c:12:10: fatal error: 'ptexenc/ptexenc.h' file not found
#    #include <ptexenc/ptexenc.h>
#             ^~~~~~~~~~~~~~~~~~~
#    1 error generated.
#    ERROR:root:compiler frontend failed to generate LLVM bitcode, halting
#    make: *** [libp_a-openclose.o] Error 1
#    Makefile:575: recipe for target 'libp_a-openclose.o' failed
#
# but we actually don't care as we already seem to have the lib we need - another safe ignore.
# TODO: we should figure out how to have this build cleanly though...
RUN cd /app/pdftex/build-pdftex/texk/web2c/lib && make clean && emmake make CC=emcc CFLAGS='-DELIDE_CODE -O3 --profiling-funcs'; exit 0

# We have all the bytecode objects we need ready - all that's left to do is the final compile.
COPY locateOBJs.sh pre.js downloader.js demo.tex ./
RUN cp pdftex/build-pdftex/texk/web2c/pdftex pdftex.bc && \
	OBJFILES=`./locateOBJs.sh` && echo Found following objects to compile $OBJFILES && \
	emcc -v --memory-init-file 0 -O3  --profiling-funcs \ 
    -s TOTAL_MEMORY=134217728 -s INVOKE_RUN=1 \
    --pre-js pre.js -o pdftex.js \
    $OBJFILES pdftex.bc && \
    rm locateOBJs.sh pdftex.bc pre.js
RUN node pdftex.js --version && \
    node pdftex.js -synctex=1 -interaction=nonstopmode -output-format pdf demo.tex && \
    rm -rf demo.* /root/.latexjs
    # LJS_DEBUG=1 LJS_LOCAL_MOUNT=/app/texlive/ node pdftex.js -synctex=1 -interaction=nonstopmode -output-format pdf demo.tex
