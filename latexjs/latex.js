'use strict'
const cp = require('child_process')
const process = require('process')
const https = require('https')
const os = require('os')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const url = require('url')
const zlib = require('zlib')

const DEFAULT_SERVERS = [
    'https://london.latexjs.org',
    'https://sanfran.latexjs.org',
    'https://singapore.latexjs.org',
]

function mkdirRecursiveSync(dir, mode) {
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

function rmdirRecursiveSync(path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(file => {
      var curPath = path + "/" + file
      if(fs.lstatSync(curPath).isDirectory()) {
        rmdirRecursiveSync(curPath)
      } else {
        fs.unlinkSync(curPath)
      }
    })
    fs.rmdirSync(path)
  }
}


function callSelf(args, showStdOut) {
  const fullArgs = [__filename].concat(args)
  const opts = { encoding: 'utf8' }
  if (showStdOut) {
    opts.stdio = 'inherit'
  }
  const x = cp.spawnSync(process.execPath, fullArgs, opts)
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

    const destDir = path.dirname(dest)
    if (!fs.existsSync(path.dirname(dest))) {
        console.log('  Creating ' + destDir)
        mkdirRecursiveSync(destDir)
    }
    let hash
    if (sha256 !== undefined) {
        hash = crypto.createHash('sha256')
    }
    const file = fs.createWriteStream(dest)

    const request = https.get(url, response => {

        const totalLength = response.headers['content-length']
        let processedLength = 0

        let responseContent = response
        if (gz_file) {
            responseContent = response.pipe(zlib.createUnzip())
        }
        responseContent.pipe(file)

        file.on('finish', () => {
            console.log('')
            if (sha256 !== undefined) {
                const checksum = hash.digest('hex')
                if (checksum !== sha256) {
                    console.log('  ERROR - checksum does not match:')
                    console.log('    Expected: ' + sha256)
                    console.log('      Actual: ' + checksum)
                    console.log('  Clearing up compromised file...')
                    fs.unlink(dest, () => {
                        callback('Error: checksum failure.')
                    })

                }
            }
            file.close(err => {
                if (err) {
                    console.log('  Error closing file: ' + err)
                }
                callback(err)
            })
        })

        response.on('data', d => {
            processedLength += d.byteLength
            const prop = processedLength / totalLength
            const pc = Math.round(prop * 100)
            process.stdout.write('    ...downloading: ' + pc + '%\r')
        })

        responseContent.on('data', d => {
            if (sha256 !== undefined) {
                hash.update(d)
            }
        })

        file.on('error',  err => {
            console.log('  Error downloading file: ' + err)
            console.log('  Deleting corrupted file...')
            fs.unlink(dest, () => {
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

    download(url, dest, gz_compressed_file, sha256, err => {
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
    let urls = Array.prototype.slice.call(arguments)
    if (urls.length === 0) {
        urls = DEFAULT_SERVERS
    }
    urls.forEach(url => {
        ping(url, () => {
            console.log(url)
            process.exit(0)
        })
    })
}

function installCommand() {
    const installDir = path.resolve(os.homedir(), '.latexjs/')
    const appsDir = path.join(installDir, 'apps')
    const appsBackupDir = path.join(installDir, 'backup_apps')
    const manifestPath = path.join(installDir, 'latexjs.json')
    if (!fs.existsSync(installDir)) {
        mkdirRecursiveSync(installDir)
    }
    console.log('Choosing server based on ping...')
    const server = callSelf(['latency'].concat(DEFAULT_SERVERS)).trim()
    console.log('Chose ' + server)
    console.log('Donwnloading manifest (latexjs.json)')
    callSelf(['download', server + '/latexjs.json', manifestPath, 'gzip'])
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    if (manifest.latexjs_version !== "1") {
        throw new Error("Only version 1 of latexjs can be installed with this installer - current version is " + manifest.latexjs_version + ". Please acquire a newer installer.")
    }
    const existingApps = {}
    if (fs.existsSync(appsBackupDir)) {
        console.log('Removing old apps backup dir ' + appsBackupDir)
        rmdirRecursiveSync(appsBackupDir)
    }
    if (fs.existsSync(appsDir)) {
        console.log('Backing old apps dir to ' + appsBackupDir)
        fs.renameSync(appsDir, appsBackupDir)
        const files = fs.readdirSync(appsBackupDir)
            .map(p => path.join(appsBackupDir, p))
            .filter(p => fs.statSync(p).isFile())
            .forEach(p => {
                const hash = crypto.createHash('sha256')
                const sha256 = hash.update(fs.readFileSync(p)).digest('hex')
                existingApps[sha256] = p
            })
    }
    console.log('Acquiring apps')
    const currentPlatform = os.platform()
    console.log('(current platform is ' + currentPlatform + ')')
    Object.keys(manifest.apps).forEach(app => {
        const appSpec = manifest.apps[app]
        if (appSpec.platforms !== undefined && appSpec.platforms.indexOf(currentPlatform) === -1) {
            console.log('Skipping ' + app + ' - only required on ' + appSpec.platforms.join(', '))
            return
        }
        const appPath = path.join(installDir, 'apps', app)

        const appDir = path.dirname(appPath)
        if (!fs.existsSync(appDir)) {
            console.log('Creating ' + appDir)
            mkdirRecursiveSync(appDir)
        }
        const sha256 = appSpec.sha256
        if (existingApps[sha256] !== undefined) {
            console.log('Keeping existing app (same checksum) for ' + appPath)
            fs.renameSync(existingApps[sha256], appPath)
        } else {
            callSelf(['download', server + '/apps/' + app, appPath, 'gzip', appSpec.sha256], true)
        }
    })
    if (fs.existsSync(appsBackupDir)) {
        console.log('Removing apps backup dir ' + appsBackupDir)
        rmdirRecursiveSync(appsBackupDir)
    }
}

const COMMAND_FUNCTION = {
    'download': downloadCommand,
    'latency': latencyCommand,
    'install': installCommand
}

const COMMAND = process.argv[2]
const ARGS = process.argv.slice(3)
const COMMAND_FUNC = COMMAND_FUNCTION[COMMAND]

if (COMMAND_FUNC === undefined) {
    console.log('Command not understood - options are: ' + Object.keys(COMMAND_FUNCTION).join(', '))
    process.exit(1)
} else {
    COMMAND_FUNC.apply(null, ARGS)
}
