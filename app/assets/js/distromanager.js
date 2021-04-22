const fs = require('fs')
const path = require('path')
const request = require('request')

const ConfigManager = require('./configmanager')
const logger        = require('./loggerutil')('%c[DistroManager]', 'color: #a02d2a; font-weight: bold')

class Artifact {

    static fromJSON(json){
        return Object.assign(new Artifact(), json)
    }

    getHash(){
        return this.MD5
    }

    getSize(){
        return this.size
    }

    getURL(){
        return this.url
    }

    getPath(){
        return this.path
    }

}
exports.Artifact

class Required {

    static fromJSON(json){
        if(json == null){
            return new Required(true, true)
        } else {
            return new Required(json.value == null ? true : json.value, json.def == null ? true : json.def)
        }
    }

    constructor(value, def){
        this.value = value
        this.default = def
    }

    isDefault(){
        return this.default
    }

    isRequired(){
        return this.value
    }

}
exports.Required

class Module {

    static fromJSON(json, serverid){
        return new Module(json.id, json.name, json.type, json.required, json.artifact, json.subModules, serverid)
    }

    static _resolveDefaultExtension(type){
        switch (type) {
            case exports.Types.Library:
            case exports.Types.ForgeHosted:
            case exports.Types.LiteLoader:
            case exports.Types.ForgeMod:
                return 'jar'
            case exports.Types.LiteMod:
                return 'litemod'
            case exports.Types.File:
            default:
                return 'jar'
        }
    }

    constructor(id, name, type, required, artifact, subModules, serverid) {
        this.identifier = id
        this.type = type
        this._resolveMetaData()
        this.name = name
        this.required = Required.fromJSON(required)
        this.artifact = Artifact.fromJSON(artifact)
        this._resolveArtifactPath(artifact.path, serverid)
        this._resolveSubModules(subModules, serverid)
    }

    _resolveMetaData(){
        try {

            const m0 = this.identifier.split('@')

            this.artifactExt = m0[1] || Module._resolveDefaultExtension(this.type)

            const m1 = m0[0].split(':')

            this.artifactClassifier = m1[3] || undefined
            this.artifactVersion = m1[2] || '???'
            this.artifactID = m1[1] || '???'
            this.artifactGroup = m1[0] || '???'

        } catch (err) {
            logger.error('ID module', this.identifier, err)
        }
    }

    _resolveArtifactPath(artifactPath, serverid){
        const pth = artifactPath == null ? path.join(...this.getGroup().split('.'), this.getID(), this.getVersion(), `${this.getID()}-${this.getVersion()}${this.artifactClassifier != undefined ? `-${this.artifactClassifier}` : ''}.${this.getExtension()}`) : artifactPath

        switch (this.type){
            case exports.Types.Library:
            case exports.Types.ForgeHosted:
            case exports.Types.LiteLoader:
                this.artifact.path = path.join(ConfigManager.getCommonDirectory(), 'libraries', pth)
                break
            case exports.Types.ForgeMod:
            case exports.Types.LiteMod:
                this.artifact.path = path.join(ConfigManager.getCommonDirectory(), 'modstore', pth)
                break
            case exports.Types.VersionManifest:
                this.artifact.path = path.join(ConfigManager.getCommonDirectory(), 'versions', this.getIdentifier(), `${this.getIdentifier()}.json`)
                break
            case exports.Types.File:
            default:
                this.artifact.path = path.join(ConfigManager.getInstanceDirectory(), serverid, pth)
                break
        }

    }

    _resolveSubModules(json, serverid){
        const arr = []
        if(json != null){
            for(let sm of json){
                arr.push(Module.fromJSON(sm, serverid))
            }
        }
        this.subModules = arr.length > 0 ? arr : null
    }

    getIdentifier(){
        return this.identifier
    }

    getName(){
        return this.name
    }

    getRequired(){
        return this.required
    }

    getArtifact(){
        return this.artifact
    }

    getID(){
        return this.artifactID
    }

    getGroup(){
        return this.artifactGroup
    }

    getVersionlessID(){
        return this.getGroup() + ':' + this.getID()
    }

    getExtensionlessID(){
        return this.getIdentifier().split('@')[0]
    }

    getVersion(){
        return this.artifactVersion
    }

    getClassifier(){
        return this.artifactClassifier
    }

    getExtension(){
        return this.artifactExt
    }

    hasSubModules(){
        return this.subModules != null
    }

    getSubModules(){
        return this.subModules
    }

    getType(){
        return this.type
    }

}
exports.Module

class Server {

    static fromJSON(json){

        const mdls = json.modules
        json.modules = []

        const serv = Object.assign(new Server(), json)
        serv._resolveModules(mdls)

        return serv
    }

    _resolveModules(json){
        const arr = []
        for(let m of json){
            arr.push(Module.fromJSON(m, this.getID()))
        }
        this.modules = arr
    }

    getID(){
        return this.id
    }

    getName(){
        return this.name
    }

    getDescription(){
        return this.description
    }

    getIcon(){
        return this.icon
    }

    getVersion(){
        return this.version
    }

    getAddress(){
        return this.address
    }

    getMinecraftVersion(){
        return this.minecraftVersion
    }

    isMainServer(){
        return this.mainServer
    }

    isAutoConnect(){
        return this.autoconnect
    }

    getModules(){
        return this.modules
    }

}
exports.Server

class DistroIndex {

    static fromJSON(json){

        const servers = json.servers
        json.servers = []

        const distro = Object.assign(new DistroIndex(), json)
        distro._resolveServers(servers)
        distro._resolveMainServer()

        return distro
    }

    _resolveServers(json){
        const arr = []
        for(let s of json){
            arr.push(Server.fromJSON(s))
        }
        this.servers = arr
    }

    _resolveMainServer(){

        for(let serv of this.servers){
            if(serv.mainServer){
                this.mainServer = serv.id
                return
            }
        }

        this.mainServer = (this.servers.length > 0) ? this.servers[0].getID() : null
    }

    getVersion(){
        return this.version
    }

    getRSS(){
        return this.rss
    }


    getServers(){
        return this.servers
    }

    getServer(id){
        for(let serv of this.servers){
            if(serv.id === id){
                return serv
            }
        }
        return null
    }


    getMainServer(){
        return this.mainServer != null ? this.getServer(this.mainServer) : null
    }

}
exports.DistroIndex

exports.Types = {
    Library: 'Library',
    ForgeHosted: 'ForgeHosted',
    Forge: 'Forge', // Unimplemented
    LiteLoader: 'LiteLoader',
    ForgeMod: 'ForgeMod',
    LiteMod: 'LiteMod',
    File: 'File',
    VersionManifest: 'VersionManifest'
}

let DEV_MODE = false

const DISTRO_PATH = path.join(ConfigManager.getLauncherDirectory(), 'distribution.json')
const DEV_PATH = path.join(ConfigManager.getLauncherDirectory(), 'dev_distribution.json')

let data = null

exports.pullRemote = function(){
    if(DEV_MODE){
        return exports.pullLocal()
    }
    return new Promise((resolve, reject) => {
        const distroURL = 'https://launcher.cerallia.fr/repo/FoxCraft.json'
        const opts = {
            url: distroURL,
            timeout: 2500
        }
        const distroDest = path.join(ConfigManager.getLauncherDirectory(), 'distribution.json')
        request(opts, (error, resp, body) => {
            if(!error){
                
                try {
                    data = DistroIndex.fromJSON(JSON.parse(body))
                } catch (e) {
                    reject(e)
                    return
                }

                fs.writeFile(distroDest, body, 'utf-8', (err) => {
                    if(!err){
                        resolve(data)
                        return
                    } else {
                        reject(err)
                        return
                    }
                })
            } else {
                reject(error)
                return
            }
        })
    })
}

exports.pullLocal = function(){
    return new Promise((resolve, reject) => {
        fs.readFile(DEV_MODE ? DEV_PATH : DISTRO_PATH, 'utf-8', (err, d) => {
            if(!err){
                data = DistroIndex.fromJSON(JSON.parse(d))
                resolve(data)
                return
            } else {
                reject(err)
                return
            }
        })
    })
}

exports.setDevMode = function(value){
    DEV_MODE = value
}

exports.isDevMode = function(){
    return DEV_MODE
}

exports.getDistribution = function(){
    return data
}