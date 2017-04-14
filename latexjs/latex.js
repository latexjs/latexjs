'use strict'
var cp = require('child_process')
var process = require('process')
var https = require('https')
var os = require('os')
var fs = require('fs')
var path = require('path')
var crypto = require('crypto')
var url = require('url')
var zlib = require('zlib')

var DEFAULT_SERVERS = [
    'https://london.latexjs.org',
    'https://sanfran.latexjs.org',
    'https://singapore.latexjs.org',
]

function mkdirRecursiveSync(dir, mode){
    try {
        fs.mkdirSync(dir, mode)
    }
    catch (e) {
        if(e.code === 'ENOENT'){
            mkdirRecursiveSync(path.dirname(dir), mode)
            mkdirRecursiveSync(dir, mode)
        } else {
            throw e
        }
    }
}

function callSelf(args, showStdOut) {
  var fullArgs = [__filename].concat(args)
  var opts = { encoding: 'utf8' }
  if (showStdOut) {
    opts.stdio = 'inherit'
  }
  var x = cp.spawnSync(process.execPath, fullArgs, opts)
  if (x.status !== 0) {
     throw new Error('Error calling latex.js: ' + x)
     process.exit(1)
  }
  return x.stdout
}

function download(url, dest, gz_file, sha256, callback) {
    console.log('  Downloading:')
    console.log('  ' + url + ' => ' + dest)
    if (sha256) {
        console.log('  SHA256 checksum: ' + sha256)
    }

    var destDir = path.dirname(dest)
    if (!fs.existsSync(path.dirname(dest))) {
        console.log('  Creating ' + destDir)
        mkdirRecursiveSync(destDir)
    }
    if (sha256 !== undefined) {
        var hash = crypto.createHash('sha256')
    }
    var file = fs.createWriteStream(dest)

    var request = https.get(url, function (response) {

        var totalLength = response.headers['content-length']
        var processedLength = 0
        
        var responseContent = response
        if (gz_file) {
            responseContent = response.pipe(zlib.createUnzip())
        }
        responseContent.pipe(file)

        file.on('finish', function () {
            console.log('')
            if (sha256 !== undefined) {
                var checksum = hash.digest('hex')
                if (checksum !== sha256) {
                    console.log('  ERROR - checksum does not match:')
                    console.log('    Expected: ' + sha256)
                    console.log('      Actual: ' + checksum)
                    console.log('  Clearing up compromised file...')
                    fs.unlink(dest, function () {
                        callback('Error: checksum failure.')
                    })
                    
                }
            }
            file.close(function (err) {
                if (err) {
                    console.log('  Error closing file: ' + err)
                }
                callback(err)
            })
        })

        response.on('data', function(d) {
            processedLength += d.byteLength
            var prop = processedLength / totalLength
            var pc = Math.round(prop * 100)
            process.stdout.write('    ...downloading: ' + pc + '%\r')
        })

        responseContent.on('data', function(d) {
            if (sha256 !== undefined) {
                hash.update(d)
            }
        })

        file.on('error', function (err) {
            console.log('  Error downloading file: ' + err)
            console.log('  Deleting corrupted file...')
            fs.unlink(dest, function () {
                callback('Error: Download error.')
            })
        })
    })
}

function ping(url, callback) {
    var request = https.get(url, callback)
    request.on('error', function () {})
}


function downloadCommand(url, dest, compression_type, sha256) {
    var gz_compressed_file = (compression_type === 'gzip')

    if (gz_compressed_file) {
        url += '.gz'
    }

    download(url, dest, gz_compressed_file, sha256, function (err) {
        if (err) {
            console.log('  Exiting with failure code (1)')
            process.exit(1)
        } else {
            console.log('  Download finished successfully ' + ((sha256 !== undefined) ? '(checksum validated).' : '(no checksum).'))
            process.exit(0)
        }
    })
}

function latencyCommand() {
    var urls = Array.prototype.slice.call(arguments)    

    urls.forEach(function (url) {
        ping(url, function() {
            console.log(url)
            process.exit(0)
        })
    })
}

function installCommand() {
    var installDir = path.resolve(os.homedir(), '.latexjs/')
    var manifestPath = path.join(installDir, 'latexjs.json')
    if (!fs.existsSync(installDir)) {
        mkdirRecursiveSync(installDir)
    }
    console.log('Choosing server based on ping...')
    var server = callSelf(['latency'].concat(DEFAULT_SERVERS)).trim()
    console.log('Chose ' + server)
    console.log('Donwnloading mainfest (latexjs.json)')
    callSelf(['download', server + '/latexjs.json', manifestPath, 'gzip'])

    console.log('Donwnloading apps')
    callSelf(['download', server + '/apps/pdflatex.js', path.join(installDir, 'apps', 'pdflatex.js'), 'gzip'], true)
    callSelf(['download', server + '/apps/bibtex.js', path.join(installDir, 'apps', 'bibtex.js'), 'gzip'], true)
    callSelf(['download', server + '/apps/kpsewhich.js', path.join(installDir, 'apps', 'kpsewhich.js'), 'gzip'], true)
    callSelf(['download', server + '/apps/latexmk.pl', path.join(installDir, 'apps', 'latexmk.pl'), 'gzip'], true)
    callSelf(['download', server + '/apps/latexmk_config.pl', path.join(installDir, 'apps', 'latexmk_config.pl'), 'gzip'], true)
}

var COMMAND_FUNCTION = {
    'download': downloadCommand,
    'latency': latencyCommand,
    'install': installCommand
}

var COMMAND = process.argv[2]
var ARGS = process.argv.slice(3)
var COMMAND_FUNC = COMMAND_FUNCTION[COMMAND]

if (COMMAND_FUNC === undefined) {
    console.log('Command not understood - options are: ' + Object.keys(COMMAND_FUNCTION).join(', '))
    process.exit(1)
} else {
    COMMAND_FUNC.apply(null, ARGS)
}
