const {ipcRenderer} = require('electron')
const fs            = require('fs-extra')
const os            = require('os')
const path          = require('path')

const ConfigManager = require('./configmanager')
const DistroManager = require('./distromanager')
const LangLoader    = require('./langloader')
const MineAuthy = require('./mineauthy')
const AuthManager = require('./authmanager')
const logger        = require('./loggerutil')('%c[Preloader]', 'color: #a02d2a; font-weight: bold')

logger.log('Chargement en cours..')

ConfigManager.load()

LangLoader.loadLanguage('fr_FR')
function onDistroLoad(data){
    if(data != null){

        if(ConfigManager.getSelectedServer() == null || data.getServer(ConfigManager.getSelectedServer()) == null){
            logger.log('Détermination du serveur sélectionné par défaut..')
            ConfigManager.setSelectedServer(data.getMainServer().getID())
            ConfigManager.save()
        }
    }
    ipcRenderer.send('distributionIndexDone', data != null)
}


DistroManager.pullRemote().then((data) => {
    logger.log('Index de distribution chargé.')
    onDistroLoad(data)

}).catch((err) => {
    logger.log('Échec du chargement de l\'index de distribution.')
    logger.error(err)

    logger.log('Tentative de chargement d\'une ancienne version de l\'index de distribution.')
    DistroManager.pullLocal().then((data) => {
        logger.log('Chargement réussi d\'une ancienne version de l\'index de distribution.')
        onDistroLoad(data)


    }).catch((err) => {

        logger.log('Échec du chargement d\'une ancienne version de l\'index de distribution.')
        logger.log('L\'application ne peut pas s\'exécuter.')
        logger.error(err)

        onDistroLoad(null)

    })

})


fs.remove(path.join(os.tmpdir(), ConfigManager.getTempNativeFolder()), (err) => {
    if(err){
        logger.warn('Erreur lors du nettoyage du répertoire natif', err)
    } else {
        logger.log('Répertoire natif nettoyé.')
    }
})