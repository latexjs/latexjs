var process = require('process')
var http = require('http')
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


function download(url, dest, gz_file, sha256) {
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

    var request = http.get(url, function (response) {

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
                    fs.unlinkSync(dest)
                    console.log('  Exiting with failure code (1)')
                    process.exit(1)
                }
            }
            file.close(function (err) {
                if (err) {
                    console.log('  Error closing file: ' + err)
                    console.log('  Exiting with failure code (1)')
                    process.exit(1)
                } else {
                    console.log('  Download finished successfully ' + ((sha256 !== undefined) ? '(checksum validated).' : '(no checksum).'))
                    process.exit(0)
                }
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
            fs.unlinkSync(dest)
            console.log('  Exiting with failure code (1)')
            process.exit(1)
        })
    })
}

var URL = process.argv[2]
var DEST = process.argv[3]
if (process.argv.length >= 5) {
    GZ_FILE = (process.argv[4] === 'gzip')
} else {
    GZ_FILE = false
}
if (process.argv.length >= 6) {
    SHA256 = process.argv[5]
}
else {
    SHA256 = undefined
}

if (GZ_FILE) {
    URL = URL + '.gz'
}
download(URL, DEST, GZ_FILE, SHA256)
