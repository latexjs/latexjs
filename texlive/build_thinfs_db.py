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
from __future__ import division, print_function
from collections import deque, defaultdict, Counter
import json
from pprint import pprint
from hashlib import sha256
from datetime import datetime
import sys
from time import time
from os.path import join, isfile
from os import unlink
import gzip

def progress_bar_str(percentage, bar_length=20, bar_marker='=', show_bar=True):
    if percentage < 0:
        raise ValueError("percentage is not in the range [0, 1]")
    elif percentage > 1:
        percentage = 1
    if not isinstance(bar_length, int) or bar_length < 1:
        raise ValueError("bar_length must be an integer >= 1")
    if not isinstance(bar_marker, str) or len(bar_marker) != 1:
        raise ValueError("bar_marker must be a string of length 1")
    # generate output string
    if show_bar:
        str_param = "[%-" + str(bar_length) + "s] %d%%"
        bar_percentage = int(percentage * bar_length)
        return str_param % (bar_marker * bar_percentage, percentage * 100)
    else:
        return "%d%%" % (percentage * 100)


def print_dynamic(str_to_print):
    sys.stdout.write("\r{}".format(str_to_print.ljust(80)))
    sys.stdout.flush()

def print_progress(iterable, prefix='', n_items=None, offset=0,
                   show_bar=True, show_count=True, show_eta=True,
                   end_with_newline=True, min_seconds_between_updates=0.1):
    if n_items is None and offset != 0:
        raise ValueError('offset can only be set when n_items has been'
                         ' manually provided.')
    if prefix != '':
        prefix += ': '
        bar_length = 10
    else:
        bar_length = 20
    n = n_items if n_items is not None else len(iterable)

    timings = deque([], 100)
    time1 = time()
    last_update_time = 0
    for i, x in enumerate(iterable, 1 + offset):
        yield x
        time2 = time()
        timings.append(time2 - time1)
        time1 = time2
        remaining = n - i
        if time2 - last_update_time < min_seconds_between_updates:
            continue
        last_update_time = time2
        duration = datetime.utcfromtimestamp(sum(timings) / len(timings) *
                                             remaining)
        bar_str = progress_bar_str(i / n, bar_length=bar_length,
                                   show_bar=show_bar)
        count_str = ' ({}/{})'.format(i, n) if show_count else ''
        eta_str = (" - {} remaining".format(duration.strftime('%H:%M:%S'))
                   if show_eta else '')
        print_dynamic('{}{}{}{}'.format(prefix, bar_str, count_str, eta_str))

    # the iterable has now finished - to make it clear redraw the progress with
    # a done message. We also hide the eta at this stage.
    count_str = ' ({}/{})'.format(n, n) if show_count else ''
    bar_str = progress_bar_str(1, bar_length=bar_length, show_bar=show_bar)
    print_dynamic('{}{}{} - done.'.format(prefix, bar_str, count_str))

    if end_with_newline:
        print('')


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

print('Calculating digests and compressing...')
for path in print_progress(list(slim_stats)):
    full_path = join('/app/texlive/', path)
    if isfile(full_path):
        full_gz_path = full_path + '.gz'
        with open(full_path, 'rb') as f, gzip.open(full_gz_path, 'wb', compresslevel=9) as f_out:
            contents = f.read()
            slim_stats[path]['sha256'] = sha256(contents).hexdigest()
            f_out.write(contents)
        unlink(full_path)

with open('thinfs_db.json', 'wt') as f:
    json.dump({
        'records': slim_stats,
        'default': {
            'values': {k: v['value'] for k, v in most_common.items()},
            'counts': {k: v['count'] for k, v in most_common.items()}
        }
    }, f, indent=1, sort_keys=True)
