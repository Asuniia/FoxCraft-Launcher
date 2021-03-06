const cp                      = require('child_process')
const crypto                  = require('crypto')
const {URL}                   = require('url')

const DiscordWrapper          = require('./assets/js/discordwrapper')
const ProcessBuilder          = require('./assets/js/processbuilder')
const ServerStatus            = require('./assets/js/serverstatus')

const launch_content          = document.getElementById('launch_content')
const launch_details          = document.getElementById('ldetails')
const launch_progress         = document.getElementById('launch_progress')
const launch_progress_label   = document.getElementById('launch_progress_label')
const launch_details_text     = document.getElementById('launch_details_text')
const server_selection_button = document.getElementById('server_selection_button')
const user_text               = document.getElementById('user_text')
const loggerLanding = LoggerUtil('%c[Landing]', 'color: #000668; font-weight: bold')

function toggleLaunchArea(loading){
    if(loading){
        launch_details.style.display = 'flex'
        launch_content.style.display = 'none'
    } else {
        launch_details.style.display = 'none'
        launch_content.style.display = 'flex'
    }
}


function setLaunchDetails(details){
    launch_details_text.innerHTML = details
}

function setLaunchPercentage(value, max, percent = ((value/max)*100)){
    launch_progress.setAttribute('max', max)
    launch_progress.setAttribute('value', value)
    launch_progress_label.innerHTML = percent + '%'
}


function setDownloadPercentage(value, max, percent = ((value/max)*100)){
    remote.getCurrentWindow().setProgressBar(value/max)
    setLaunchPercentage(value, max, percent)
}

function setLaunchEnabled(val){
    document.getElementById('launch_button').disabled = !val
}

document.getElementById('launch_button').addEventListener('click', function(e){
    loggerLanding.log('Lancement en cours..')
    const mcVersion = DistroManager.getDistribution().getServer(ConfigManager.getSelectedServer()).getMinecraftVersion()
    const jExe = ConfigManager.getJavaExecutable()
    if(jExe == null){
        asyncSystemScan(mcVersion)
    } else {

        setLaunchDetails(Lang.queryJS('landing.launch.pleaseWait'))
        toggleLaunchArea(true)
        setLaunchPercentage(0, 100)


        const jg = new JavaGuard(mcVersion)
        jg._validateJavaBinary(jExe).then((v) => {
            loggerLanding.log('Java version meta', v)
            if(v.valid){
                dlAsync()
            } else {
                asyncSystemScan(mcVersion)
            }
        })
    }
})

let authUser1;

document.getElementById('homeMediaButton').onclick = (e) => {
    if(authUser1) {
        switchView(getCurrentView(), VIEWS.landing)
    }
    //prepareSettings()
}


document.getElementById('settingsMediaButton').onclick = (e) => {
    prepareSettings()
    switchView(getCurrentView(), VIEWS.settings)
}

document.getElementById('accountMediaButton').onclick = (e) => {
    if(authUser1) {
        switchView(getCurrentView(), VIEWS.account)
    }
    //prepareSettings()
}

function updateSelectedAccount(authUser){
    let username = 'mais connectez vous en relancant le launcher.'
    authUser1 = authUser;

    if(authUser != null){
        if(authUser.displayName != null){
            username = authUser.displayName
        }
        if(authUser.uuid != null){
            document.getElementById('avatarContainer').style.backgroundImage = `url('https://cravatar.eu/avatar/${authUser.skin}/40.png')`
        }
    }
    user_text.innerHTML =  'Bienvenue à vous ' + username + '.'
}
updateSelectedAccount(ConfigManager.getSelectedAccount())

function updateSelectedServer(serv){
    if(getCurrentView() === VIEWS.settings){
        saveAllModConfigurations()
    }
    ConfigManager.setSelectedServer(serv != null ? serv.getID() : null)
    ConfigManager.save()
    if(getCurrentView() === VIEWS.settings){
        animateModsTabRefresh()
    }
    setLaunchEnabled(serv != null)
}

function showLaunchFailure(title, desc){
    setOverlayContent(
        title,
        desc,
        'Je comprend.'
    )
    setOverlayHandler(null)
    toggleOverlay(true)
    toggleLaunchArea(false)
}

let sysAEx
let scanAt

let extractListener


function asyncSystemScan(mcVersion, launchAfter = true){

    setLaunchDetails('Veuillez patientez..')
    toggleLaunchArea(true)
    setLaunchPercentage(0, 100)

    const loggerSysAEx = LoggerUtil('%c[SysAEx]', 'color: #353232; font-weight: bold')

    const forkEnv = JSON.parse(JSON.stringify(process.env))
    forkEnv.CONFIG_DIRECT_PATH = ConfigManager.getLauncherDirectory()

    sysAEx = cp.fork(path.join(__dirname, 'assets', 'js', 'assetexec.js'), [
        'JavaGuard',
        mcVersion
    ], {
        env: forkEnv,
        stdio: 'pipe'
    })
    sysAEx.stdio[1].setEncoding('utf8')
    sysAEx.stdio[1].on('data', (data) => {
        loggerSysAEx.log(data)
    })
    sysAEx.stdio[2].setEncoding('utf8')
    sysAEx.stdio[2].on('data', (data) => {
        loggerSysAEx.log(data)
    })
    
    sysAEx.on('message', (m) => {

        if(m.context === 'validateJava'){
            if(m.result == null){

                setOverlayContent(
                    'Aucune installation compatible de Java trouvée',
                    'Pour rejoindre FoxCraft, vous avez besoin d\'une installation 64 bits de Java 8. Souhaitez-vous que nous en installions une copie? En installant, vous acceptez le <a href="http://www.oracle.com/technetwork/java/javase/terms/license/index.html"> contrat de licence d\'Oracle </a>.',
                    'Installer Java',
                    'Refuser'
                )
                setOverlayHandler(() => {
                    setLaunchDetails('Préparation du téléchargement Java..')
                    sysAEx.send({task: 'changeContext', class: 'AssetGuard', args: [ConfigManager.getCommonDirectory(),ConfigManager.getJavaExecutable()]})
                    sysAEx.send({task: 'execute', function: '_enqueueOpenJDK', argsArr: [ConfigManager.getDataDirectory()]})
                    toggleOverlay(false)
                })
                setDismissHandler(() => {
                    $('#overlayContent').fadeOut(250, () => {
                        //$('#overlayDismiss').toggle(false)
                        setOverlayContent(
                            'Java est requis',
                            'Pour rejoindre FoxCraft, vous avez besoin d\'une installation 64 bits de Java 8. Souhaitez-vous que nous en installions une copie? En installant, vous acceptez le <a href="http://www.oracle.com/technetwork/java/javase/terms/license/index.html"> contrat de licence d\'Oracle </a>.',
                            'Je comprend.',
                            'Retour'
                        )
                        setOverlayHandler(() => {
                            toggleLaunchArea(false)
                            toggleOverlay(false)
                        })
                        setDismissHandler(() => {
                            toggleOverlay(false, true)
                            asyncSystemScan()
                        })
                        $('#overlayContent').fadeIn(250)
                    })
                })
                toggleOverlay(true, true)

            } else {
                ConfigManager.setJavaExecutable(m.result)
                ConfigManager.save()
                settingsJavaExecVal.value = m.result
                populateJavaExecDetails(settingsJavaExecVal.value)

                if(launchAfter){
                    dlAsync()
                }
                sysAEx.disconnect()
            }
        } else if(m.context === '_enqueueOpenJDK'){

            if(m.result === true){

                setLaunchDetails('Téléchargement de Java..')
                sysAEx.send({task: 'execute', function: 'processDlQueues', argsArr: [[{id:'java', limit:1}]]})

            } else {

                setOverlayContent(
                    'Le téléchargement Java a échoué',
                    'Nous avons pas pu télécharger Java. Veuillez ressayer ou contacter le support.',
                    'Je comprend.'
                )
                setOverlayHandler(() => {
                    toggleOverlay(false)
                    toggleLaunchArea(false)
                })
                toggleOverlay(true)
                sysAEx.disconnect()

            }

        } else if(m.context === 'progress'){

            switch(m.data){
                case 'download':
                    setDownloadPercentage(m.value, m.total, m.percent)
                    break
            }

        } else if(m.context === 'complete'){

            switch(m.data){
                case 'download': {
                    remote.getCurrentWindow().setProgressBar(2)

                    const eLStr = 'Extraction'
                    let dotStr = ''
                    setLaunchDetails(eLStr)
                    extractListener = setInterval(() => {
                        if(dotStr.length >= 3){
                            dotStr = ''
                        } else {
                            dotStr += '.'
                        }
                        setLaunchDetails(eLStr + dotStr)
                    }, 750)
                    break
                }
                case 'java':
                    remote.getCurrentWindow().setProgressBar(-1)

                    ConfigManager.setJavaExecutable(m.args[0])
                    ConfigManager.save()

                    if(extractListener != null){
                        clearInterval(extractListener)
                        extractListener = null
                    }

                    setLaunchDetails('Java installé')

                    if(launchAfter){
                        dlAsync()
                    }

                    sysAEx.disconnect()
                    break
            }

        } else if(m.context === 'error'){
            console.log(m.error)
        }
    })

    setLaunchDetails('Vérification des informations système.')
    sysAEx.send({task: 'execute', function: 'validateJava', argsArr: [ConfigManager.getDataDirectory()]})

}

let proc
let hasRPC = false
const GAME_JOINED_REGEX = /\[.+\]: Sound engine started/
const GAME_LAUNCH_REGEX = /^\[.+\]: (?:MinecraftForge .+ Initialized|ModLauncher .+ starting: .+)$/
const MIN_LINGER = 5000

let aEx
let serv
let versionData
let forgeData

let progressListener

function dlAsync(login = true){

    AuthManager.validauth(ConfigManager.getToken()).then((value) => {
        if(value === false) {
            loggerLanding.error('Impossible authentifier client au serveur')
            showLaunchFailure("Problème d'authentification","Impossible de vous authentifier auprès du serveur. Veuillez relancer le launcher.")
            aEx.disconnect()
        }
    })

    if(login) {
        if(ConfigManager.getSelectedAccount() == null){
            loggerLanding.error('Vous devez être connecté à un compte.')
            setOverlayContent(
                'Pas connecté.',
                'Vous n\'avez pas de compte actif. Vous devez vous connecter pour pouvoir lancer le jeu.',
                'Je comprend.'
            )
            setOverlayHandler(() => {
                toggleOverlay(false)
                toggleLaunchArea(false)
            })
            toggleOverlay(true)
            return
        }
    }

    setLaunchDetails('Veuillez patientez..')
    toggleLaunchArea(true)
    setLaunchPercentage(0, 100)

    const loggerAEx = LoggerUtil('%c[AEx]', 'color: #353232; font-weight: bold')
    const loggerLaunchSuite = LoggerUtil('%c[LaunchSuite]', 'color: #000668; font-weight: bold')

    const forkEnv = JSON.parse(JSON.stringify(process.env))
    forkEnv.CONFIG_DIRECT_PATH = ConfigManager.getLauncherDirectory()

    aEx = cp.fork(path.join(__dirname, 'assets', 'js', 'assetexec.js'), [
        'AssetGuard',
        ConfigManager.getCommonDirectory(),
        ConfigManager.getJavaExecutable()
    ], {
        env: forkEnv,
        stdio: 'pipe'
    })
    aEx.stdio[1].setEncoding('utf8')
    aEx.stdio[1].on('data', (data) => {
        loggerAEx.log(data)
    })
    aEx.stdio[2].setEncoding('utf8')
    aEx.stdio[2].on('data', (data) => {
        loggerAEx.log(data)
    })
    aEx.on('error', (err) => {
        loggerLaunchSuite.error('Erreur lors du lancement', err)
        showLaunchFailure('Erreur lors du lancement', err.message || 'Contacter le support.')
    })
    aEx.on('close', (code, signal) => {
        if(code !== 0){
            loggerLaunchSuite.error(`AssetExec exited with code ${code}, assuming error.`)
            showLaunchFailure('Erreur lors du lancement', 'Contacter le support.')
        }
    })

    aEx.on('message', (m) => {

        if(m.context === 'validate'){
            switch(m.data){
                case 'distribution':
                    setLaunchPercentage(20, 100)
                    loggerLaunchSuite.log('Indice de distribution validé.')
                    setLaunchDetails('Chargement des informations de version..')
                    break
                case 'version':
                    setLaunchPercentage(40, 100)
                    loggerLaunchSuite.log('Données de version chargées.')
                    setLaunchDetails('Validation de l\'intégrité des assets.')
                    break
                case 'assets':
                    setLaunchPercentage(60, 100)
                    loggerLaunchSuite.log('Validation des assets terminée')
                    setLaunchDetails('Validation de l\'intégrité de la bibliothèque.')
                    break
                case 'libraries':
                    setLaunchPercentage(80, 100)
                    loggerLaunchSuite.log('Validation de la bibliothèque terminée.')
                    setLaunchDetails('Validation de l\'intégrité des fichiers divers.')
                    break
                case 'files':
                    setLaunchPercentage(100, 100)
                    loggerLaunchSuite.log('Validation du fichier terminée.')
                    setLaunchDetails('Téléchargement..')
                    break
            }
        } else if(m.context === 'progress'){
            switch(m.data){
                case 'assets': {
                    const perc = (m.value/m.total)*20
                    setLaunchPercentage(40+perc, 100, parseInt(40+perc))
                    break
                }
                case 'download':
                    setDownloadPercentage(m.value, m.total, m.percent)
                    break
                case 'extract': {
                    remote.getCurrentWindow().setProgressBar(2)

                    const eLStr = 'Extraction libs..'
                    let dotStr = ''
                    setLaunchDetails(eLStr)
                    progressListener = setInterval(() => {
                        if(dotStr.length >= 3){
                            dotStr = ''
                        } else {
                            dotStr += '.'
                        }
                        setLaunchDetails(eLStr + dotStr)
                    }, 750)
                    break
                }
            }
        } else if(m.context === 'complete'){
            switch(m.data){
                case 'download':
                    remote.getCurrentWindow().setProgressBar(-1)
                    if(progressListener != null){
                        clearInterval(progressListener)
                        progressListener = null
                    }

                    setLaunchDetails('Préparation au lancement..')
                    break
            }
        } else if(m.context === 'error'){
            switch(m.data){
                case 'download':
                    loggerLaunchSuite.error('Erreur lors du téléchargement : ', m.error)
                    
                    if(m.error.code === 'ENOENT'){
                        showLaunchFailure(
                            'Erreur de téléchargement',
                            'Impossible de se connecter au serveur de fichiers. Assurez-vous que vous êtes connecté à Internet et réessayez.',
                        )
                    } else {
                        showLaunchFailure(
                            'Erreur de téléchargement',
                            'Contactez le support',
                        )
                    }

                    remote.getCurrentWindow().setProgressBar(-1)

                    aEx.disconnect()
                    break
            }
        } else if(m.context === 'validateEverything'){

            let allGood = true

            if(m.result.forgeData == null || m.result.versionData == null){
                loggerLaunchSuite.error('Erreur lors du lancement', m.result)

                loggerLaunchSuite.error('Erreur lors du lancement', m.result.error)
                showLaunchFailure('Erreur lors du lancement', 'Relancez le launcher.')

                allGood = false
            }

            forgeData = m.result.forgeData
            versionData = m.result.versionData

            if(login && allGood) {
                const authUser = ConfigManager.getSelectedAccount()
                loggerLaunchSuite.log(`Sending selected account (${authUser.displayName}) to ProcessBuilder.`)
                let pb = new ProcessBuilder(serv, versionData, forgeData, authUser, remote.app.getVersion())
                setLaunchDetails('Lancement..')

                const SERVER_JOINED_REGEX = new RegExp(`\\[.+\\]: \\[CHAT\\] ${authUser.displayName} joined the game`)

                const onLoadComplete = () => {
                    toggleLaunchArea(false)
                    if(hasRPC){
                        DiscordWrapper.updateDetails('Jeu en cours de chargement..')
                    }
                    proc.stdout.on('data', gameStateChange)
                    proc.stdout.removeListener('data', tempListener)
                    proc.stderr.removeListener('data', gameErrorListener)
                }
                const start = Date.now()

                const tempListener = function(data){
                    if(GAME_LAUNCH_REGEX.test(data.trim())){
                        const diff = Date.now()-start
                        if(diff < MIN_LINGER) {
                            setTimeout(onLoadComplete, MIN_LINGER-diff)
                        } else {
                            onLoadComplete()
                        }
                    }
                }

                // Listener for Discord RPC.
                const gameStateChange = function(data){
                    data = data.trim()
                    DiscordWrapper.updateDetails('Rejoins-nous !')
                }

                const gameErrorListener = function(data){
                    data = data.trim()
                    if(data.indexOf('Impossible de trouver ou de charger la classe principale net.minecraft.launchwrapper.Launch') > -1){
                        loggerLaunchSuite.error('Le lancement du jeu a échoué, LaunchWrapper n\'a pas été téléchargé correctement.')
                        showLaunchFailure('Erreur lors du lancement', 'Erreur LaunchWrapper.')
                    }
                }

                try {
                    proc = pb.build()

                    proc.stdout.on('data', tempListener)
                    proc.stderr.on('data', gameErrorListener)

                    setLaunchDetails('Jeu en cours..')
                    launch_progress_label.innerHTML = ""

                    const window = remote.getCurrentWindow()
                    window.minimize()

                } catch(err) {

                    loggerLaunchSuite.error('Erreur lors du lancement', err)
                    showLaunchFailure('Erreur lors du lancement', 'Contactez le support.')

                }
            }

            aEx.disconnect()

        }
    })


    setLaunchDetails('Chargement des informations..')

    refreshDistributionIndex(true, (data) => {
        onDistroRefresh(data)
        serv = data.getServer(ConfigManager.getSelectedServer())
        aEx.send({task: 'execute', function: 'validateEverything', argsArr: [ConfigManager.getSelectedServer(), DistroManager.isDevMode()]})
    }, (err) => {
        loggerLaunchSuite.log('Erreur lors de la récupération d\'une nouvelle copie de l\'index de distribution : ', err)
        refreshDistributionIndex(false, (data) => {
            onDistroRefresh(data)
            serv = data.getServer(ConfigManager.getSelectedServer())
            aEx.send({task: 'execute', function: 'validateEverything', argsArr: [ConfigManager.getSelectedServer(), DistroManager.isDevMode()]})
        }, (err) => {
            loggerLaunchSuite.error('Impossible d\'actualiser l\'index de distribution.', err)
            if(DistroManager.getDistribution() == null){
                showLaunchFailure('Erreur fatal bazooka', 'Impossible de charger une copie de l\'index de distribution. Relancer le launcher.')

                aEx.disconnect()
            } else {
                serv = data.getServer(ConfigManager.getSelectedServer())
                aEx.send({task: 'execute', function: 'validateEverything', argsArr: [ConfigManager.getSelectedServer(), DistroManager.isDevMode()]})
            }
        })
    })
}
