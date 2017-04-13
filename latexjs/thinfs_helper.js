var process = require('process')
var https = require('https')
var fs = require('fs')
var path = require('path')
var crypto = require('crypto')
var zlib = require('zlib')

function mkdir(dir, mode){
    try {
        fs.mkdirSync(dir, mode)
    }
    catch (e) {
        if(e.code === 'ENOENT'){
            mkdir(path.dirname(dir), mode)
            mkdir(dir, mode)
        } else {
            throw e
        }
    }
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
        mkdir(destDir)
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

var COMMAND_FUNCTION = {
    'download': downloadCommand
}

var COMMAND = process.argv[2]
var ARGS = process.argv.slice(3)
console.log(ARGS)

var COMMAND_FUNC = COMMAND_FUNCTION[COMMAND]

if (COMMAND_FUNC === undefined) {
    console.log('Command not understood - options are: ' + Object.keys(COMMAND_FUNCTION).join(', '))
} else {
    COMMAND_FUNC.apply(null, ARGS)
}
