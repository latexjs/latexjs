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

LatexJS is built in a series of Docker images that can be found on [our Docker Hub repo](https://hub.docker.com/r/latexjs/). The final image to run the server is [`latexjs/server`](https://hub.docker.com/r/latexjs/server/). Deployment (and update) is handled with `docker-compose`:
```
docker-compose pull && docker compose down || docker-compose up -d
```

But first a little setup is needed (using DO one-click Docker 16.04)

#### 1. Setting up SSL

We use Docker + Let's Encrypt to initially get hold of a cert:

```
docker run -it --rm -p 443:443 -p 80:80 --name certbot -v "/etc/letsencrypt:/etc/letsencrypt" -v "/var/lib/letsencrypt:/var/lib/letsencrypt" certbot/certbot certonly
```

To renew:
```
docker run -it --rm -p 443:443 -p 80:80 --name certbot -v "/etc/letsencrypt:/etc/letsencrypt" -v "/var/lib/letsencrypt:/var/lib/letsencrypt" certbot/certbot renew && docker restart latexjs
```

#### 2. Setting up docker-compose
```
vim /usr/local/bin/docker-compose
```
Change version to `1.12`

And download the latest `docker-compose.yml`
```
wget https://github.com/latexjs/latexjs/raw/master/docker-compose.yml
```
Finally, edit `./.env` to contain the server prefix: 
```
SERVER_LOCATION=london
```

## Acknowledgments

A huge thank you to [texlive.js](https://github.com/manuels/texlive.js) who were the first to figure out how to Emscripten TeX Live binaries.

## Licensing

The code in this repository is BSD-licensed, see [LICENSE](./LICENSE). This code includes:

1. A collection of scripts for downloading and building TeX Live though Emscripten.
2. A custom Emscripten File System (`THINFS`), which is completely general purpose.

It does not include anything from TeX Live.

This code produces a TeX Live instance and a collection of Javascript files which are transpiled from TeX Live sources. These produced artifacts are licensed under the TeX Live licencing.
For details of this licensing, please see the [LICENSE.TL](http://texlive.latexjs.org/texlive/LICENSE.TL) and [LICENSE.CTAN](http://texlive.latexjs.org/texlive/LICENSE.CTAN) text files.

TL;DR (IANAL) - you can use my code (`THINFS`, these build scripts) under a BSD-license, but the produced files (e.g. `pdflatex.js`) are licensed under the TeX Live licencing.
