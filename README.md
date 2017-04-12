# Latexjs (BETA)

Latexjs is a complete, cross-platform, self-contained, LaTeX compile toolchain, whose only external dependency is a `node` interpreter.

There is no large monolithic latex distribution to install - Latexjs dynamically downloads **only the files files required for compilation** and stores them in a local cache.

Here's the steps for getting going on any machine (Mac, Windows, or Linux) with `node` available:

1. Download [`pdflatex.js`](http://texlive.latexjs.org/apps/pdflatex.js) and [`bibtex.js`](http://texlive.latexjs.org/apps/bibtex.js)
2. Use these tools exactly as you would normally use `pdflatex` and `bibtex`. For instance, to do a first compilation of a `main.tex` file to PDF, try:
```
node pdflatex.js -synctex=1 -interaction=nonstopmode -output-format pdf main.tex
```
3. The exact files required from a complete texlive install will be downloaded to a `~/.latexjs` cache. For my thesis, that's about 35MB.
4. That's it. Latexjs will only download new files if they are required (i.e. you compile a different document which uses a new package).

## FAQ

#### How does this work?

Latexjs uses Emscripten to compile TeXLive tools like `pdflatex` and `bibtex` to `asm.js`, a subset of javascript that modern interpreters can run at close to native speeds. 

Emscripten also provides a virtual file system for the compiled binary to run in, which can be controlled. Latexjs uses a custom Emscripten file system called `THINFS`, which handles all file system requests that the TeXLive binaries try to make to the texlive installation folder. `THINFS` dynamically downloads new files as required when a `fs.open` command is intercepted.

#### Surely this can't work for everything a full proper TeXLive install would work for?

The running binary is oblivious to the `THINFS` caching filesystem layer, so we can guarantee full compatibility with a complete texlive install. If something doesn't work with `pdflatex.js` that does work with `pdflatex` from TeXLive, please raise an issue, **because it is a bug**.

#### Why make this?

LaTeX can be a bit of a pain to get going with on a machine. Generally speaking it involves downloading a Latex distribution, of which there are a few, although the big three tend to be:

- MikiTeX (Windows)
- MacTeX (macOS)
- TeXLive (Linux)

These distributions have installers, and the way they need to be installed is platform specific. In general they are large monolithic downloads, and are a bit of a pain to keep up to date. `Latexjs` provides a simpler solution that works the same on any platform.

A particularly compelling use case is using `Latexjs` within an [Electron](https://electron.atom.io/) app, where an up to date version of `node` is guaranteed to be available.


#### Benchmarks

```
time node ./pdftex.js -synctex=1 -interaction=nonstopmode -output-format pdf /app/demo.tex
```

```
real    0m2.064s
user    0m1.964s
sys     0m0.120s
```
If built with `--memory-init-file 1`:
```
real    0m2.005s
user    0m1.896s
sys     0m0.128s
```

```
time ./texlive/bin/x86_64-linux/pdflatex -synctex=1 -interaction=nonstopmode -output-format pdf /app/demo.tex
```
```
real    0m0.260s
user    0m0.220s
sys     0m0.040s
```
8x. ouch.

With a larger file (a 20 page paper of mine)
```
time node ./pdftex.js -synctex=1 -interaction=nonstopmode -output-format pdf main.tex
```
```
real    0m4.213s
user    0m4.072s
sys     0m0.176s
```

```
time ./texlive/bin/x86_64-linux/pdflatex -synctex=1 -interaction=nonstopmode -output-format pdf main.tex
```
```
real    0m0.583s
user    0m0.528s
sys     0m0.052s
```
So we are about a factor of 7x slower...

And on a much larger document (my thesis):

```
real	0m6.890s
user	0m6.683s
sys	0m0.478s
```

```
real	0m2.640s
user	0m1.307s
sys	0m0.360s
```

which is 3.2x slower.

This suggests that actually the warm up of the JIT is a significant factor - the longer we run for, we amortise this cost and we approach a 3x perf penalty.



#### Deployment

```
docker pull latexjs/server
docker stop latexjs
docker rm latexjs
docker run --name=latexjs --restart=always -d -p 80:80 latexjs/server
```
or
```
docker pull latexjs/server && docker stop latexjs && docker rm latexjs && docker run --name=latexjs --restart=always -d -p 80:80 latexjs/server
```
