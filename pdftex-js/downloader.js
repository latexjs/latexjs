var process = require('process')
var http = require('http')
var fs = require('fs')

function download(url, dest) {
    console.log('  Downloading:')
    console.log('  ' + url + ' => ' + dest)
    var file = fs.createWriteStream(dest)

    var request = http.get(url, function (response) {

        var totalLength = response.headers['content-length']
        var processedLength = 0
        response.pipe(file)

        response.on('end', function () {
            // console.log('  Finished - attempting to close file...')
            file.close(function (err) {
                if (err) {
                    console.log('  Error closing file: ' + err)
                    console.log('  Exiting with failure code (1)')
                    process.exit(1)
                } else {
                    // console.log('  Closed file successfully - exiting cleanly (0)')
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

        response.on('error', function (err) {
            console.log('  Error downloading file: ' + err)
            console.log('  Attempting to close file...')
            file.close(function (errF) {
                if (errF) {
                    console.log('  Error closing file after failed download: ' + errF)
                }
                console.log('  Exiting with failure code (1)')
                process.exit(1)
            })
        })
    })
}

var URL = process.argv[2]
var DEST = process.argv[3]
download(URL, DEST)
