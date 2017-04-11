var fs = require('fs')
var cp = require('child_process')
var PATH = require('path')
var process = require('process')
var url = require('url')

// This is ridiculous, but we need a synchronous download, and it's seemingly
// not possible in the current node runtime - so we subprocess and wait on
// the completion of that.
function downloadSync(url, dest) {
  var x = cp.spawnSync(
    process.execPath,
    [PATH.resolve(__dirname, 'downloader.js'), url, dest],
    { stdio: 'inherit' }
    )
  if (x.status !== 0) {
    throw new Error('Unable to download required file ' + dest + ' exiting.')
  }
}

// download('http://mirror.ox.ac.uk/sites/ctan.org/systems/texlive/tlnet/install-tl-unx.tar.gz', 'test.tar.gz')

// Definition of THINFS - a fork of NODEFS that adds a caching
// layer.
var THINFS = {

    isWindows: false,
    verbose: false,

    // TODO how should this get invoked?
    staticInit: function(cacheDir, remoteURL, verbose) {
      THINFS.isWindows = !!process.platform.match(/^win/)
      THINFS.verbose = !!verbose
    },

    mount: function (mount) {
      if (THINFS.verbose) {
        console.log("Mounting THINFS")
      }

      // THINFS Requires extra information to work which we store
      // in the mountingNode.mount.ops object to be a good
      // Emscripten FS (I hope)...
      var opts = mount.opts
      opts.dbFilePath = PATH.join(opts.cacheDir, 'thinfs_db.json')
      opts.dbURL = url.resolve(opts.remoteURL, 'thinfs_db.json')

      if (!fs.existsSync(opts.cacheDir)) {
        if (THINFS.verbose) {
          console.log('Initializing THINFS cache at: ' + opts.cacheDir)
        }
        fs.mkdirSync(opts.cacheDir)
      }
      if (!fs.existsSync(opts.dbFilePath)) {
        if (THINFS.verbose) {
          console.log('No thinfs_db.json file: re-downloading...')
        }
        downloadSync(opts.dbURL, opts.dbFilePath)
      }

      opts.db = JSON.parse(fs.readFileSync(opts.dbFilePath, 'utf8'))

      // This is totally gross, but here we attach the mount.opts info to
      // the global THINFS object. Purely doing this to move fast for now,
      // should definitely re-evaluate this.
      if (THINFS.opts !== undefined) {
        throw new Error('Only one instance of THINFS can presently be mounted in an Emscripten app.')
      }
      THINFS.opts = opts

      assert(ENVIRONMENT_IS_NODE);
      return THINFS.createNode(null, '/', THINFS.getModeForDbPath(''), 0);
    },

    getMountOpts: function(node) {
      while (node.parent !== node) {
        node = node.parent
      }
      return node.mount.opts
    },

    pathInDBPartsReversed: function(node) {
      var parts = [];
      while (node.parent !== node) {
        parts.push(node.name);
        node = node.parent;
      }
      return {
        parts: parts,
        mountNode: node
      }
    },

    pathInDB: function(node) {
      var parts = THINFS.pathInDBPartsReversed(node).parts
      parts.reverse()
      return PATH.join.apply(null, parts)
    },

    pathInCache: function (node) {
      var x = THINFS.pathInDBPartsReversed(node)
      x.parts.push(x.mountNode.mount.opts.cacheDir)
      x.parts.reverse()
      var path = PATH.join.apply(null, x.parts)
      return path
    },

    synthesizeStat: function(stat, defaults) {
        var synthStat = {
          birthtime: new Date('2000'),
          atime: new Date('2000'),
          ctime: new Date('2000'),
          mtime: new Date('2000'),
          ino: 999
        }
        Object.keys(defaults).forEach(function(k){
          synthStat[k] = defaults[k]
        })
        Object.keys(stat).forEach(function(k){
          synthStat[k] = stat[k]
        })
        return synthStat
    },

    // mirrors fs.lstatSync, but using the local stat database.
    lstatSync: function(dbPath) {
      var stat = THINFS.opts.db.records[dbPath]
      if (stat !== undefined) {
        return THINFS.synthesizeStat(stat, THINFS.opts.db.default.values)
      } else {
        throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
      }
    },

    createNode: function (parent, name, mode, dev) {
      if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
      }
      var node = FS.createNode(parent, name, mode);
      node.node_ops = THINFS.node_ops;
      node.stream_ops = THINFS.stream_ops;
      return node;
    },

    getModeForDbPath: function (dbPath) {
      var stat = THINFS.lstatSync(dbPath)
      return stat.mode;
    },

    node_ops: {

      getattr: function(node) {
        var dbPath = THINFS.pathInDB(node)
        if (THINFS.verbose) {
          console.log('----------- THINFS.node_ops.getattr: ' + dbPath)
        }
        return THINFS.lstatSync(dbPath)
      },

      lookup: function (parent, name) {
        var dbPath = PATH.join2(THINFS.pathInDB(parent), name)
        if (THINFS.verbose) {
          console.log('----------- THINFS.node_ops.lookup: ' + dbPath)
        }
        var mode = THINFS.getModeForDbPath(dbPath)
        return THINFS.createNode(parent, name, mode)
      },

      readdir: function(node) {
        var path = THINFS.pathInCache(node);
        if (THINFS.verbose) {
          console.log('----------- THINFS.node_ops.readdir: ' + path)
        }
        try {
          return fs.readdirSync(path);
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code]);
        }
      },

      readlink: function(node) {
        var path = THINFS.pathInCache(node)
        if (THINFS.verbose) {
          console.log('----------- THINFS.node_ops.readlink: ' + path)
        }
        try {
          path = fs.readlinkSync(path);
          path = NODEJS_PATH.relative(NODEJS_PATH.resolve(node.mount.opts.root), path);
          return path;
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code]);
        }
      },

      // THINFS is strictly read-only as far as Emscripten is concerned.
      setattr: function () { throw new FS.ErrnoError(ERRNO_CODES.EROFS) },
      mknod: function () { throw new FS.ErrnoError(ERRNO_CODES.EROFS) },
      rename: function () { throw new FS.ErrnoError(ERRNO_CODES.EROFS) },
      unlink: function() { throw new FS.ErrnoError(ERRNO_CODES.EROFS) },
      rmdir: function() { throw new FS.ErrnoError(ERRNO_CODES.EROFS) },
      symlink: function() { throw new FS.ErrnoError(ERRNO_CODES.EROFS) }

    },

    stream_ops: {

      open: function (stream, bailOnError) {
        var path = THINFS.pathInCache(stream.node);
        if (THINFS.verbose) {
          console.log('----------- THINFS.stream_ops.open: ' + path)
          if (bailOnError) {
            console.log('----------- THINFS.stream_ops.open: will error if there is no file present locally.')
          }
        }
        try {
          if (FS.isFile(stream.node.mode)) {
            stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags));
          }
        } catch (e) {
          if (bailOnError === undefined) {
            // Perhaps this file just isn't cached yet..
            // We have permission to try and download if we can.
            var parts = THINFS.pathInDBPartsReversed(stream.node).parts
            parts.push('texlive')
            parts.reverse()
            var fileURL = url.resolve(THINFS.opts.remoteURL, parts.join('/'))
            console.log('----------- File missing in local cache, triggering download')
            downloadSync(fileURL, path)
            console.log('----------- Download successfully completed.')
            // go again, but only once!
            return THINFS.stream_ops.open(stream, true)
          }
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code]);
        }
      },

      close: function (stream) {        
        if (THINFS.verbose) {
          console.log('----------- THINFS.stream_ops.close: ' + THINFS.pathInCache(stream.node))
        }
        try {
          if (FS.isFile(stream.node.mode) && stream.nfd) {
            fs.closeSync(stream.nfd);
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code]);
        }
      },

      read: function (stream, buffer, offset, length, position) {
        if (THINFS.verbose) {
          console.log('----------- THINFS.stream_ops.read: ' + THINFS.pathInCache(stream.node))
        }
        if (length === 0) return 0; // node errors on 0 length reads

        // FIXME this is terrible.
        var nbuffer = new Buffer(length);
        var res;
        try {
          res = fs.readSync(stream.nfd, nbuffer, 0, length, position);
        } catch (e) {
          throw new FS.ErrnoError(ERRNO_CODES[e.code]);
        }
        if (res > 0) {
          for (var i = 0; i < res; i++) {
            buffer[offset + i] = nbuffer[i];
          }
        }
        return res;
      },

      llseek: function (stream, offset, whence) {
        if (THINFS.verbose) {
          console.log('----------- THINFS.stream_ops.llseek: ' + THINFS.pathInCache(stream.node))
        }
        var position = offset;
        if (whence === 1) {  // SEEK_CUR.
          position += stream.position;
        } else if (whence === 2) {  // SEEK_END.
          if (FS.isFile(stream.node.mode)) {
            try {
              var stat = fs.fstatSync(stream.nfd);
              position += stat.size;
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES[e.code]);
            }
          }
        }

        if (position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }

        return position;
      },

      // THINFS is strictly read-only as far as Emscripten is concerned.
      write: function() { throw new FS.ErrnoError(ERRNO_CODES.EROFS) },
    }
}

var Module

if(typeof Module === "undefined") {
    Module = {}
}

if(typeof Module.preRun === "undefined") {
    Module.preRun = []
}

Module.preRun.push(
    function() {
        var os = require('os')
        var path = require('path')
        var process = require('process')
        var LJS_DEBUG = process.env.LJS_DEBUG == 1
        if (LJS_DEBUG) {
            console.log('----------- LATEXJS - PDFTEX -----------')
            console.log('LJS_DEBUG mode enabled. ')
            console.log('Welcome to the dirty underbelly of the world of Latexjs.')
        }
        var DEFAULT_LATEXJS_CACHE_DIR = path.resolve(os.homedir(), '.latexjs/')
        var DEFAULT_LATEXJS_REMOTE_URL = 'http://texlive.latexjs.org'
        var LATEXJS_CACHE_DIR
        var LATEXJS_REMOTE_URL

        if (LJS_DEBUG) {
          console.log('Checking for LATEXJS_CACHE_DIR and LATEXJS_REMOTE_URL env variables...')
        }

        if (process.env.LATEXJS_CACHE_DIR === undefined) {
          if (LJS_DEBUG) {
            console.log('NO LATEXJS_CACHE_DIR environment variable set - defaulting to ' + DEFAULT_LATEXJS_CACHE_DIR)
          }
          LATEXJS_CACHE_DIR = DEFAULT_LATEXJS_CACHE_DIR
        } else {
          LATEXJS_CACHE_DIR = process.env.LATEXJS_CACHE_DIR
        }

        if (process.env.LATEXJS_REMOTE_URL === undefined) {
          if (LJS_DEBUG) {
            console.log('NO LATEXJS_REMOTE_URL environment variable set - defaulting to ' + DEFAULT_LATEXJS_REMOTE_URL)
          }
          LATEXJS_REMOTE_URL = DEFAULT_LATEXJS_REMOTE_URL
        } else {
          LATEXJS_REMOTE_URL = process.env.LATEXJS_REMOTE_URL
        }

        if (LJS_DEBUG) {
          console.log('LATEXJS_CACHE_DIR: ' + LATEXJS_CACHE_DIR)
          console.log('LATEXJS_REMOTE_URL: ' + LATEXJS_REMOTE_URL)
        }
        THINFS.staticInit(LATEXJS_CACHE_DIR, LATEXJS_REMOTE_URL, LJS_DEBUG)

        if (process.env.KPATHSEA_DEBUG !== undefined) {
            console.log('Passing through KPATHSEA debug settings ' +
                        '(KPATHSEA_DEBUG=' + process.env.KPATHSEA_DEBUG + ')')
            ENV.KPATHSEA_DEBUG = process.env.KPATHSEA_DEBUG
        }

        // We completely work in the /app/ dir to avoid clashing with the emscripten root
        FS.mkdir('/app');

        // Trick the program into thinking it is pdflatex.
        // TODO we can probably avoid this hack...
        FS.createDataFile("/", Module['thisProgram'], "dummy for kpathsea", true, true)

        // We always mount a texlive distribution at /app/texlive/...
        FS.mkdir('/app/texlive')


        if (process.env.LJS_LOCAL_MOUNT !== undefined) {
          console.log('Avoiding THINFS and performing direct node mount of texlive')
          console.log('mounting texlive at ' + process.env.LJS_LOCAL_MOUNT)
          FS.mount(NODEFS, { root: process.env.LJS_LOCAL_MOUNT }, '/app/texlive')
        } else {
          // We mount texlive using the 'THINFS' File System.
          // This FS is specifically designed for Latexjs, and will dynamically pull down
          // individual files from the remote full install of texlive that Latexjs maintains.
          FS.mount(THINFS,
          {
            cacheDir: LATEXJS_CACHE_DIR,
            remoteURL: LATEXJS_REMOTE_URL
          }, '/app/texlive')
        }

        // Ensure that our wrapped pdftex binary finds the texlive distribution at /app/texlive/
        ENV.TEXMFCNF = '/app/texlive/:/app/texlive/texmf-dist/web2c/'
        ENV.TEXMFROOT= '/app/texlive'
        ENV.TEXMFLOCAL = '/app/texlive/texmf-local'
        ENV.TEXMFDIST= '/app/texlive/texmf-dist'
        ENV.TEXMFSYSVAR = '/app/texlive/texmf-var'
        ENV.TEXMFSYSCONFIG = '/app/texlive/texmf-config'
        ENV.TEXMFVAR = '/app/texlive/user-texmf-var'

        // We mount the current working directory at /app/working with a traditional
        // Node FS mount. Note that this means we can only compile documents under the CWD.
        FS.mkdir('/app/working')
        console.log('Mounting host working directory ' + require('path').resolve() + ' at /app/working')
        FS.mount(NODEFS, { root: '.' }, '/app/working')
        FS.chdir('/app/working')

    }
)

// Trick the program into thinking it is pdflatex.
// TODO we can probably avoid this hack...
Module['thisProgram'] = '/pdflatex'
