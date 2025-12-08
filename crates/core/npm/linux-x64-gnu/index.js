const { existsSync, readFileSync } = require('fs')
const { join } = require('path')

const { platform, arch } = process

let nativeBinding = null
let localFileExisted = false
let loadError = null

switch (platform) {
    case 'linux':
        switch (arch) {
            case 'x64':
                localFileExisted = existsSync(join(__dirname, 'doctype-core.linux-x64-gnu.node'))
                try {
                    if (localFileExisted) {
                        nativeBinding = require('./doctype-core.linux-x64-gnu.node')
                    } else {
                        nativeBinding = require('@doctypedev/core-linux-x64-gnu')
                    }
                } catch (e) {
                    loadError = e
                }
                break
            default:
                throw new Error(`Unsupported architecture on Linux: ${arch}`)
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
