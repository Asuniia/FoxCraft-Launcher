const path          = require('path')

const AuthManager   = require('./assets/js/authmanager')
const ConfigManager = require('./assets/js/configmanager')
const DistroManager = require('./assets/js/distromanager')
const Lang          = require('./assets/js/langloader')

let rscShouldLoad = false
let fatalStartupError = false

const VIEWS = {
    landing: '#landingContainer',
    login: '#loginContainer',
    settings: '#settingsContainer',
    welcome: '#welcomeContainer',
    register: '#registerContainer',
    account: '#accountContainer'
}

let currentView
let backView

function switchView(current, next, currentFadeTime = 500, nextFadeTime = 500, onCurrentFade = () => {}, onNextFade = () => {}){
    currentView = next
    backView = current
    $(`${current}`).fadeOut(currentFadeTime, () => {
        onCurrentFade()
        $(`${next}`).fadeIn(nextFadeTime, () => {
            onNextFade()
        })
    })
}

function getCurrentView(){
    return currentView
}

function getBackView(){
    return currentView
}

function showMainUI(data){

    if(!isDev){
        loggerAutoUpdater.log('Initializing..')
        ipcRenderer.send('autoUpdateAction', 'initAutoUpdater', ConfigManager.getAllowPrerelease())
    }

    prepareSettings(true)
    updateSelectedServer(data.getServer(ConfigManager.getSelectedServer()))
    setTimeout(() => {
        const isLoggedIn = Object.keys(ConfigManager.getAuthAccounts()).length > 0

        if(isLoggedIn){
            validateSelectedAccount()
        }

        if(ConfigManager.isFirstLaunch()){
            currentView = VIEWS.welcome
            $(VIEWS.welcome).fadeIn(1000)
        } else {
            if (isLoggedIn) {
                currentView = VIEWS.landing
                $(VIEWS.landing).fadeIn(1000)
            } else {
                currentView = VIEWS.login
                $(VIEWS.login).fadeIn(1000)
            }
        }

        setTimeout(() => {
            $('#loadingContainer').fadeOut(500, () => {
                $('#loadSpinnerImage').removeClass('rotating')
            })
        }, 250)
        
    }, 750)
}

function showFatalStartupError(){
    setTimeout(() => {
        $('#loadingContainer').fadeOut(250, () => {
            document.getElementById('overlayContainer').style.background = 'none'
            setOverlayContent(
                'Erreur de chargement',
                'Nous avons pas pu nous connecter au serveur de FoxCraft. Par conséquant, nous devons vous interdire l\'accès.',
                'Fermer'
            )
            setOverlayHandler(() => {
                const window = remote.getCurrentWindow()
                window.close()
            })
            toggleOverlay(true)
        })
    }, 750)
}

function onDistroRefresh(data){
    updateSelectedServer(data.getServer(ConfigManager.getSelectedServer()))
    syncModConfigurations(data)
}

function syncModConfigurations(data){

    const syncedCfgs = []

    for(let serv of data.getServers()){

        const id = serv.getID()
        const mdls = serv.getModules()
        const cfg = ConfigManager.getModConfiguration(id)

        if(cfg != null){

            const modsOld = cfg.mods
            const mods = {}

            for(let mdl of mdls){
                const type = mdl.getType()

                if(type === DistroManager.Types.ForgeMod || type === DistroManager.Types.LiteMod || type === DistroManager.Types.LiteLoader){
                    if(!mdl.getRequired().isRequired()){
                        const mdlID = mdl.getVersionlessID()
                        if(modsOld[mdlID] == null){
                            mods[mdlID] = scanOptionalSubModules(mdl.getSubModules(), mdl)
                        } else {
                            mods[mdlID] = mergeModConfiguration(modsOld[mdlID], scanOptionalSubModules(mdl.getSubModules(), mdl), false)
                        }
                    } else {
                        if(mdl.hasSubModules()){
                            const mdlID = mdl.getVersionlessID()
                            const v = scanOptionalSubModules(mdl.getSubModules(), mdl)
                            if(typeof v === 'object'){
                                if(modsOld[mdlID] == null){
                                    mods[mdlID] = v
                                } else {
                                    mods[mdlID] = mergeModConfiguration(modsOld[mdlID], v, true)
                                }
                            }
                        }
                    }
                }
            }

            syncedCfgs.push({
                id,
                mods
            })

        } else {

            const mods = {}

            for(let mdl of mdls){
                const type = mdl.getType()
                if(type === DistroManager.Types.ForgeMod || type === DistroManager.Types.LiteMod || type === DistroManager.Types.LiteLoader){
                    if(!mdl.getRequired().isRequired()){
                        mods[mdl.getVersionlessID()] = scanOptionalSubModules(mdl.getSubModules(), mdl)
                    } else {
                        if(mdl.hasSubModules()){
                            const v = scanOptionalSubModules(mdl.getSubModules(), mdl)
                            if(typeof v === 'object'){
                                mods[mdl.getVersionlessID()] = v
                            }
                        }
                    }
                }
            }

            syncedCfgs.push({
                id,
                mods
            })

        }
    }

    ConfigManager.setModConfigurations(syncedCfgs)
    ConfigManager.save()
}

function scanOptionalSubModules(mdls, origin){
    if(mdls != null){
        const mods = {}

        for(let mdl of mdls){
            const type = mdl.getType()
            if(type === DistroManager.Types.ForgeMod || type === DistroManager.Types.LiteMod || type === DistroManager.Types.LiteLoader){
                if(!mdl.getRequired().isRequired()){
                    mods[mdl.getVersionlessID()] = scanOptionalSubModules(mdl.getSubModules(), mdl)
                } else {
                    if(mdl.hasSubModules()){
                        const v = scanOptionalSubModules(mdl.getSubModules(), mdl)
                        if(typeof v === 'object'){
                            mods[mdl.getVersionlessID()] = v
                        }
                    }
                }
            }
        }

        if(Object.keys(mods).length > 0){
            const ret = {
                mods
            }
            if(!origin.getRequired().isRequired()){
                ret.value = origin.getRequired().isDefault()
            }
            return ret
        }
    }
    return origin.getRequired().isDefault()
}

function mergeModConfiguration(o, n, nReq = false){
    if(typeof o === 'boolean'){
        if(typeof n === 'boolean') return o
        else if(typeof n === 'object'){
            if(!nReq){
                n.value = o
            }
            return n
        }
    } else if(typeof o === 'object'){
        if(typeof n === 'boolean') return typeof o.value !== 'undefined' ? o.value : true
        else if(typeof n === 'object'){
            if(!nReq){
                n.value = typeof o.value !== 'undefined' ? o.value : true
            }

            const newMods = Object.keys(n.mods)
            for(let i=0; i<newMods.length; i++){

                const mod = newMods[i]
                if(o.mods[mod] != null){
                    n.mods[mod] = mergeModConfiguration(o.mods[mod], n.mods[mod])
                }
            }

            return n
        }
    }
    return n
}

function refreshDistributionIndex(remote, onSuccess, onError){
    if(remote){
        DistroManager.pullRemote()
            .then(onSuccess)
            .catch(onError)
    } else {
        DistroManager.pullLocal()
            .then(onSuccess)
            .catch(onError)
    }
}

async function validateSelectedAccount(){
    const selectedAcc = ConfigManager.getSelectedAccount()
    if(selectedAcc != null){
        const val = await AuthManager.getuser(ConfigManager.getToken())
        if(!val){
            switchView(getCurrentView(),VIEWS.login)
            ConfigManager.removeAuthAccount(selectedAcc.uuid)
            ConfigManager.save()
            const accLen = Object.keys(ConfigManager.getAuthAccounts()).length
            setOverlayContent(
                'Erreur de récupération',
                `Impossible de récupérer <strong>${selectedAcc.displayName}</strong>. Veuillez vous connecter.`,
                'Connexion',
            )
            setOverlayHandler(() => {
                loginViewOnSuccess = getCurrentView()
                loginViewOnCancel = getCurrentView()
                if(accLen > 0){
                    loginViewCancelHandler = () => {
                        ConfigManager.addAuthAccount(selectedAcc.uuid, selectedAcc.accessToken, selectedAcc.username, selectedAcc.displayName)
                        ConfigManager.save()
                        validateSelectedAccount()
                    }
                    loginCancelEnabled(true)
                }
                toggleOverlay(false)
            })
            setDismissHandler(() => {
                if(accLen > 1){
                    prepareAccountSelectionList()
                    $('#overlayContent').fadeOut(250, () => {
                        bindOverlayKeys(true, 'accountSelectContent', true)
                        $('#accountSelectContent').fadeIn(250)
                    })
                } else {
                    const accountsObj = ConfigManager.getAuthAccounts()
                    const accounts = Array.from(Object.keys(accountsObj), v => accountsObj[v])
                    // This function validates the account switch.
                    setSelectedAccount(accounts[0].uuid)
                    toggleOverlay(false)
                }
            })
            toggleOverlay(true, accLen > 0)
        } else {
            return true
        }
    } else {
        return true
    }
}

function setSelectedAccount(uuid){
    const authAcc = ConfigManager.setSelectedAccount(uuid)
    ConfigManager.save()
    updateSelectedAccount(authAcc)
    validateSelectedAccount()
}

document.addEventListener('readystatechange', function(){

    if (document.readyState === 'interactive' || document.readyState === 'complete'){
        if(rscShouldLoad){
            rscShouldLoad = false
            if(!fatalStartupError){
                const data = DistroManager.getDistribution()
                showMainUI(data)
            } else {
                showFatalStartupError()
            }
        } 
    }

}, false)

ipcRenderer.on('distributionIndexDone', (event, res) => {

    if(res) {
        const data = DistroManager.getDistribution()
        syncModConfigurations(data)
        if(document.readyState === 'interactive' || document.readyState === 'complete'){
            showMainUI(data)
        } else {
            rscShouldLoad = true
        }
    } else {
        fatalStartupError = true
        if(document.readyState === 'interactive' || document.readyState === 'complete'){
            showFatalStartupError()
        } else {
            rscShouldLoad = true
        }
    }
})
