find pdftex/build-pdftex/texk/web2c/lib pdftex/build-pdftex/texk/kpathsea -name '*.o' | while read file; do 
    llvm-nm $file | grep main >/dev/null || echo $file
done
