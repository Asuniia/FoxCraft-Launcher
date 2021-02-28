/**
 * AuthManager
 *
 * This module aims to abstract login procedures. Results from Mojang's REST api
 * are retrieved through our Mojang module. These results are processed and stored,
 * if applicable, in the config using the ConfigManager. All login procedures should
 * be made through this module.
 *
 * @module authmanager
 */
// Requirements
const ConfigManager = require('./configmanager')
const LoggerUtil    = require('./loggerutil')
const MineAuthy        = require('./mineauthy')
const logger        = LoggerUtil('%c[AuthManager]', 'color: #a02d2a; font-weight: bold')
const loggerSuccess = LoggerUtil('%c[AuthManager]', 'color: #209b07; font-weight: bold')

// Functions

/**
 * Add an account. This will authenticate the given credentials with Mojang's
 * authserver. The resultant data will be stored as an auth account in the
 * configuration database.
 *
 * @param {string} username The account username (email if migrated).
 * @param {string} password The account password.
 * @returns {Promise.<Object>} Promise which resolves the resolved authenticated account object.
 */
exports.addAccount = async function(username, password){
    try {
        const session = await MineAuthy.authenticate(username, password, ConfigManager.getClientToken())
        const user = await MineAuthy.resolve(session)
        ConfigManager.setToken(session);
        const ret = ConfigManager.addAuthAccount(user.uuid, user.minecraft_token, user.email, user.username,session,user.skin)
            if(ConfigManager.getClientToken() == null){
                ConfigManager.setClientToken(session.minecraft_token)
            }
            ConfigManager.save()
            return ret
    } catch (err){
        return Promise.reject(err)
    }
}

exports.createAccount = async function(username, email, password,skin){
    try {
        const session = await MineAuthy.create(username, email,password, skin)
        console.log(session)
        if(session === true) {
            const session2 = await MineAuthy.authenticate(email, password, ConfigManager.getClientToken())
            console.log("2 :" + session2)
            const user = await MineAuthy.resolve(session2)
            console.log(user)
            ConfigManager.setToken(session2);
            ConfigManager.addAuthAccount(user.uuid, user.minecraft_token, user.email, user.username,session2,user.skin)
            if(ConfigManager.getClientToken() == null){
                ConfigManager.setClientToken(session2.minecraft_token)
            }
            ConfigManager.save()
            return user.uuid;
        }else {
            console.log(session)
            return Promise.reject(session)
        }
    } catch (err){
        return Promise.reject(err)
    }
}

/**
 * Remove an account. This will invalidate the access token associated
 * with the account and then remove it from the database.
 *
 * @param {string} uuid The UUID of the account to be removed.
 * @returns {Promise.<void>} Promise which resolves to void when the action is complete.
 */
exports.removeAccount = async function(uuid){
    try {
        ConfigManager.removeAuthAccount(uuid)
        ConfigManager.save()
        return Promise.resolve()
    } catch (err){
        return Promise.reject(err)
    }
}

/**
 * Validate the selected account with Mojang's authserver. If the account is not valid,
 * we will attempt to refresh the access token and update that value. If that fails, a
 * new login will be required.
 *
 * **Function is WIP**
 *
 * @returns {Promise.<boolean>} Promise which resolves to true if the access token is valid,
 * otherwise false.
 */
exports.getuser = async function(token){
        try {
            const session = await MineAuthy.refresh(token)
            console.log(session.ip)
        } catch(err) {
            logger.debug('Error while validating selected profile:', err)
            if(err && err.error === 'ForbiddenOperationException'){
                // What do we do?
            }
            ConfigManager.removeAllAuthAccount();
            ConfigManager.save()
            switchView(currentView,VIEWS.login)
            logger.log('Account access token is invalid.')
            return true
        }
        loggerSuccess.log('Account access token validated.')
        return false
}

exports.validauth = async function(token){
    const session = await MineAuthy.validate(token)
    try {
        console.log("Access server : " + session);
    } catch(err) {
        loggerSuccess.log('Account access server is validated.',err)
        return session
    }
    logger.log('Account access server is invalidated.')
    return session
}