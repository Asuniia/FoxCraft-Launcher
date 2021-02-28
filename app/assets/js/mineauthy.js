const request = require('request')
const logger  = require('./loggerutil')('%c[Mojang]', 'color: #a02d2a; font-weight: bold')

const authpath = 'https://foxrepo.aktech.fr'

exports.authenticate = function(username, password){
    return new Promise((resolve, reject) => {

        request.post(authpath + '/api/v1/user/generate_token',
            {
                json: true,
                headers: {
                    "X-Email":username,
                    "X-Password":password,
                }
            },
            function(error, response, body){
                if(error){
                    logger.error('Error during authentication.', error)
                    reject(error)
                } else {
                    if(response.statusCode === 200){
                        resolve(body.token)
                    } else {
                        console.log("AIE :" + response.body)
                        reject(body || {code: 'ENOTFOUND'})
                    }
                }
            })
    })
}

exports.create = function(username, email,password,skin){
    return new Promise((resolve, reject) => {

        request.post(authpath + '/api/v1/user/create',
            {
                json: true,
                headers: {
                    "Content-Type":"application/json"
                },
                body: {
                    username,
                    email,
                    password,
                    skin
                }
            },
            function(error, response, body){
                if(error){
                    logger.error('Error during creation : ', error)
                    reject(error)
                } else {
                    if(response.statusCode === 200){
                        resolve(true)
                    } else {
                        console.log("?? : " + response.body)
                        reject(body || {code: 'ENOTFOUND'})
                    }
                }
            })
    })
}


exports.resolve = function(token){
    return new Promise((resolve, reject) => {

        request.post(authpath + '/api/v1/user/get',
            {
                json: true,
                headers: {
                    "X-Token":token,
                }
            },
            function(error, response, body){
                if(error){
                    logger.error('Error during authentication.', error)
                    reject(error)
                } else {
                    if(response.statusCode === 200){
                        resolve(body)
                    } else {
                        console.log(body)
                        reject(body || {code: 'ENOTFOUND'})
                    }
                }
            })
    })
}


exports.validate = function(token){
    return new Promise((resolve, reject) => {
        request.post(authpath + '/api/v1/user/minecraft/send_connection',
            {
                json: true,
                headers: {
                    "X-Token":token
                }
            },
            function(error, response,body){
                if(error){
                    logger.error('Error during validation.', error)
                    reject(error)
                } else {
                    if(response.statusCode === 401 || response.statusCode === 400){
                        resolve(false)
                    } else {
                        resolve(true)
                    }
                }
            })
    })
}

exports.refresh = function(token){
    return new Promise((resolve, reject) => {
        request.post(authpath + '/api/v1/user/get',
            {
                json: true,
                headers: {
                    "X-Token": token,
                }
            },
            function(error, response, body){
                if(error){
                    logger.error('Error during refresh.', error)
                    reject(error)
                } else {
                    if(response.statusCode === 200){
                        resolve(body)
                    } else {
                        reject(body)
                    }
                }
            })
    })
}