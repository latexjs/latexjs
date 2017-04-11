with open('downloader.js', 'rt') as f:
    downloader_src = f.readlines()


lines_quoted = ['"{}\\n"'.format(line.rstrip().replace(r'\n', r'\\n')).replace(r'\r', r'\\r')
                for line in downloader_src]
to_insert = ' + \n'.join(lines_quoted)

print(to_insert)

with open('pre.js', 'rt') as f:
    pre_src = f.read()

with open('pre.js', 'wt') as f:
    f.write(pre_src.replace('"_INSERT_DOWNLOADER_JS_SRC_"', to_insert))
