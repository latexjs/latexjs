cd texlive && docker build . -t latexjs/texlive --squash && cd ..
cd latexjs && docker build . -t latexjs/latexjs --squash && cd ..
cd server  && docker build . -t latexjs/server  --squash && cd ..
