import glob
import json
from hashlib import sha256

with open('latexjs.json', 'rt') as f:
    manifest = json.load(f)

for app_path in glob.glob('./apps/*'):
    print(app_path)
    with open(app_path, 'rb') as f:
        contents = f.read()
        app_name = app_path.split('./apps/')[-1]
        manifest['apps'][app_name] = {
            'sha256': sha256(contents).hexdigest(),
        }

print(manifest)

with open('latexjs.json', 'wt') as f:
    json.dump(manifest, f, indent=1, sort_keys=True)
