const validRegisterUsername         = /^[a-zA-Z0-9_]{1,16}$/
const basicRegisterEmail            = /^\S+@\S+\.\S+$/

const registerEmail  = document.getElementById('registerEmail')
const registerUsername         = document.getElementById('registerUsername')
const registerPassword         = document.getElementById('registerPassword')
const registerSkin         = document.getElementById('registerSkin')
const registerFormButton           = document.getElementById('registerFormButton')
const registerForm             = document.getElementById('registerForm')

const registerEmailError       = document.getElementById('registerEmailError')
const registerPasswordError    = document.getElementById('registerPasswordError')

let lu1 = false, lp1 = false

const loggerRegister = LoggerUtil('%c[Register]', 'color: #000668; font-weight: bold')

function resolveError(err){
    if(err.message != null){
        if(err.message === 'Null request'){
            return {
                title: Lang.queryJS('login.error.invalidCredentials.title'),
                desc: Lang.queryJS('login.error.invalidCredentials.desc')
            }
        } else if(err.message === 'Username already exist in database') {
            return {
                title: Lang.queryJS('login.error.alreadyUsernameAccount.title'),
                desc: Lang.queryJS('login.error.alreadyUsernameAccount.desc')
            }
        } else if(err.message === 'Email already exist in database') {
            return {
                title: Lang.queryJS('login.error.alreadyEmailAccount.title'),
                desc: Lang.queryJS('login.error.alreadyEmailAccount.desc')
            }
        } else {
            return {
                title: Lang.queryJS('login.error.unknown.title'),
                desc: err.message
            }
        }
    } else {
        return {
            title: err.error,
            desc: err.errorMessage
        }
    }
}



function showError(element, value){
    element.innerHTML = value
    element.style.opacity = 1
}

function shakeError(element){
    if(element.style.opacity == 1){
        element.classList.remove('shake')
        void element.offsetWidth
        element.classList.add('shake')
    }
}

function validateUsername(value){
    if(value){
        if(validRegisterUsername.test(value)){
            toast(Lang.queryJS('login.error.invalidValue'), 'error')

            registerDisabled(true)
            lu1 = false
        } else {
            registerEmailError.style.opacity = 0
            lu1 = true
            if(lp1){
                registerDisabled(false)
            }
        }
    } else {
        lu1 = false
        toast(Lang.queryJS('login.error.requiredValue'), 'error')
        registerDisabled(true)
    }
}

function validateEmail(value){
    if(value){
        if(!basicRegisterEmail.test(value) && !validRegisterUsername.test(value)){
            toast(Lang.queryJS('login.error.requiredValue'), 'error')
            registerDisabled(true)
            lu1 = false
        } else {
            registerEmailError.style.opacity = 0
            lu1 = true
            if(lp1){
                registerDisabled(false)
            }
        }
    } else {
        lu1 = false
        toast(Lang.queryJS('login.error.requiredValue'), 'error')
        registerDisabled(true)
    }
}

function validatePassword(value){
    if(value){
        registerPasswordError.style.opacity = 0
        lp1 = true
        if(lu1){
            registerDisabled(false)
        }
    } else {
        lp1 = false
        toast(Lang.queryJS('login.error.invalidValue'), 'error')

        registerDisabled(true)
    }
}

registerUsername.addEventListener('focusout', (e) => {
    validateUsername(e.target.value)
    shakeError(registerEmailError)
})

registerEmail.addEventListener('focusout', (e) => {
    validateEmail(e.target.value)
    shakeError(registerEmailError)
})

registerPassword.addEventListener('focusout', (e) => {
    validatePassword(e.target.value)
    shakeError(registerPasswordError)
})

registerUsername.addEventListener('input', (e) => {
    validateUsername(e.target.value)
})

registerEmail.addEventListener('input', (e) => {
    validateEmail(e.target.value)
})

registerPassword.addEventListener('input', (e) => {
    validatePassword(e.target.value)
})

function registerDisabled(v){
    if(registerFormButton.disabled !== v){
        registerFormButton.disabled = v
    }
}


function registerLoading(v){
    if(v){
        registerFormButton.setAttribute('loading', v)
        registerFormButton.innerHTML = registerFormButton.innerHTML.replace(Lang.queryJS('login.incrise'), Lang.queryJS('login.incrisIn'))
    } else {
        registerFormButton.removeAttribute('loading')
        registerFormButton.innerHTML = registerFormButton.innerHTML.replace(Lang.queryJS('login.incrisIn'), Lang.queryJS('login.incrise'))
    }
}

function formDisabled(v){
    registerDisabled(v)
    registerUsername.disabled = v
    registerEmail.disabled = v
    registerPassword.disabled = v
}

function toast(message, type) {
    let toastCode = '<div class="toast ' + type + '">'
    toastCode += message
    toastCode += '</div>'

    $('.toastWrap').prepend(toastCode)
}

function resolveErrorRegister(err){
    console.log("REGISTER ERROR " + err.message)
            if(err.message != null) {
                if(err.message === 'InvalidCrendentials'){
                    return {
                        title: Lang.queryJS('login.error.invalidCredentials.title'),
                        desc: Lang.queryJS('login.error.invalidCredentials.desc')
                    }
                } else if(err.message === "Unauthorised Request") {
                    return {
                        title: Lang.queryJS('login.error.incorrectAccount.title'),
                        desc: Lang.queryJS('login.error.incorrectAccount.desc')
                    }
                } else if(err.message === "Email already exist in database") {
                    return {
                        title: Lang.queryJS('login.error.alreadyEmailAccount.title'),
                        desc: Lang.queryJS('login.error.alreadyEmailAccount.desc')
                    }
                } else if(err.message === "Username already exist in database") {
                    return {
                        title: Lang.queryJS('login.error.alreadyUsernameAccount.title'),
                        desc: Lang.queryJS('login.error.alreadyUsernameAccount.desc')
                    }
                }else if(err.message === "Why") {
                    return {
                        title: Lang.queryJS('login.error.unknown.title'),
                        desc: Lang.queryJS(err.errorMessage)
                    }
                } else if (err.code === 'ENOTFOUND') {
                    return {
                        title: Lang.queryJS('login.error.authDown.title'),
                        desc: Lang.queryJS('login.error.authDown.desc')

                }
            }
    }
    if(err.message != null){
        if(err.message === 'NotPaidAccount'){
            return {
                title: Lang.queryJS('login.error.notPaid.title'),
                desc: Lang.queryJS('login.error.notPaid.desc')
            }
        } else {
            return {
                title: Lang.queryJS('login.error.unknown.title'),
                desc: err.message
            }
        }
    } else {
        return {
            title: err.error,
            desc: err.errorMessage
        }
    }
}

let registerViewOnSuccess = VIEWS.landing
let registerViewOnCancel = VIEWS.login
let registerViewCancelHandler

function loginCancelEnabled(val){
    if(val){
        $(registerCancelContainer).show()
    } else {
        $(registerCancelContainer).hide()
    }
}

registerCancelButton.onclick = (e) => {
    switchView(getCurrentView(), registerViewOnCancel, 500, 500, () => {
        registerUsername.value = ''
        registerEmail.value = ''
        registerPassword.value = ''
        if(registerViewCancelHandler != null){
            registerViewCancelHandler()
            registerViewCancelHandler = null
        }
    })
}

registerForm.onsubmit = () => { return false }

registerFormButton.addEventListener('click', () => {

    formDisabled(true)
    registerLoading(true)

    AuthManager.createAccount(registerUsername.value,registerEmail.value, registerPassword.value,registerSkin.value).then((value) => {
        console.log("RESULT : " + value)
        updateSelectedAccount(value)
        registerFormButton.innerHTML = registerForm.innerHTML.replace(Lang.queryJS('login.incrisIn'), Lang.queryJS('login.incris'))
        $('.circle-loader').toggleClass('load-complete')
        $('.checkmark').toggle()
        setTimeout(() => {
            switchView(VIEWS.register, VIEWS.landing, 500, 500, () => {
                if(registerViewOnSuccess === VIEWS.settings){
                    prepareSettings()
                }
                registerViewOnSuccess = VIEWS.landing
                loginCancelEnabled(false)
                registerViewCancelHandler = null
                registerUsername.value = ''
                registerEmail.value = ''
                registerPassword.value = ''
                $('.circle-loader').toggleClass('load-complete')
                $('.checkmark').toggle()
                loginLoading(false)
                registerFormButton.innerHTML = registerFormButton.innerHTML.replace(Lang.queryJS('login.incris'), Lang.queryJS('login.incrise'))
                formDisabled(false)


            })
        }, 1000)
    }).catch((err) => {
        loginLoading(false)
        const errF = resolveErrorRegister(err)
        setOverlayContent(errF.title, errF.desc, Lang.queryJS('login.tryAgain'))
        setOverlayHandler(() => {
            formDisabled(false)
            toggleOverlay(false)
        })
        toggleOverlay(true)
        loggerRegister.log('Error while sign up.', err)
    })

})


