with open('thinfs_helper.js', 'rt') as f:
    helper_src = f.readlines()

lines_quoted = ['"{}\\n"'.format(line.rstrip().replace(r'\n', r'\\n')).replace(r'\r', r'\\r')
                for line in helper_src]
to_insert = ' + \n'.join(lines_quoted)

print(to_insert)

with open('pre.js', 'rt') as f:
    pre_src = f.read()

with open('pre.js', 'wt') as f:
    f.write(pre_src.replace('"%%HELPER_JS_SRC%%"', to_insert))
