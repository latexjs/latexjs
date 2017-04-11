#### Latexjs

A tiny portable Latex compiler toolkit.


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
