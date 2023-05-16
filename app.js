/* Contants */
const TRANSLATION = {
    NONE:  [ 0, 0],
    LEFT:  [-1, 0],
    RIGHT: [ 1, 0],
    DOWN:  [ 0, 1],
}

const ROTATION = {
    CW:   1,  // ClockWise
    CCW: -1,  // CounterClockWise
}

const T_SPIN = {
    NONE:   "",
    MINI:   "PETITE<br/>PIROUETTE",
    T_SPIN: "PIROUETTE"
}

// score = AWARDED_LINE_CLEARS[tSpin][nbClearedLines]
const AWARDED_LINE_CLEARS = {
    [T_SPIN.NONE]:   [0, 1, 3, 5, 8],
    [T_SPIN.MINI]:   [1, 2],
    [T_SPIN.T_SPIN]: [4, 8, 12, 16]
}

const CLEARED_LINES_NAMES = [
    "",  
    "SOLO",
    "DUO",
    "TRIO",
    "QUATRIS",
]

const DELAY = {
    LOCK: 500,
    FALL: 1000,
}

const FACING = {
    NORTH: 0,
    EAST:  1,
    SOUTH: 2,
    WEST:  3,
}

const KEY_NAMES = {
    ["ArrowLeft"]:  "←",
    ["ArrowRight"]: "→",
    ["ArrowUp"]:    "↑",
    ["ArrowDown"]:  "↓",
    [" "]:          "Espace",
    ["Escape"]:     "Échap",
    ["Enter"]:      "Entrée",
    ["←"]:          "ArrowLeft",
    ["→"]:          "ArrowRight",
    ["↑"]:          "ArrowUp",
    ["↓"]:          "ArrowDown",
    ["Espace"]:     " ",
    ["Échap"]:      "Escape",
    ["Entrée"]:     "Enter",
}

/* Customize Array to be use as position */
Object.defineProperties(Array.prototype, {
    "x": {
        get: function() { return this[0] },
        set: function(x) { this[0] = x }
    },
    "y": {
        get: function() { return this[1] },
        set: function(y) { this[1] = y }
    }
})
Array.prototype.add =       function(other)    { return this.map((x, i) => x + other[i]) }
Array.prototype.mul =       function(k)        { return this.map(x => k * x) }
Array.prototype.translate = function(vector)   { return this.map(pos => pos.add(vector)) }
Array.prototype.rotate =    function(rotation) { return [-rotation*this.y, rotation*this.x] }
Array.prototype.pick =      function()         { return this.splice(Math.floor(Math.random()*this.length), 1)[0] }


HTMLElement.prototype.addNewChild = function(tag, properties) {
    let child = document.createElement(tag)
    for (key in properties) {
        child[key] = properties[key]
    }
    this.appendChild(child)
}


/* Classes */

class Scheduler {
    constructor() {
        this.intervalTasks = new Map()
        this.timeoutTasks = new Map()
    }

    setInterval(func, delay, ...args) {
        this.intervalTasks.set(func, window.setInterval(func, delay, ...args))
    }

    setTimeout(func, delay, ...args) {
        this.timeoutTasks.set(func, window.setTimeout(func, delay, ...args))
    }

    clearInterval(func) {
        if (this.intervalTasks.has(func))
            window.clearInterval(this.intervalTasks.get(func))
            this.intervalTasks.delete(func)
    }

    clearTimeout(func) {
        if (this.timeoutTasks.has(func))
            window.clearTimeout(this.timeoutTasks.get(func))
            this.timeoutTasks.delete(func)
    }
}


class MinoesTable {
    constructor(id) {
        this.table = document.getElementById(id)
        this.rows = this.table.rows.length
        this.columns = this.table.rows[0].childElementCount
    }

    init() {
        this._piece = null
    }

    get piece() {
        return this._piece
    }
    set piece(piece) {
        this._piece = piece
        this._piece.center = Array.from(this.init_center)
        this.redraw()
        this.drawPiece()
    }

    drawMino(position, className) {
        this.table.rows[position.y].cells[position.x].className = className
    }

    drawPiece(piece=this.piece, className=piece.className + (piece.locked? " locked" : "")) {
        piece.minoesPosition[piece.facing]
            .translate(piece.center)
            .forEach(minoPosition => {
                this.drawMino(minoPosition, className)
            })
    }

    redraw() {
        for (let y=0; y<this.rows; y++) {
            for (let x=0; x<this.columns; x++) {
                this.drawMino([x, y], "")
            }
        }
    }
}
MinoesTable.prototype.init_center = [2, 2]


class NextQueue extends MinoesTable {
    constructor() {
        super("nextTable")
    }

    init() {
        this.pieces = this.init_centers.map(center => {
            let piece = new Tetromino.pick()
            piece.center = Array.from(center)
            return piece
        })
    }

    shift() {
        let fistPiece = this.pieces.shift()
        this.pieces.push(new Tetromino.pick())
        this.pieces.forEach((piece, i) => {
            piece.center = Array.from(this.init_centers[i])
        })
        this.redraw()
        return fistPiece
    }

    redraw() {
        super.redraw()
        this.pieces.forEach((piece) => {
            this.drawPiece(piece)
        })
    }
}
NextQueue.prototype.init_centers = [[2, 2], [2, 5], [2, 8], [2, 11], [2, 14]]


class Matrix extends MinoesTable {
    constructor() {
        super("matrixTable")
    }

    init() {
        super.init()
        this.blocks = Array(this.rows).fill().map(() => Array(this.columns))
        this.redraw()
    }

    cellIsEmpty(position) {
        return 0 <= position.x && position.x < this.columns && 0 <= position.y && position.y < this.rows && !this.blocks[position.y][position.x]
    }

    get piece() {
        return this._piece
    }
    set piece(piece) {
        this._piece = piece
        this._piece.center = Array.from(this.init_center)
        this.ghost = piece.ghost
        this.redraw()
        this.drawPiece()
    }

    drawPiece(piece=this.piece, className=piece.className + (piece.locked? " locked" : "")) {
        super.drawPiece(this.ghost, "")
        this.ghost = piece.ghost
        super.drawPiece(this.ghost)
        super.drawPiece(piece, className)
    }

    redraw() {
        for (let y=0; y<this.rows; y++) {
            for (let x=0; x<this.columns; x++) {
                if (this.table.rows[y].cells[x].classList != "trail-animation")
                    this.drawMino([x, y], this.blocks[y][x] || "")
            }
        }
    }

    lock() {
        let blocksPosition = this.piece.minoesPosition[this.piece.facing].translate(this.piece.center)
        if (blocksPosition.some(position => position.y >= 4)) {
            blocksPosition.forEach(position => {
                this.blocks[position.y][position.x] = this.piece.className
                this.drawMino(position, this.piece.className)
            })
            return true
        } else {
            return false
        }
    }

    clearLines() {
        let nbClearedLines = 0
        for (let y=0; y<this.rows; y++) {
            let row = this.blocks[y]
            if (row.filter(lockedMino => lockedMino).length == this.columns) {
                nbClearedLines++
                this.blocks.splice(y, 1)
                this.blocks.unshift(Array(matrix.columns))
                this.table.rows[y].classList.add("cleared-line-animation")
            }
        }
        this.redraw()
        return nbClearedLines
    }
}
Matrix.prototype.init_center = [4, 4]


class Tetromino {
    static randomBag = []
    static get pick() {
        if (!this.randomBag.length) this.randomBag = [I, J, L, O, S, T, Z]
        return this.randomBag.pick()
    }

    constructor(center, facing=0, className=this.constructor.name + " mino") {
        this.center = center
        this.className = className
        this.facing = facing
        this.lastRotation = false
        this.rotationPoint4Used = false
        this.holdEnabled = true
        this.locked = false
    }

    canMove(translation, rotation=ROTATION.NONE) {
        let testCenter = this.center.add(translation)
        let testFacing = rotation? (this.facing + rotation + 4) % 4: this.facing
        let testMinoesPosition = this.minoesPosition[testFacing]
        if (testMinoesPosition
            .translate(testCenter)
            .every(minoPosition => matrix.cellIsEmpty(minoPosition)))
            return {center: testCenter, facing: testFacing}
        else
            return false
    }
    
    move(translation, rotation=ROTATION.NONE, clearClassName="") {
        let success = this.canMove(translation, rotation)
        if (success) {
            scheduler.clearTimeout(lockDown)
            matrix.drawPiece(this, clearClassName)
            this.center = success.center
            if (rotation) this.facing = success.facing
            this.lastRotation = rotation
            if (this.canMove(TRANSLATION.DOWN)) {
                this.locked = false
            } else {
                this.locked = true
                scheduler.setTimeout(lockDown, stats.lockDelay)
            }
            matrix.drawPiece()
            return true
        } else if (translation == TRANSLATION.DOWN) {
            this.locked = true
            if (!scheduler.timeoutTasks.has(lockDown))
                scheduler.setTimeout(lockDown, stats.lockDelay)
            matrix.drawPiece()
        }
    }
    
    rotate(rotation) {
        return this.srs[this.facing][rotation].some((translation, rotationPoint) => {
            if (this.move(translation, rotation)) {
                if (rotationPoint == 4) this.rotationPoint4Used = true
                favicon.href = this.favicon_href
                return true
            }
        })
    }

    get ghost() {
        let ghost = new this.constructor(Array.from(this.center), this.facing, "ghost " + this.className)
        while (ghost.canMove(TRANSLATION.DOWN)) ghost.center.y++
        return ghost
    }

    get favicon_href() {
        return `favicons/${this.constructor.name}-${this.facing}.png`
    }

    get tSpin() {
        return T_SPIN.NONE
    }
}
// Super Rotation System
// freedom of movement = srs[piece.facing][rotation]
Tetromino.prototype.srs = [
    { [ROTATION.CW]: [[0, 0], [-1, 0], [-1, -1], [0,  2], [-1,  2]], [ROTATION.CCW]: [[0, 0], [ 1, 0], [ 1, -1], [0,  2], [ 1,  2]] },
    { [ROTATION.CW]: [[0, 0], [ 1, 0], [ 1,  1], [0, -2], [ 1, -2]], [ROTATION.CCW]: [[0, 0], [ 1, 0], [ 1,  1], [0, -2], [ 1, -2]] },
    { [ROTATION.CW]: [[0, 0], [ 1, 0], [ 1, -1], [0,  2], [ 1,  2]], [ROTATION.CCW]: [[0, 0], [-1, 0], [-1, -1], [0,  2], [-1,  2]] },
    { [ROTATION.CW]: [[0, 0], [-1, 0], [-1,  1], [0, -2], [-1, -2]], [ROTATION.CCW]: [[0, 0], [-1, 0], [-1,  1], [0, -2], [-1, -2]] },
]

class I extends Tetromino {}
I.prototype.minoesPosition = [
    [[-1, 0], [0, 0], [1, 0], [2, 0]],
    [[1, -1], [1, 0], [1, 1], [1, 2]],
    [[-1, 1], [0, 1], [1, 1], [2, 1]],
    [[0, -1], [0, 0], [0, 1], [0, 2]],
]
I.prototype.srs = [
    { [ROTATION.CW]: [[0, 0], [-2, 0], [ 1, 0], [-2,  1], [ 1, -2]], [ROTATION.CCW]: [[0, 0], [-1, 0], [ 2, 0], [-1, -2], [ 2,  1]] },
    { [ROTATION.CW]: [[0, 0], [-1, 0], [ 2, 0], [-1, -2], [ 2,  1]], [ROTATION.CCW]: [[0, 0], [ 2, 0], [-1, 0], [ 2, -1], [-1,  2]] },
    { [ROTATION.CW]: [[0, 0], [ 2, 0], [-1, 0], [ 2, -1], [-1,  2]], [ROTATION.CCW]: [[0, 0], [ 1, 0], [-2, 0], [ 1,  2], [-2, -1]] },
    { [ROTATION.CW]: [[0, 0], [ 1, 0], [-2, 0], [ 1,  2], [-2, -1]], [ROTATION.CCW]: [[0, 0], [-2, 0], [ 1, 0], [-2,  1], [ 1, -2]] },
]

class J extends Tetromino {}
J.prototype.minoesPosition = [
    [[-1, -1], [-1, 0], [0, 0], [1, 0]],
    [[ 0, -1], [1, -1], [0, 0], [0, 1]],
    [[ 1,  1], [-1, 0], [0, 0], [1, 0]],
    [[ 0, -1], [-1, 1], [0, 0], [0, 1]],
]

class L extends Tetromino {}
L.prototype.minoesPosition = [
    [[-1, 0], [0, 0], [1, 0], [ 1, -1]],
    [[0, -1], [0, 0], [0, 1], [ 1,  1]],
    [[-1, 0], [0, 0], [1, 0], [-1,  1]],
    [[0, -1], [0, 0], [0, 1], [-1, -1]],
]

class O extends Tetromino {}
O.prototype.minoesPosition = [
    [[0, 0], [1, 0], [0, -1], [1, -1]]
]
O.prototype.srs = [
    {[ROTATION.CW]: [], [ROTATION.CCW]: []}
]


class S extends Tetromino {}
S.prototype.minoesPosition = [
    [[-1,  0], [0, 0], [0, -1], [1, -1]],
    [[ 0, -1], [0, 0], [1,  0], [1,  1]],
    [[-1,  1], [0, 0], [1,  0], [0,  1]],
    [[-1, -1], [0, 0], [-1, 0], [0,  1]],
]

class T extends Tetromino {
    get tSpin() {
        if (this.lastRotation) {
            let [a, b, c, d] = this.tSlots[this.facing]
                .translate(this.center)
                .map(minoPosition => !matrix.cellIsEmpty(minoPosition))
            if (a && b && (c || d))
                return T_SPIN.T_SPIN
            else if (c && d && (a || b))
                return this.rotationPoint4Used ? T_SPIN.T_SPIN : T_SPIN.MINI
        }
        return T_SPIN.NONE
    }
}
T.prototype.minoesPosition = [
    [[-1, 0], [0, 0], [1, 0], [0, -1]],
    [[0, -1], [0, 0], [1, 0], [0,  1]],
    [[-1, 0], [0, 0], [1, 0], [0,  1]],
    [[0, -1], [0, 0], [0, 1], [-1, 0]],
]
T.prototype.tSlots = [
    [[-1, -1], [ 1, -1], [ 1,  1], [-1,  1]],
    [[ 1, -1], [ 1,  1], [-1,  1], [-1, -1]],
    [[ 1,  1], [-1,  1], [-1, -1], [ 1, -1]],
    [[-1,  1], [-1, -1], [ 1, -1], [ 1,  1]],
]

class Z extends Tetromino {}
Z.prototype.minoesPosition = [
    [[-1, -1], [0, -1], [0, 0], [ 1, 0]],
    [[ 1, -1], [1,  0], [0, 0], [ 0, 1]],
    [[-1,  0], [0,  0], [0, 1], [ 1, 1]],
    [[ 0, -1], [-1, 0], [0, 0], [-1, 1]]
]


class Settings {
    constructor() {
        this.form = settingsForm
        this.load()
        this.modal = new bootstrap.Modal('#settingsModal')
        settingsModal.addEventListener('shown.bs.modal', () => {
            resumeButton.focus()
        })
    }

    load() {
        for (let element of settingsForm.elements) {
            if (element.name) {
                if (localStorage[element.name]) element.value = localStorage[element.name]
            }
        }
        document.selectedStyleSheetSet = stylesheetSelect.value
    }

    save() {
        for (let element of settingsForm.elements) {
            if (element.name) {
                localStorage[element.name] = element.value
            }
        }
    }

    init() {
        this.form.onsubmit = newGame
        levelInput.name = "startLevel"
        levelInput.disabled = false
        titleHeader.innerHTML = "QUATRIS"
        resumeButton.innerHTML = "Jouer"
    }

    show() {
        resumeButton.disabled = false
        settings.form.classList.remove('was-validated')
        settings.modal.show()
        settings.form.reportValidity()
    }

    getInputs() {
        for (let input of this.form.querySelectorAll("input[type='text']")) {
            this[input.name] = KEY_NAMES[input.value] || input.value
        }
        for (let input of this.form.querySelectorAll("input[type='number'], input[type='range']")) {
            this[input.name] = input.valueAsNumber
        }
        for (let input of this.form.querySelectorAll("input[type='checkbox']")) {
            this[input.name] = input.checked == true
        }
    
        this.keyBind = {}
        for (let actionName in playerActions) {
            this.keyBind[settings[actionName]] = playerActions[actionName]
        }
    }
}

function changeKey(input) {
    prevValue = input.value
    input.value = ""
    input.onkeydown = function (event) {
        event.preventDefault()
        input.value = KEY_NAMES[event.key] || event.key
        input.blur()
    }
    input.onblur = function (event) {
        if (input.value == "") input.value = prevValue
        input.onkeydown = null
        input.onblur = null
    }
}


class Stats {
    constructor() {
        this.modal = new bootstrap.Modal('#statsModal')
        this.load()
    }

    load() {
        this.highScore = Number(localStorage["highScore"]) || 0
    }

    init() {
        levelInput.value = localStorage["startLevel"] || 1
        this.score = 0
        this.goal = 0
        this.combo = 0
        this.b2b = 0
        this.startTime = new Date()
        this.lockDelay = DELAY.LOCK
        this.totalClearedLines = 0
        this.nbQuatris = 0
        this.nbTSpin = 0
        this.maxCombo = 0
        this.maxB2B = 0
    }

    set score(score) {
        this._score = score
        scoreCell.innerText = score.toLocaleString()
        if (score > this.highScore) {
            this.highScore = score
        }
    }

    get score() {
        return this._score
    }

    set highScore(highScore) {
        this._highScore = highScore
        highScoreCell.innerText = highScore.toLocaleString()
    }

    get highScore() {
        return this._highScore
    }

    set level(level) {
        this._level = level
        this.goal += level * 5
        if (level <= 20){
            this.fallPeriod = 1000 * Math.pow(0.8 - ((level - 1) * 0.007), level - 1)
        }
        if (level > 15)
            this.lockDelay = 500 * Math.pow(0.9, level - 15)
        levelInput.value = level
        levelCell.innerText = level
        messagesSpan.addNewChild("div", { className: "show-level-animation", innerHTML: `<h1>NIVEAU<br/>${this.level}</h1>` })
    }

    get level() {
        return this._level
    }

    set goal(goal) {
        this._goal = goal
        goalCell.innerText = goal
    }

    get goal() {
        return this._goal
    }

    set time(time) {
        this.startTime = new Date() - time
        ticktack()
    }

    get time() {
        return new Date() - this.startTime
    }

    lockDown(nbClearedLines, tSpin) {
        this.totalClearedLines += nbClearedLines
        if (nbClearedLines == 4) this.nbQuatris++
        if (tSpin == T_SPIN.T_SPIN) this.nbTSpin++

        // Cleared lines & T-Spin
        let awardedLineClears = AWARDED_LINE_CLEARS[tSpin][nbClearedLines]
        let patternScore = 100 * this.level * awardedLineClears
        if (tSpin) messagesSpan.addNewChild("div", {
            className: "rotate-in-animation",
            innerHTML: tSpin
        })
        if (nbClearedLines) messagesSpan.addNewChild("div", {
            className: "zoom-in-animation",
            innerHTML: CLEARED_LINES_NAMES[nbClearedLines]
        })
        if (patternScore) {
            messagesSpan.addNewChild("div", {
                className: "zoom-in-animation",
                style: "animation-delay: .2s",
                innerHTML: patternScore
            })
            this.score += patternScore
        }

        // Combo
        if (nbClearedLines) {
            this.combo++
            if (this.combo > this.maxCombo) this.maxCombo = this.combo
            if (this.combo >= 1) {
                let comboScore = (nbClearedLines == 1 ? 20 : 50) * this.combo * this.level
                if (this.combo == 1) {
                    messagesSpan.addNewChild("div", {
                        className: "zoom-in-animation",
                        style: "animation-delay: .4s",
                        innerHTML: `COMBO<br/>${comboScore}`
                    })
                } else {
                    messagesSpan.addNewChild("div", {
                        className: "zoom-in-animation",
                        style: "animation-delay: .4s",
                        innerHTML: `COMBO x${this.combo}<br/>${comboScore}`
                    })
                }
                this.score += comboScore
            }
        } else {
            this.combo = -1
        }

        // Back to back sequence
        if ((nbClearedLines == 4) || (tSpin && nbClearedLines)) {
            this.b2b++
            if (this.b2b > this.maxB2B) this.maxB2B = this.b2b
            if (this.b2b >= 1) {
                let b2bScore = patternScore / 2
                if (this.b2b == 1) {
                    messagesSpan.addNewChild("div", {
                        className: "zoom-in-animation",
                        style: "animation-delay: .4s",
                        innerHTML: `BOUT À BOUT<br/>${b2bScore}`
                    })
                } else {
                    messagesSpan.addNewChild("div", {
                        className: "zoom-in-animation",
                        style: "animation-delay: .4s",
                        innerHTML: `BOUT À BOUT x${this.b2b}<br/>${b2bScore}`
                    })
                }
                this.score += b2bScore
            }
        } else if (nbClearedLines && !tSpin ) {
            if (this.b2b >= 1) {
                messagesSpan.addNewChild("div", {
                    className: "zoom-in-animation",
                    style: "animation-delay: .4s",
                    innerHTML: `FIN DU BOUT À BOUT`
                })
            }
            this.b2b = -1
        }

        this.goal -= awardedLineClears
        if (this.goal <= 0) this.level++
    }

    show() {
        let time = stats.time
        statsModalScoreCell.innerText           = this.score.toLocaleString()
        statsModalHighScoreCell.innerText       = this.highScore.toLocaleString()
        statsModalLevelCell.innerText           = this.level
        statsModalTimeCell.innerText            = this.timeFormat.format(time)
        statsModaltotalClearedLines.innerText   = this.totalClearedLines
        statsModaltotalClearedLinesPM.innerText = (stats.totalClearedLines * 60000 / time).toFixed(2)
        statsModalNbQuatris.innerText           = this.nbQuatris
        statsModalNbTSpin.innerText             = this.nbTSpin
        statsModalMaxCombo.innerText            = this.maxCombo
        statsModalMaxB2B.innerText              = this.maxB2B
        this.modal.show()
    }

    save() {
        localStorage["highScore"] = this.highScore
    }
}
Stats.prototype.timeFormat = new Intl.DateTimeFormat("fr-FR", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC"
})


/* Game */
onanimationend = function (event) {
    event.target.classList.remove(event.animationName)
}

messagesSpan.onanimationend = function(event) {
    event.target.remove() 
}

let scheduler = new Scheduler()
let settings = new Settings()
let stats = new Stats()
let holdQueue = new MinoesTable("holdTable")
let matrix = new Matrix()
let nextQueue = new NextQueue()
let playing = false
let favicon = document.querySelector("link[rel~='icon']")

function restart() {
    stats.modal.hide()
    holdQueue.init()
    stats.init()
    matrix.init()
    nextQueue.init()
    settings.init()
    pauseSettings()
}

restart()

function pauseSettings() {
    scheduler.clearInterval(fall)
    scheduler.clearTimeout(lockDown)
    scheduler.clearTimeout(repeat)
    scheduler.clearInterval(autorepeat)
    scheduler.clearInterval(ticktack)
    stats.pauseTime = stats.time

    document.onkeydown = null

    settings.show()
}

function newGame(event) {
    if (!settings.form.checkValidity()) {
        event.preventDefault()
        event.stopPropagation()
        settings.form.reportValidity()
        settings.form.classList.add('was-validated')
    } else {
        levelInput.name = "level"
        levelInput.disabled = true
        titleHeader.innerHTML = "PAUSE"
        resumeButton.innerHTML = "Reprendre"
        event.target.onsubmit = resume
        stats.level = levelInput.valueAsNumber
        localStorage["startLevel"] = levelInput.value
        playing = true
        onblur = pauseSettings
        resume(event)
    }
}

function resume(event) {
    event.preventDefault()
    event.stopPropagation()

    settings.form.reportValidity()
    settings.form.classList.add('was-validated')

    if (settings.form.checkValidity()) {
        settings.modal.hide()
        settings.getInputs()

        document.onkeydown = onkeydown
        document.onkeyup = onkeyup
    
        stats.time = stats.pauseTime
        scheduler.setInterval(ticktack, 1000)

        if (matrix.piece) scheduler.setInterval(fall, stats.fallPeriod)
        else generate()
    }
}

function ticktack() {
    timeCell.innerText = stats.timeFormat.format(stats.time)
}

function generate(piece) {
    matrix.piece = piece || nextQueue.shift()
    favicon.href = matrix.piece.favicon_href

    if (matrix.piece.canMove(TRANSLATION.NONE)) {
        scheduler.setInterval(fall, stats.fallPeriod)
    } else {
        gameOver() // block out
    }
}

let playerActions = {
    moveLeft: () => matrix.piece.move(TRANSLATION.LEFT),

    moveRight: () => matrix.piece.move(TRANSLATION.RIGHT),

    rotateClockwise: () => matrix.piece.rotate(ROTATION.CW),

    rotateCounterclockwise: () => matrix.piece.rotate(ROTATION.CCW),

    softDrop: function() {
        if (matrix.piece.move(TRANSLATION.DOWN)) stats.score++
    },

    hardDrop: function() {
        scheduler.clearTimeout(lockDown)
        while (matrix.piece.move(TRANSLATION.DOWN, ROTATION.NONE, "trail-animation")) stats.score +=2
        matrix.table.classList.add("hard-dropped-table-animation")
        lockDown()
    },

    hold: function() {
        if (matrix.piece.holdEnabled) {
            scheduler.clearInterval(fall)
            scheduler.clearTimeout(lockDown)
    
            let heldPiece = holdQueue.piece
            holdQueue.piece = matrix.piece
            holdQueue.piece.holdEnabled = false
            holdQueue.piece.locked = false
            holdQueue.piece.facing = FACING.NORTH
            generate(heldPiece)
        }
    },
    
    pause: pauseSettings,
}

// Handle player inputs
const REPEATABLE_ACTIONS = [
    playerActions.moveLeft,
    playerActions.moveRight,
    playerActions.softDrop
]
pressedKeys = new Set()
actionsQueue = []

function onkeydown(event) {
    if (event.key in settings.keyBind) {
        event.preventDefault()
        if (!pressedKeys.has(event.key)) {
            pressedKeys.add(event.key)
            action = settings.keyBind[event.key]
            action()
            if (REPEATABLE_ACTIONS.includes(action)) {
                actionsQueue.unshift(action)
                scheduler.clearTimeout(repeat)
                scheduler.clearInterval(autorepeat)
                if (action == playerActions.softDrop) scheduler.setInterval(autorepeat, settings.fallPeriod/20)
                else scheduler.setTimeout(repeat, settings.das)
            }
        }
    }
}

function repeat() {
    if (actionsQueue.length) {
        actionsQueue[0]()
        scheduler.setInterval(autorepeat, settings.arr)
    }
}

function autorepeat() {
    if (actionsQueue.length) {
        actionsQueue[0]()
    } else {
        scheduler.clearInterval(autorepeat)
    }
}

function onkeyup(event) {
    if (event.key in settings.keyBind) {
        event.preventDefault()
        pressedKeys.delete(event.key)
        action = settings.keyBind[event.key]
        if (actionsQueue.includes(action)) {
            actionsQueue.splice(actionsQueue.indexOf(action), 1)
            if (!actionsQueue.length) {
                scheduler.clearTimeout(repeat)
                scheduler.clearInterval(autorepeat)
            }
        }
    }
}

function fall() {
    matrix.piece.move(TRANSLATION.DOWN)
}

function lockDown() {
    scheduler.clearTimeout(lockDown)
    scheduler.clearInterval(fall)

    if (matrix.lock()) {
        let tSpin = matrix.piece.tSpin
        let nbClearedLines = matrix.clearLines()
        stats.lockDown(nbClearedLines, tSpin)
        
        generate()
    } else {
        gameOver() // lock out
    }
}

function gameOver() {
    matrix.piece.locked = false
    matrix.drawPiece()

    document.onkeydown = null
    onblur = null
    scheduler.clearInterval(ticktack)
    playing = false

    stats.show()
}

window.onbeforeunload = function(event) {
    stats.save()
    settings.save()
    if (playing) return false;
}


if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js');
}