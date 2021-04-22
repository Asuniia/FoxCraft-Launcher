const os = require('os')
const semver = require('semver')

const {JavaGuard} = require('./assets/js/assetguard')
const DropinModUtil = require('./assets/js/dropinmodutil')

const settingsState = {
    invalid: new Set()
}

function bindSettingsSelect() {
    for (let ele of document.getElementsByClassName('settingsSelectContainer')) {
        const selectedDiv = ele.getElementsByClassName('settingsSelectSelected')[0]

        selectedDiv.onclick = (e) => {
            e.stopPropagation()
            closeSettingsSelect(e.target)
            e.target.nextElementSibling.toggleAttribute('hidden')
            e.target.classList.toggle('select-arrow-active')
        }
    }
}

function closeSettingsSelect(el) {
    for (let ele of document.getElementsByClassName('settingsSelectContainer')) {
        const selectedDiv = ele.getElementsByClassName('settingsSelectSelected')[0]
        const optionsDiv = ele.getElementsByClassName('settingsSelectOptions')[0]

        if (!(selectedDiv === el)) {
            selectedDiv.classList.remove('select-arrow-active')
            optionsDiv.setAttribute('hidden', '')
        }
    }
}

document.addEventListener('click', closeSettingsSelect)

bindSettingsSelect()


function bindFileSelectors() {
    for (let ele of document.getElementsByClassName('settingsFileSelButton')) {

        ele.onclick = async e => {
            const isJavaExecSel = ele.id === 'settingsJavaExecSel'
            const directoryDialog = ele.hasAttribute('dialogDirectory') && ele.getAttribute('dialogDirectory') == 'true'
            const properties = directoryDialog ? ['openDirectory', 'createDirectory'] : ['openFile']

            const options = {
                properties
            }

            if (ele.hasAttribute('dialogTitle')) {
                options.title = ele.getAttribute('dialogTitle')
            }

            if (isJavaExecSel && process.platform === 'win32') {
                options.filters = [
                    {name: 'Executables', extensions: ['exe']},
                    {name: 'All Files', extensions: ['*']}
                ]
            }

            const res = await remote.dialog.showOpenDialog(remote.getCurrentWindow(), options)
            if (!res.canceled) {
                ele.previousElementSibling.value = res.filePaths[0]
                if (isJavaExecSel) {
                    populateJavaExecDetails(ele.previousElementSibling.value)
                }
            }
        }
    }
}

bindFileSelectors()

function initSettingsValidators() {
    const sEls = document.getElementById('settingsContainer').querySelectorAll('[cValue]')
    Array.from(sEls).map((v, index, arr) => {
        const vFn = ConfigManager['validate' + v.getAttribute('cValue')]
        if (typeof vFn === 'function') {
            if (v.tagName === 'INPUT') {
                if (v.type === 'number' || v.type === 'text') {
                    v.addEventListener('keyup', (e) => {
                        const v = e.target
                        if (!vFn(v.value)) {
                            settingsState.invalid.add(v.id)
                            v.setAttribute('error', '')
                            settingsSaveDisabled(true)
                        } else {
                            if (v.hasAttribute('error')) {
                                v.removeAttribute('error')
                                settingsState.invalid.delete(v.id)
                                if (settingsState.invalid.size === 0) {
                                    settingsSaveDisabled(false)
                                }
                            }
                        }
                    })
                }
            }
        }

    })
}

function initSettingsValues() {
    const sEls = document.getElementById('settingsContainer').querySelectorAll('[cValue]')
    Array.from(sEls).map((v, index, arr) => {
        const cVal = v.getAttribute('cValue')
        const gFn = ConfigManager['get' + cVal]
        if (typeof gFn === 'function') {
            if (v.tagName === 'INPUT') {
                if (v.type === 'number' || v.type === 'text') {
                    // Special Conditions
                    if (cVal === 'JavaExecutable') {
                        populateJavaExecDetails(v.value)
                        v.value = gFn()
                    } else if (cVal === 'DataDirectory') {
                        v.value = gFn()
                    } else if (cVal === 'JVMOptions') {
                        v.value = gFn().join(' ')
                    } else if(cVal === "ThemeMode") {
                        console.log("Je t'ai trouvé !")
                    } else if(cVal === "Fullscreen") {
                        console.log("Je t'ai trouvé !")
                    } else {
                        v.value = gFn()
                    }
                } else if (v.type === 'checkbox') {
                    v.checked = gFn()
                }
            } else if (v.tagName === 'DIV') {
                if (v.classList.contains('rangeSlider')) {
                    // Special Conditions
                    if (cVal === 'MinRAM' || cVal === 'MaxRAM') {
                        let val = gFn()
                        if (val.endsWith('M')) {
                            val = Number(val.substring(0, val.length - 1)) / 1000
                        } else {
                            val = Number.parseFloat(val)
                        }

                        v.setAttribute('value', val)
                    } else {
                        v.setAttribute('value', Number.parseFloat(gFn()))
                    }
                }
            }
        }

    })
}

function saveSettingsValues() {
    const sEls = document.getElementById('settingsContainer').querySelectorAll('[cValue]')
    Array.from(sEls).map((v, index, arr) => {
        const cVal = v.getAttribute('cValue')
        const sFn = ConfigManager['set' + cVal]
        if (typeof sFn === 'function') {
            if (v.tagName === 'INPUT') {
                if (v.type === 'number' || v.type === 'text') {
                    if (cVal === 'JVMOptions') {
                        sFn(v.value.split(' '))
                    } else {
                        sFn(v.value)
                    }
                } else if (v.type === 'checkbox') {
                    sFn(v.checked)
                    if (cVal === 'AllowPrerelease') {
                        changeAllowPrerelease(v.checked)
                    }
                    sFn(v.checked)
                    if(cVal === 'setThemeMode') {
                        console.log(cVal)
                    } else if(cVal === 'setFullscreen') {
                        console.log(cVal)
                    }
                }
            } else if (v.tagName === 'DIV') {
                if (v.classList.contains('rangeSlider')) {
                    if (cVal === 'MinRAM' || cVal === 'MaxRAM') {
                        let val = Number(v.getAttribute('value'))
                        if (val % 1 > 0) {
                            val = val * 1000 + 'M'
                        } else {
                            val = val + 'G'
                        }

                        sFn(val)
                    } else {
                        sFn(v.getAttribute('value'))
                    }
                }
            }
        }
    })
}

let selectedSettingsTab = 'settingsTabAccount'

function settingsTabScrollListener(e) {
    if (e.target.scrollTop > Number.parseFloat(getComputedStyle(e.target.firstElementChild).marginTop)) {
        document.getElementById('settingsContainer').setAttribute('scrolled', '')
    } else {
        document.getElementById('settingsContainer').removeAttribute('scrolled')
    }
}

function setupSettingsTabs() {
    Array.from(document.getElementsByClassName('settingsNavItem')).map((val) => {
        if (val.hasAttribute('rSc')) {
            val.onclick = () => {
                settingsNavItemListener(val)
            }
        }
    })
}

function settingsNavItemListener(ele, fade = true) {
    if (ele.hasAttribute('selected')) {
        return
    }
    const navItems = document.getElementsByClassName('settingsNavItem')
    for (let i = 0; i < navItems.length; i++) {
        if (navItems[i].hasAttribute('selected')) {
            navItems[i].removeAttribute('selected')
        }
    }
    ele.setAttribute('selected', '')
    let prevTab = selectedSettingsTab
    selectedSettingsTab = ele.getAttribute('rSc')

    document.getElementById(prevTab).onscroll = null
    document.getElementById(selectedSettingsTab).onscroll = settingsTabScrollListener

    if (fade) {
        $(`#${prevTab}`).fadeOut(250, () => {
            $(`#${selectedSettingsTab}`).fadeIn({
                duration: 250,
                start: () => {
                    settingsTabScrollListener({
                        target: document.getElementById(selectedSettingsTab)
                    })
                }
            })
        })
    } else {
        $(`#${prevTab}`).hide(0, () => {
            $(`#${selectedSettingsTab}`).show({
                duration: 0,
                start: () => {
                    settingsTabScrollListener({
                        target: document.getElementById(selectedSettingsTab)
                    })
                }
            })
        })
    }
}

const settingsNavDone = document.getElementById('settingsNavDone')

function settingsSaveDisabled(v) {
    settingsNavDone.disabled = v
}

settingsNavDone.onclick = () => {
    saveSettingsValues()
    saveModConfiguration()
    ConfigManager.save()
    saveDropinModConfiguration()
    saveShaderpackSettings()
    switchView(getCurrentView(), VIEWS.landing)
    //    switchView(getCurrentView(), getBackView())
}

function bindAuthAccountSelect() {
    Array.from(document.getElementsByClassName('settingsAuthAccountSelect')).map((val) => {
        val.onclick = (e) => {
            if (val.hasAttribute('selected')) {
                return
            }
            const selectBtns = document.getElementsByClassName('settingsAuthAccountSelect')
            for (let i = 0; i < selectBtns.length; i++) {
                if (selectBtns[i].hasAttribute('selected')) {
                    selectBtns[i].removeAttribute('selected')
                    selectBtns[i].innerHTML = 'Select Account'
                }
            }
            val.setAttribute('selected', '')
            val.innerHTML = 'Selected Account &#10004;'
            setSelectedAccount(val.closest('.settingsAuthAccount').getAttribute('uuid'))
        }
    })
}

function bindAuthAccountLogOut() {
    Array.from(document.getElementsByClassName('settingsAuthAccountLogOut')).map((val) => {
        val.onclick = (e) => {
            let isLastAccount = false
            if (Object.keys(ConfigManager.getAuthAccounts()).length === 1) {
                isLastAccount = true
                setOverlayContent(
                    'Déconnexion',
                    'Afin de pouvoir re-profiter de FoxCraft, vous devez être connecté.',
                    'Je confime !',
                    'Annuler'
                )
                setOverlayHandler(() => {
                    processLogOut(val, isLastAccount)
                    toggleOverlay(false)
                    switchView(getCurrentView(), VIEWS.login)
                })
                setDismissHandler(() => {
                    toggleOverlay(false)
                })
                toggleOverlay(true, true)
            } else {
                processLogOut(val, isLastAccount)
            }

        }
    })
}

function processLogOut(val, isLastAccount) {
    const parent = val.closest('.settingsAuthAccount')
    const uuid = parent.getAttribute('uuid')
    const prevSelAcc = ConfigManager.getSelectedAccount()
    AuthManager.removeAccount(uuid).then(() => {
        if (!isLastAccount && uuid === prevSelAcc.uuid) {
            const selAcc = ConfigManager.getSelectedAccount()
            refreshAuthAccountSelected(selAcc.uuid)
            updateSelectedAccount(selAcc)
            validateSelectedAccount()
        }
    })
    $(parent).fadeOut(250, () => {
        parent.remove()
    })
}

function refreshAuthAccountSelected(uuid) {
    Array.from(document.getElementsByClassName('settingsAuthAccount')).map((val) => {
        const selBtn = val.getElementsByClassName('settingsAuthAccountSelect')[0]
        if (uuid === val.getAttribute('uuid')) {
            selBtn.setAttribute('selected', '')
            selBtn.innerHTML = 'Selected Account &#10004;'
        } else {
            if (selBtn.hasAttribute('selected')) {
                selBtn.removeAttribute('selected')
            }
            selBtn.innerHTML = 'Select Account'
        }
    })
}

const settingsCurrentAccounts = document.getElementById('settingsCurrentAccounts')

function populateAuthAccounts() {
    const authAccounts = ConfigManager.getAuthAccounts()
    const authKeys = Object.keys(authAccounts)
    if (authKeys.length === 0) {
        return
    }
    const selectedUUID = ConfigManager.getSelectedAccount().uuid

    let authAccountStr = ''

    authKeys.map((val) => {
        const acc = authAccounts[val]
        authAccountStr += `<div class="settingsAuthAccount shadow-lg rounded-2xl w-80 p-4 bg-white dark:bg-gray-800" uuid="${acc.uuid}">

                                    <div class="flex flex-row justify-center">
                                       <img class="settingsAuthAccountImage w-36 h-28 rounded-lg" alt="${acc.displayName}" src="https://cravatar.eu/avatar/${acc.skin}/64.png">
                                        <div class="h-28 w-full flex flex-col justify-between">
                                            <div>
                                                <p class="settingsAuthAccountDetailValue text-gray-800 dark:text-white text-xl font-medium">
                                                    ${acc.displayName}
                                                </p>
                                                <p class="text-gray-400 text-xs">
                                                    Email : ${acc.username}
                                                </p>
                                                <p class="text-gray-400 text-xs">
                                                    Skin : ${acc.skin}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

       
                                                <div class="flex items-center justify-between gap-4 mt-6">
                                        <button type="button" class="settingsAuthAccountLogOut w-full px-4 py-2 text-base border rounded-lg text-white bg-red-500 hover:bg-red-600 ">
                                            Déconnexion
                                        </button>
                                    </div>
        </div>`
    })


    settingsCurrentAccounts.innerHTML = authAccountStr
}

function prepareAccountsTab() {
    populateAuthAccounts()
    bindAuthAccountSelect()
    bindAuthAccountLogOut()
}


const settingsModsContainer = document.getElementById('settingsModsContainer')

/**
 * Resolve and update the mods on the UI.
 */
function resolveModsForUI() {
    const serv = ConfigManager.getSelectedServer()

    const distro = DistroManager.getDistribution()
    const servConf = ConfigManager.getModConfiguration(serv)

    const modStr = parseModulesForUI(distro.getServer(serv).getModules(), false, servConf.mods)

    document.getElementById('settingsReqModsContent').innerHTML = modStr.reqMods
    document.getElementById('settingsOptModsContent').innerHTML = modStr.optMods
}

function parseModulesForUI(mdls, submodules, servConf) {

    let reqMods = ''
    let optMods = ''

    for (const mdl of mdls) {

        if (mdl.getType() === DistroManager.Types.ForgeMod || mdl.getType() === DistroManager.Types.LiteMod || mdl.getType() === DistroManager.Types.LiteLoader) {

            if (mdl.getRequired().isRequired()) {

                reqMods += `<div id="${mdl.getVersionlessID()}" class="settingsBaseMod settings${submodules ? 'Sub' : ''}Mod" enabled>
                    <div class="settingsModContent">
                        <div class="settingsModMainWrapper">
                            <div class="settingsModStatus"></div>
                            <div class="settingsModDetails">
                                <span class="settingsModName">${mdl.getName()}</span>
                                <span class="settingsModVersion">v${mdl.getVersion()}</span>
                            </div>
                        </div>
                        <label class="toggleSwitch" reqmod>
                            <input type="checkbox" checked>
                            <span class="toggleSwitchSlider"></span>
                        </label>
                    </div>
                    ${mdl.hasSubModules() ? `<div class="settingsSubModContainer">
                        ${Object.values(parseModulesForUI(mdl.getSubModules(), true, servConf[mdl.getVersionlessID()])).join('')}
                    </div>` : ''}
                </div>`

            } else {

                const conf = servConf[mdl.getVersionlessID()]
                const val = typeof conf === 'object' ? conf.value : conf

                optMods += `<div id="${mdl.getVersionlessID()}" class="settingsBaseMod settings${submodules ? 'Sub' : ''}Mod" ${val ? 'enabled' : ''}>
                    <div class="settingsModContent">
                        <div class="settingsModMainWrapper">
                            <div class="settingsModStatus"></div>
                            <div class="settingsModDetails">
                                <span class="settingsModName">${mdl.getName()}</span>
                                <span class="settingsModVersion">v${mdl.getVersion()}</span>
                            </div>
                        </div>
                        <label class="toggleSwitch">
                            <input type="checkbox" formod="${mdl.getVersionlessID()}" ${val ? 'checked' : ''}>
                            <span class="toggleSwitchSlider"></span>
                        </label>
                    </div>
                    ${mdl.hasSubModules() ? `<div class="settingsSubModContainer">
                        ${Object.values(parseModulesForUI(mdl.getSubModules(), true, conf.mods)).join('')}
                    </div>` : ''}
                </div>`

            }
        }
    }

    return {
        reqMods,
        optMods
    }

}


function bindModsToggleSwitch() {
    const sEls = settingsModsContainer.querySelectorAll('[formod]')
    Array.from(sEls).map((v, index, arr) => {
        v.onchange = () => {
            if (v.checked) {
                document.getElementById(v.getAttribute('formod')).setAttribute('enabled', '')
            } else {
                document.getElementById(v.getAttribute('formod')).removeAttribute('enabled')
            }
        }
    })
}

function saveModConfiguration() {
    const serv = ConfigManager.getSelectedServer()
    const modConf = ConfigManager.getModConfiguration(serv)
    modConf.mods = _saveModConfiguration(modConf.mods)
    ConfigManager.setModConfiguration(serv, modConf)
}

function _saveModConfiguration(modConf) {
    for (let m of Object.entries(modConf)) {
        const tSwitch = settingsModsContainer.querySelectorAll(`[formod='${m[0]}']`)
        if (!tSwitch[0].hasAttribute('dropin')) {
            if (typeof m[1] === 'boolean') {
                modConf[m[0]] = tSwitch[0].checked
            } else {
                if (m[1] != null) {
                    if (tSwitch.length > 0) {
                        modConf[m[0]].value = tSwitch[0].checked
                    }
                    modConf[m[0]].mods = _saveModConfiguration(modConf[m[0]].mods)
                }
            }
        }
    }
    return modConf
}


let CACHE_SETTINGS_MODS_DIR
let CACHE_DROPIN_MODS

function resolveDropinModsForUI() {
    const serv = DistroManager.getDistribution().getServer(ConfigManager.getSelectedServer())
    CACHE_SETTINGS_MODS_DIR = path.join(ConfigManager.getInstanceDirectory(), serv.getID(), 'mods')
    CACHE_DROPIN_MODS = DropinModUtil.scanForDropinMods(CACHE_SETTINGS_MODS_DIR, serv.getMinecraftVersion())

    let dropinMods = ''

    for (dropin of CACHE_DROPIN_MODS) {
        dropinMods += `<div id="${dropin.fullName}" class="settingsBaseMod settingsDropinMod" ${!dropin.disabled ? 'enabled' : ''}>
                    <div class="settingsModContent">
                        <div class="settingsModMainWrapper">
                            <div class="settingsModStatus"></div>
                            <div class="settingsModDetails">
                                <span class="settingsModName">${dropin.name}</span>
                                <div class="settingsDropinRemoveWrapper">
                                    <button class="settingsDropinRemoveButton" remmod="${dropin.fullName}">Remove</button>
                                </div>
                            </div>
                        </div>
                        <label class="toggleSwitch">
                            <input type="checkbox" formod="${dropin.fullName}" dropin ${!dropin.disabled ? 'checked' : ''}>
                            <span class="toggleSwitchSlider"></span>
                        </label>
                    </div>
                </div>`
    }

    document.getElementById('settingsDropinModsContent').innerHTML = dropinMods
}

function bindDropinModsRemoveButton() {
    const sEls = settingsModsContainer.querySelectorAll('[remmod]')
    Array.from(sEls).map((v, index, arr) => {
        v.onclick = () => {
            const fullName = v.getAttribute('remmod')
            const res = DropinModUtil.deleteDropinMod(CACHE_SETTINGS_MODS_DIR, fullName)
            if (res) {
                document.getElementById(fullName).remove()
            } else {
                setOverlayContent(
                    `Failed to Delete<br>Drop-in Mod ${fullName}`,
                    'Make sure the file is not in use and try again.',
                    'Okay'
                )
                setOverlayHandler(null)
                toggleOverlay(true)
            }
        }
    })
}

function bindDropinModFileSystemButton() {
    const fsBtn = document.getElementById('settingsDropinFileSystemButton')
    fsBtn.onclick = () => {
        DropinModUtil.validateDir(CACHE_SETTINGS_MODS_DIR)
        shell.openPath(CACHE_SETTINGS_MODS_DIR)
    }
    fsBtn.ondragenter = e => {
        e.dataTransfer.dropEffect = 'move'
        fsBtn.setAttribute('drag', '')
        e.preventDefault()
    }
    fsBtn.ondragover = e => {
        e.preventDefault()
    }
    fsBtn.ondragleave = e => {
        fsBtn.removeAttribute('drag')
    }

    fsBtn.ondrop = e => {
        fsBtn.removeAttribute('drag')
        e.preventDefault()

        DropinModUtil.addDropinMods(e.dataTransfer.files, CACHE_SETTINGS_MODS_DIR)
        reloadDropinMods()
    }
}

function saveDropinModConfiguration() {
    for (dropin of CACHE_DROPIN_MODS) {
        const dropinUI = document.getElementById(dropin.fullName)
        if (dropinUI != null) {
            const dropinUIEnabled = dropinUI.hasAttribute('enabled')
            if (DropinModUtil.isDropinModEnabled(dropin.fullName) != dropinUIEnabled) {
                DropinModUtil.toggleDropinMod(CACHE_SETTINGS_MODS_DIR, dropin.fullName, dropinUIEnabled).catch(err => {
                    if (!isOverlayVisible()) {
                        setOverlayContent(
                            'Failed to Toggle<br>One or More Drop-in Mods',
                            err.message,
                            'Okay'
                        )
                        setOverlayHandler(null)
                        toggleOverlay(true)
                    }
                })
            }
        }
    }
}

document.addEventListener('keydown', (e) => {
    if (getCurrentView() === VIEWS.settings && selectedSettingsTab === 'settingsTabMods') {
        if (e.key === 'F5') {
            reloadDropinMods()
            saveShaderpackSettings()
            resolveShaderpacksForUI()
        }
    }
})

function reloadDropinMods() {
    resolveDropinModsForUI()
    bindDropinModsRemoveButton()
    bindDropinModFileSystemButton()
    bindModsToggleSwitch()
}


let CACHE_SETTINGS_INSTANCE_DIR
let CACHE_SHADERPACKS
let CACHE_SELECTED_SHADERPACK

function resolveShaderpacksForUI() {
    const serv = DistroManager.getDistribution().getServer(ConfigManager.getSelectedServer())
    CACHE_SETTINGS_INSTANCE_DIR = path.join(ConfigManager.getInstanceDirectory(), serv.getID())
    CACHE_SHADERPACKS = DropinModUtil.scanForShaderpacks(CACHE_SETTINGS_INSTANCE_DIR)
    CACHE_SELECTED_SHADERPACK = DropinModUtil.getEnabledShaderpack(CACHE_SETTINGS_INSTANCE_DIR)

    setShadersOptions(CACHE_SHADERPACKS, CACHE_SELECTED_SHADERPACK)
}

function setShadersOptions(arr, selected) {
    const cont = document.getElementById('settingsShadersOptions')
    cont.innerHTML = ''
    for (let opt of arr) {
        const d = document.createElement('DIV')
        d.innerHTML = opt.name
        d.setAttribute('value', opt.fullName)
        if (opt.fullName === selected) {
            d.setAttribute('selected', '')
            document.getElementById('settingsShadersSelected').innerHTML = opt.name
        }
        d.addEventListener('click', function (e) {
            this.parentNode.previousElementSibling.innerHTML = this.innerHTML
            for (let sib of this.parentNode.children) {
                sib.removeAttribute('selected')
            }
            this.setAttribute('selected', '')
            closeSettingsSelect()
        })
        cont.appendChild(d)
    }
}

function saveShaderpackSettings() {
    let sel = 'OFF'
    for (let opt of document.getElementById('settingsShadersOptions').childNodes) {
        if (opt.hasAttribute('selected')) {
            sel = opt.getAttribute('value')
        }
    }
    DropinModUtil.setEnabledShaderpack(CACHE_SETTINGS_INSTANCE_DIR, sel)
}

function bindShaderpackButton() {
    const spBtn = document.getElementById('settingsShaderpackButton')
    spBtn.onclick = () => {
        const p = path.join(CACHE_SETTINGS_INSTANCE_DIR, 'shaderpacks')
        DropinModUtil.validateDir(p)
        shell.openPath(p)
    }
    spBtn.ondragenter = e => {
        e.dataTransfer.dropEffect = 'move'
        spBtn.setAttribute('drag', '')
        e.preventDefault()
    }
    spBtn.ondragover = e => {
        e.preventDefault()
    }
    spBtn.ondragleave = e => {
        spBtn.removeAttribute('drag')
    }

    spBtn.ondrop = e => {
        spBtn.removeAttribute('drag')
        e.preventDefault()

        DropinModUtil.addShaderpacks(e.dataTransfer.files, CACHE_SETTINGS_INSTANCE_DIR)
        saveShaderpackSettings()
        resolveShaderpacksForUI()
    }
}

function loadSelectedServerOnModsTab() {
    const serv = DistroManager.getDistribution().getServer(ConfigManager.getSelectedServer())

    document.getElementById('settingsSelServContent').innerHTML = ""
}

document.getElementById('settingsSwitchServerButton').addEventListener('click', (e) => {
    e.target.blur()
    toggleServerSelection(true)
})

function saveAllModConfigurations() {
    saveModConfiguration()
    ConfigManager.save()
    saveDropinModConfiguration()
}


function animateModsTabRefresh() {
    $('#settingsTabMods').fadeOut(500, () => {
        prepareModsTab()
        $('#settingsTabMods').fadeIn(500)
    })
}

function prepareModsTab(first) {
    resolveModsForUI()
    resolveDropinModsForUI()
    resolveShaderpacksForUI()
    bindDropinModsRemoveButton()
    bindDropinModFileSystemButton()
    bindShaderpackButton()
    bindModsToggleSwitch()
    loadSelectedServerOnModsTab()
}

const settingsMaxRAMRange     = document.getElementById('settingsMaxRAMRange')
const settingsMinRAMRange     = document.getElementById('settingsMinRAMRange')
const settingsMaxRAMLabel     = document.getElementById('settingsMaxRAMLabel')
const settingsMinRAMLabel     = document.getElementById('settingsMinRAMLabel')
const settingsMemoryTotal     = document.getElementById('settingsMemoryTotal')
const settingsMemoryAvail     = document.getElementById('settingsMemoryAvail')
const settingsJavaExecDetails = document.getElementById('settingsJavaExecDetails')

// Store maximum memory values.
const SETTINGS_MAX_MEMORY = ConfigManager.getAbsoluteMaxRAM()
const SETTINGS_MIN_MEMORY = ConfigManager.getAbsoluteMinRAM()

// Set the max and min values for the ranged sliders.
settingsMaxRAMRange.setAttribute('max', SETTINGS_MAX_MEMORY)
settingsMaxRAMRange.setAttribute('min', SETTINGS_MIN_MEMORY)
settingsMinRAMRange.setAttribute('max', SETTINGS_MAX_MEMORY)
settingsMinRAMRange.setAttribute('min', SETTINGS_MIN_MEMORY )

// Bind on change event for min memory container.
settingsMinRAMRange.onchange = (e) => {

    // Current range values
    const sMaxV = Number(settingsMaxRAMRange.getAttribute('value'))
    const sMinV = Number(settingsMinRAMRange.getAttribute('value'))

    // Get reference to range bar.
    const bar = e.target.getElementsByClassName('rangeSliderBar')[0]
    // Calculate effective total memory.
    const max = (os.totalmem()-1000000000)/1000000000

    // Change range bar color based on the selected value.
    if(sMinV >= max/2){
        bar.style.background = '#e86060'
    } else if(sMinV >= max/4) {
        bar.style.background = '#e8e18b'
    } else {
        bar.style.background = null
    }

    // Increase maximum memory if the minimum exceeds its value.
    if(sMaxV < sMinV){
        const sliderMeta = calculateRangeSliderMeta(settingsMaxRAMRange)
        updateRangedSlider(settingsMaxRAMRange, sMinV,
            ((sMinV-sliderMeta.min)/sliderMeta.step)*sliderMeta.inc)
        settingsMaxRAMLabel.innerHTML = sMinV.toFixed(1) + 'G'
    }

    // Update label
    settingsMinRAMLabel.innerHTML = sMinV.toFixed(1) + 'G'
}

// Bind on change event for max memory container.
settingsMaxRAMRange.onchange = (e) => {
    // Current range values
    const sMaxV = Number(settingsMaxRAMRange.getAttribute('value'))
    const sMinV = Number(settingsMinRAMRange.getAttribute('value'))

    // Get reference to range bar.
    const bar = e.target.getElementsByClassName('rangeSliderBar')[0]
    // Calculate effective total memory.
    const max = (os.totalmem()-1000000000)/1000000000

    // Change range bar color based on the selected value.
    if(sMaxV >= max/2){
        bar.style.background = '#e86060'
    } else if(sMaxV >= max/4) {
        bar.style.background = '#e8e18b'
    } else {
        bar.style.background = null
    }

    // Decrease the minimum memory if the maximum value is less.
    if(sMaxV < sMinV){
        const sliderMeta = calculateRangeSliderMeta(settingsMaxRAMRange)
        updateRangedSlider(settingsMinRAMRange, sMaxV,
            ((sMaxV-sliderMeta.min)/sliderMeta.step)*sliderMeta.inc)
        settingsMinRAMLabel.innerHTML = sMaxV.toFixed(1) + 'G'
    }
    settingsMaxRAMLabel.innerHTML = sMaxV.toFixed(1) + 'G'
}

/**
 * Calculate common values for a ranged slider.
 *
 * @param {Element} v The range slider to calculate against.
 * @returns {Object} An object with meta values for the provided ranged slider.
 */
function calculateRangeSliderMeta(v){
    const val = {
        max: Number(v.getAttribute('max')),
        min: Number(v.getAttribute('min')),
        step: Number(v.getAttribute('step')),
    }
    val.ticks = (val.max-val.min)/val.step
    val.inc = 100/val.ticks
    return val
}

/**
 * Binds functionality to the ranged sliders. They're more than
 * just divs now :').
 */
function bindRangeSlider(){
    Array.from(document.getElementsByClassName('rangeSlider')).map((v) => {

        // Reference the track (thumb).
        const track = v.getElementsByClassName('rangeSliderTrack')[0]

        // Set the initial slider value.
        const value = v.getAttribute('value')
        const sliderMeta = calculateRangeSliderMeta(v)

        updateRangedSlider(v, value, ((value-sliderMeta.min)/sliderMeta.step)*sliderMeta.inc)

        // The magic happens when we click on the track.
        track.onmousedown = (e) => {

            // Stop moving the track on mouse up.
            document.onmouseup = (e) => {
                document.onmousemove = null
                document.onmouseup = null
            }

            // Move slider according to the mouse position.
            document.onmousemove = (e) => {

                // Distance from the beginning of the bar in pixels.
                const diff = e.pageX - v.offsetLeft - track.offsetWidth/2

                // Don't move the track off the bar.
                if(diff >= 0 && diff <= v.offsetWidth-track.offsetWidth/2){

                    // Convert the difference to a percentage.
                    const perc = (diff/v.offsetWidth)*100
                    // Calculate the percentage of the closest notch.
                    const notch = Number(perc/sliderMeta.inc).toFixed(0)*sliderMeta.inc

                    // If we're close to that notch, stick to it.
                    if(Math.abs(perc-notch) < sliderMeta.inc/2){
                        updateRangedSlider(v, sliderMeta.min+(sliderMeta.step*(notch/sliderMeta.inc)), notch)
                    }
                }
            }
        }
    })
}

/**
 * Update a ranged slider's value and position.
 *
 * @param {Element} element The ranged slider to update.
 * @param {string | number} value The new value for the ranged slider.
 * @param {number} notch The notch that the slider should now be at.
 */
function updateRangedSlider(element, value, notch){
    const oldVal = element.getAttribute('value')
    const bar = element.getElementsByClassName('rangeSliderBar')[0]
    const track = element.getElementsByClassName('rangeSliderTrack')[0]

    element.setAttribute('value', value)

    if(notch < 0){
        notch = 0
    } else if(notch > 100) {
        notch = 100
    }

    const event = new MouseEvent('change', {
        target: element,
        type: 'change',
        bubbles: false,
        cancelable: true
    })

    let cancelled = !element.dispatchEvent(event)

    if(!cancelled){
        track.style.left = notch + '%'
        bar.style.width = notch + '%'
    } else {
        element.setAttribute('value', oldVal)
    }
}

/**
 * Display the total and available RAM.
 */
function populateMemoryStatus(){
    settingsMemoryTotal.innerHTML = Number((os.totalmem()-1000000000)/1000000000).toFixed(1) + 'G'
    settingsMemoryAvail.innerHTML = Number(os.freemem()/1000000000).toFixed(1) + 'G'
}

/**
 * Validate the provided executable path and display the data on
 * the UI.
 *
 * @param {string} execPath The executable path to populate against.
 */
function populateJavaExecDetails(execPath){
    const jg = new JavaGuard(DistroManager.getDistribution().getServer(ConfigManager.getSelectedServer()).getMinecraftVersion())
    jg._validateJavaBinary(execPath).then(v => {
        if(v.valid){
            const vendor = v.vendor != null ? ` (${v.vendor})` : ''
            if(v.version.major < 9) {
                settingsJavaExecDetails.innerHTML = `Selected: Java ${v.version.major} Update ${v.version.update} (x${v.arch})${vendor}`
            } else {
                settingsJavaExecDetails.innerHTML = `Selected: Java ${v.version.major}.${v.version.minor}.${v.version.revision} (x${v.arch})${vendor}`
            }
        } else {
            settingsJavaExecDetails.innerHTML = 'Invalid Selection'
        }
    })
}



function prepareJavaTab() {
    bindRangeSlider()
    populateMemoryStatus()
}

const settingsTabAbout = document.getElementById('settingsTabAbout')
const settingsAboutChangelogTitle = settingsTabAbout.getElementsByClassName('settingsChangelogTitle')[0]
const settingsAboutChangelogText = settingsTabAbout.getElementsByClassName('settingsChangelogText')[0]
const settingsAboutChangelogButton = settingsTabAbout.getElementsByClassName('settingsChangelogButton')[0]


function isPrerelease(version) {
    const preRelComp = semver.prerelease(version)
    return preRelComp != null && preRelComp.length > 0
}


function populateVersionInformation(version, valueElement, titleElement, checkElement) {
    valueElement.innerHTML = version
}

const settingsTabUpdate = document.getElementById('settingsTabUpdate')
const settingsUpdateTitle = document.getElementById('settingsUpdateTitle')
const settingsUpdateVersionCheck = document.getElementById('settingsUpdateVersionCheck')
const settingsUpdateVersionTitle = document.getElementById('settingsUpdateVersionTitle')
const settingsUpdateVersionValue = document.getElementById('settingsUpdateVersionValue')
const settingsUpdateChangelogTitle = settingsTabUpdate.getElementsByClassName('settingsChangelogTitle')[0]
const settingsUpdateChangelogText = settingsTabUpdate.getElementsByClassName('settingsChangelogText')[0]
const settingsUpdateChangelogCont = settingsTabUpdate.getElementsByClassName('settingsChangelogContainer')[0]
const settingsUpdateActionButton = document.getElementById('settingsUpdateActionButton')


function settingsUpdateButtonStatus(text, disabled = false, handler = null) {
    settingsUpdateActionButton.innerHTML = text
    if (handler != null) {
        settingsUpdateActionButton.onclick = handler
    }
}


function populateSettingsUpdateInformation(data) {
    if (data != null) {
        settingsUpdateTitle.innerHTML = `Une nouvelle ${isPrerelease(data.version) ? 'version-beta' : 'version'} est disponible.`
        settingsUpdateChangelogCont.style.display = null
        populateVersionInformation(data.version, settingsUpdateVersionValue, settingsUpdateVersionTitle, settingsUpdateVersionCheck)

        if (process.platform === 'darwin') {
            settingsUpdateButtonStatus('Téléchargement macOS<span style="font-size: 10px;color: gray;text-shadow: none !important;">Fermer le launcher et lancer le .dmg</span>', false, () => {
                shell.openExternal(data.darwindownload)
            })
        } else {
            settingsUpdateButtonStatus('Téléchargement..', true)
        }
    } else {
        settingsUpdateTitle.innerHTML = 'Vous utilisez la dernière version.'
        populateVersionInformation(remote.app.getVersion(), settingsUpdateVersionValue, settingsUpdateVersionTitle, settingsUpdateVersionCheck)
        settingsUpdateButtonStatus('Vérifier les mise à jour', false, () => {
            ipcRenderer.send('autoUpdateAction', 'checkForUpdate')
            if (!isDev) {
                ipcRenderer.send('autoUpdateAction', 'checkForUpdate')
                settingsUpdateButtonStatus('Vérification..', true)
            }
        })
    }
}

function prepareUpdateTab(data = null) {
    populateSettingsUpdateInformation(data)
}

function prepareSettings(first = false) {
    if (first) {
        setupSettingsTabs()
        initSettingsValidators()
        prepareUpdateTab()
    } else {
        prepareModsTab()
    }
    initSettingsValues()
    prepareAccountsTab()
    prepareJavaTab()
}