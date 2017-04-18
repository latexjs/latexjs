import glob
import json
from hashlib import sha256
import os

# 1. Load the manifest (which has the texlive version set)
with open('latexjs.json', 'rt') as f:
    manifest = json.load(f)

print('Bundling for texlive version {}'.format(manifest['texlive']['version']))

# 2. Set the checksum for the current texlive version.
thinfs_db_path = os.path.join('./texlive', manifest['texlive']['version'], 'thinfs_db.json')
with open(thinfs_db_path, 'rb') as f:
    contents = f.read()
    manifest['texlive']['sha256'] = sha256(contents).hexdigest()

# 3. Set the checksum for each app.
for app_path in glob.glob('./apps/*'):
    print(app_path)
    with open(app_path, 'rb') as f:
        contents = f.read()
        app_name = app_path.split('./apps/')[-1]
        manifest['apps'][app_name] = {
            'sha256': sha256(contents).hexdigest(),
        }
        # the version of latexmk to be download and used is platform
        # specific, see https://github.com/latexjs/latexmk
        if app_name == 'latexmk.exe':
            manifest['apps'][app_name]['platforms'] = ['win32']
        if app_name == 'latexmk.pl':
            manifest['apps'][app_name]['platforms'] = ['linux', 'darwin', 'freebsd']

print(manifest)

with open('latexjs.json', 'wt') as f:
    json.dump(manifest, f, indent=1, sort_keys=True)
