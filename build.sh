cd emscripten && docker build . -t latexjs/emscripten && cd ..
cd texlive && docker build . -t latexjs/texlive && cd ..
cd thintexlive && docker build . -t latexjs/thintexlive && cd ..
cd latexjs && docker build . -t latexjs/latexjs:wasm && cd ..
cd server && docker build . -t latexjs/server && cd ..
