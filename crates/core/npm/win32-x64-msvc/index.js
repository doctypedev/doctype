const { existsSync, readFileSync } = require('fs')
const { join } = require('path')

const { platform, arch } = process

let nativeBinding = null
let localFileExisted = false
let loadError = null

switch (platform) {
    case 'win32':
        switch (arch) {
            case 'x64':
                localFileExisted = existsSync(join(__dirname, 'doctype-core.win32-x64-msvc.node'))
                try {
    if (fs.existsSync(join(__dirname, 'doctype-core.win32-x64-msvc.node'))) {
      nativeBinding = require('./doctype-core.win32-x64-msvc.node')
    } else {
      nativeBinding = require('@sintesi/core-win32-x64-msvc')
    }
                } catch (e) {
                    loadError = e
                }
                break
            default:
                throw new Error(`Unsupported architecture on Windows: ${arch}`)
        }
        break
    default:
        throw new Error(`Unsupported OS: ${platform}, architecture: ${arch}`)
}

if (!nativeBinding) {
    if (loadError) {
        throw loadError
    }
    throw new Error(`Failed to load native binding`)
}

module.exports = nativeBinding
