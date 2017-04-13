#### Benchmarks
We haven't yet focused on trying to make Latexjs fast. Here's some initial benchmarks:

```
time node ./pdflatex.js -synctex=1 -interaction=nonstopmode -output-format pdf /app/demo.tex
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
time node ./pdflatex.js -synctex=1 -interaction=nonstopmode -output-format pdf main.tex
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



#### Preliminary WASM results

See the WASM branch for how I build a version using WASM. Have to use bleeding edge node build, see https://github.com/latexjs/latexjs/issues/1

Firstly a quick cf with pdftex on Linux

```
time ~/Dropbox/latexjs/bin/node pdflatex.js -synctex=1 -interaction=nonstopmode -output-format pdf main.tex
```
```
real    0m1.870s
user    0m3.300s
sys     0m0.156s
```

```
time pdflatex -synctex=1 -interaction=nonstopmode -output-format pdf main.tex
```
```
real    0m0.525s
user    0m0.476s
sys     0m0.044s
```
3.56x.

However, I notice the start up is quite slow:
```
time ~/Dropbox/latexjs/bin/node pdflatex.js --version
```
```
real    0m0.907s
user    0m2.328s
sys     0m0.136s
```

```
time pdflatex --version
```
```
real    0m0.005s
user    0m0.004s
sys     0m0.000s
```
Ouch, a full second startup penalty..,

`thinfs_db.json` is pretty big, how expensive is loading that? I cut it down to a minimal version (one record)
```
real    0m0.579s
user    0m2.004s
sys     0m0.104s
```
Much better! This implies keeping a small cache `thinfs_db` file could save 0.3s..., which would bring us closer to 3x perf delta.