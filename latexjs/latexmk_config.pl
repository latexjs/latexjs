use FindBin;
$ljsdirname = $FindBin::Bin;
$pdflatex = "node ${ljsdirname}/pdflatex.js %O %S";
$bibtex = "node ${ljsdirname}/bibtex.js %O %B";
$kpsewhich = "node ${ljsdirname}/kpsewhich.js %S";
