# Latexjs (BETA)

Latexjs is a complete, cross-platform, self-contained, LaTeX compile toolchain, whose only external dependency is a `node` interpreter.

There is no large monolithic latex distribution to install - Latexjs dynamically downloads **only the files files required for compilation** and stores them in a local cache.

Here's the steps for getting going on any machine (Mac, Windows, or Linux) with `node` available:

1. Download [`pdflatex.js`](http://texlive.latexjs.org/apps/pdflatex.js) and [`bibtex.js`](http://texlive.latexjs.org/apps/bibtex.js)
2. Use these tools exactly as you would normally use `pdflatex` and `bibtex`. For instance, to do a first compilation of a `main.tex` file to PDF, try:
```
node pdflatex.js -synctex=1 -interaction=nonstopmode -output-format pdf main.tex
```
3. The exact files required from a complete up-to-date TeX Live install will be downloaded to a `~/.latexjs` cache from the Latexjs server. For my thesis, that's about 35MB.
4. That's it. Latexjs will only download new files if they are required (i.e. you compile a different document which uses a new package).

## FAQ

#### How does this work?

Latexjs uses Emscripten to compile TeX Live tools like `pdflatex` and `bibtex` to `asm.js`, a subset of javascript that modern interpreters can run at close to native speeds. 

Emscripten also provides a virtual file system for the compiled binary to run in, which can be controlled. Latexjs uses a custom Emscripten file system called `THINFS`, which handles all file system requests that the TeX Live binaries try to make to the TeX Live installation folder. `THINFS` dynamically downloads new files as required when a `fs.open` command is intercepted.

#### Surely this can't work for everything a full proper TeX Live install would work for?

The running binary is oblivious to the `THINFS` caching filesystem layer, so we can guarantee full compatibility with a complete TeX Live install. If something doesn't work with `pdflatex.js` that does work with `pdflatex` from TeX Live, please raise an issue, **because it is a bug**.

#### OK, but there must be some limitations?

Here's everything I am aware of where behavior would differ from native equivalents:

1. **All files to be processed need to be under the current working directory**. We mount the current working directory inside the Emscripten virtual file system - trying to access above that (`../`) won't work. We can work on fixing this.

That's it for now.

#### How's the performance?

Currently performance is anywhere for [3x-8x slower than native alternatives](./PERFORMANCE.md).
We haven't focused on optimization yet, and are confident that we can lower that somewhat.

#### Why make this?

LaTeX can be a bit of a pain to get going with on a machine. Generally speaking it involves downloading a Latex distribution, of which there are a few, although the big three tend to be:

- MikTeX (Windows)
- MacTeX (macOS)
- TeX Live (Linux)

These distributions have installers, and the way they need to be installed is platform specific. In general they are large monolithic downloads, and are a bit of a pain to keep up to date. `Latexjs` provides a simpler solution that works the same on any platform.

A particularly compelling use case is using `Latexjs` within an [Electron](https://electron.atom.io/) app, where an up to date version of `node` is guaranteed to be available.


## Deployment

LatexJS is built in a series of Docker images that can be found on [our Docker Hub repo](https://hub.docker.com/r/latexjs/). The final image to run the server is [`latexjs/server`](https://hub.docker.com/r/latexjs/server/). Deployment looks like this:
```
docker run --name=latexjs --restart=always -d -p 80:80 latexjs/server
```
And a one liner for updating:
```
docker pull latexjs/server && docker stop latexjs && docker rm latexjs && docker run --name=latexjs --restart=always -d -p 80:80 latexjs/server
```
