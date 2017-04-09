# This script takes `raw_stats.json` produced from the build_raw_stats.js
# script and prepares it into the format THINFS needs to operate.
#
# The produced file, `thinfs_db.json`, contains all the information need to
# mock the following filesystem calls:
#
# - `fs.lstatSync(path)`
# - `fs.readlinkSync(path)`
#
# Which are all that are required to implement the following Emscripen FS
# API calls:
#
# - `lookup(parent, name)`
# - `getattr(node)`
# - `readlink(node)`
#
# This is generally the minimum API need to actually get to an `open(stream)`
#  call, which can then locally cache required files before the
# `fs.openSync(path)` call.
from collections import defaultdict, Counter
import json
from pprint import pprint


def dict_without_keys(d, blacklisted_keys):
    return {k: v for k, v in d.items() if k not in blacklisted_keys}


def dict_with_values_not_most_common(d, most_common):
    return {k: v for k, v in d.items() if k not in most_common or most_common[k]['value'] != v}


# Access times and inode numbers can be synthesized on the client
BLACKLIST_KEYS_SET = {
    'atime',
    'mtime',
    'birthtime',
    'ctime',
    'ino'
}


with open('raw_stats.json', 'rt') as f:
    RAW_STATS = json.load(f)

stats = {k: dict_without_keys(v, BLACKLIST_KEYS_SET) for k, v in RAW_STATS.items()}

stats_counter = defaultdict(Counter)

for path, stat in stats.items():
    for key, val in stat.items():
        stats_counter[key][val] += 1

most_common = {k: {
    'value': v.most_common()[0][0],
    'count': v.most_common()[0][1]
} for k, v in stats_counter.items()}

for k in list(most_common.keys()):
    count = most_common[k]['count']
    if count < 100:
        print("forgetting '{}' from most_common (only has count of {})".format(k, count))
        del most_common[k]

pprint(most_common)

slim_stats = {
    p.split('/app/texlive/')[-1]: dict_with_values_not_most_common(stat, most_common)
    for p, stat in stats.items()
}
slim_stats[''] = slim_stats['/app/texlive']
del slim_stats['/app/texlive']


with open('thinfs_db.json', 'wt') as f:
    json.dump({
        'records': slim_stats,
        'default': {
            'values': {k: v['value'] for k, v in most_common.items()},
            'counts': {k: v['count'] for k, v in most_common.items()}
        }
    }, f, indent=1, sort_keys=True)
