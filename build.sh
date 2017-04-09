cd emscripten && docker build . -t latexjs/emscripten && cd ..
cd texlive && docker build . -t latexjs/texlive && cd ..
cd thintexlive && docker build . -t latexjs/thintexlive && cd ..
cd pdftex-js && docker build . -t latexjs/pdftex.js && cd ..
cd latexjs && docker build . -t latexjs/latexjs && cd ..
