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
    MINI:   "MINI T-SPIN",
    T_SPIN: "T-SPIN"
}

// score = SCORES[tSpin][nbClearedLines]
const SCORES = {
    [T_SPIN.NONE]:   [0, 100, 300, 500, 800],
    [T_SPIN.MINI]:   [100, 200],
    [T_SPIN.T_SPIN]: [400, 800, 1200, 1600]
}

const CLEARED_LINES_NAMES = [
    "",  
    "SINGLE",
    "DOUBLE",
    "TRIPLE",
    "<h4>QUATRIS</h4>",
]

const DELAY = {
    LOCK: 500,
    FALL: 1000,
}

const ORIENTATION = {
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
    [" "]:          "Space",
    ["←"]:          "ArrowLeft",
    ["→"]:          "ArrowRight",
    ["↑"]:          "ArrowUp",
    ["↓"]:          "ArrowDown",
    ["Space"]:      " ",
}

/* Customize Array to be use as coord */
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

    drawMino(coord, className) {
        this.table.rows[coord.y].cells[coord.x].className = className
    }

    drawPiece(piece=this.piece, className=piece.className + (piece.locked? " locked" : "")) {
        piece.minoesCoord[piece.orientation]
            .translate(piece.center)
            .forEach(minoCoord => {
                this.drawMino(minoCoord, className)
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
    constructor(id) {
        super(id)
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


class PlayfieldMatrix extends MinoesTable {
    constructor(id, piece_init_position) {
        super(id, piece_init_position)
        this.lockedMinoes = Array(this.rows).fill().map(() => Array(this.columns))
    }

    cellIsEmpty(coord) {
        return 0 <= coord.x && coord.x < this.columns && 0 <= coord.y && coord.y < this.rows && !this.lockedMinoes[coord.y][coord.x]
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
        while (this.ghost.canMove(TRANSLATION.DOWN)) this.ghost.center.y++
        super.drawPiece(this.ghost)
        super.drawPiece(piece, className)
    }

    redraw() {
        for (let y=0; y<this.rows; y++) {
            for (let x=0; x<this.columns; x++) {
                if (this.table.rows[y].cells[x].classList != "hard-drop-animation")
                    this.drawMino([x, y], this.lockedMinoes[y][x] || "")
            }
        }
    }
}
PlayfieldMatrix.prototype.init_center = [5, 4]


class Tetromino {
    static randomBag = []
    static get pick() {
        if (!this.randomBag.length) this.randomBag = [I, J, L, O, S, T, Z]
        return this.randomBag.pick()
    }

    constructor(center, orientation=0, className=this.constructor.name + " mino") {
        this.center = center
        this.className = className
        this.orientation = orientation
        this.lastRotation = false
        this.rotationPoint4Used = false
        this.holdEnabled = true
        this.locked = false
    }

    canMove(translation, rotation=ROTATION.NONE) {
        let testCenter = this.center.add(translation)
        let testOrientation = rotation? (this.orientation + rotation + 4) % 4: this.orientation
        let testMinoesCoord = this.minoesCoord[testOrientation]
        if (testMinoesCoord
            .translate(testCenter)
            .every(minoCoord => matrix.cellIsEmpty(minoCoord)))
            return {center: testCenter, orientation: testOrientation}
        else
            return false
    }
    
    move(translation, rotation=ROTATION.NONE, clearClassName="") {
        let success = this.canMove(translation, rotation)
        if (success) {
            scheduler.clearTimeout(lockDown)
            matrix.drawPiece(this, clearClassName)
            this.center = success.center
            if (rotation) this.orientation = success.orientation
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
        return this.srs[this.orientation][rotation].some((translation, rotationPoint) => {
            if (this.move(translation, rotation)) {
                if (rotationPoint == 4) this.rotationPoint4Used = true
                return true
            }
        })
    }

    get ghost() {
        return new this.constructor(Array.from(this.center), this.orientation, "ghost " + this.className)
    }
}
// Super Rotation System
// freedom of movement = srs[piece.orientation][rotation]
Tetromino.prototype.srs = [
    { [ROTATION.CW]: [[0, 0], [-1, 0], [-1, -1], [0,  2], [-1,  2]], [ROTATION.CCW]: [[0, 0], [ 1, 0], [ 1, -1], [0,  2], [ 1,  2]] },
    { [ROTATION.CW]: [[0, 0], [ 1, 0], [ 1,  1], [0, -2], [ 1, -2]], [ROTATION.CCW]: [[0, 0], [ 1, 0], [ 1,  1], [0, -2], [ 1, -2]] },
    { [ROTATION.CW]: [[0, 0], [ 1, 0], [ 1, -1], [0,  2], [ 1,  2]], [ROTATION.CCW]: [[0, 0], [-1, 0], [-1, -1], [0,  2], [-1,  2]] },
    { [ROTATION.CW]: [[0, 0], [-1, 0], [-1,  1], [0, -2], [-1, -2]], [ROTATION.CCW]: [[0, 0], [-1, 0], [-1,  1], [0, -2], [-1, -2]] },
]

class I extends Tetromino {}
I.prototype.minoesCoord = [
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
J.prototype.minoesCoord = [
    [[-1, -1], [-1, 0], [0, 0], [1, 0]],
    [[ 0, -1], [1, -1], [0, 0], [0, 1]],
    [[ 1,  1], [-1, 0], [0, 0], [1, 0]],
    [[ 0, -1], [-1, 1], [0, 0], [0, 1]],
]

class L extends Tetromino {}
L.prototype.minoesCoord = [
    [[-1, 0], [0, 0], [1, 0], [ 1, -1]],
    [[0, -1], [0, 0], [0, 1], [ 1,  1]],
    [[-1, 0], [0, 0], [1, 0], [-1,  1]],
    [[0, -1], [0, 0], [0, 1], [-1, -1]],
]

class O extends Tetromino {}
O.prototype.minoesCoord = [
    [[0, 0], [1, 0], [0, -1], [1, -1]]
]
O.prototype.srs = [
    {[ROTATION.CW]: [], [ROTATION.CCW]: []}
]


class S extends Tetromino {}
S.prototype.minoesCoord = [
    [[-1,  0], [0, 0], [0, -1], [1, -1]],
    [[ 0, -1], [0, 0], [1,  0], [1,  1]],
    [[-1,  1], [0, 0], [1,  0], [0,  1]],
    [[-1, -1], [0, 0], [-1, 0], [0,  1]],
]

class T extends Tetromino {}
T.prototype.minoesCoord = [
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
Z.prototype.minoesCoord = [
    [[-1, -1], [0, -1], [0, 0], [ 1, 0]],
    [[ 1, -1], [1,  0], [0, 0], [ 0, 1]],
    [[-1,  0], [0,  0], [0, 1], [ 1, 1]],
    [[ 0, -1], [-1, 0], [0, 0], [-1, 1]]
]


class Settings {
    constructor() {
        for (let input of settingsForm.getElementsByTagName("input")) {
            if (localStorage[input.name]) input.value = localStorage[input.name]
        }
        arrOutput.value = arrInput.value + " ms"
        dasOutput.value = dasInput.value + " ms"

        settingsForm.onsubmit = newGame
        this.modal = new bootstrap.Modal('#settingsModal')
        document.getElementById('settingsModal').addEventListener('shown.bs.modal', () => {
            resumeButton.focus()
        })
    }

    load() {
        for (let input of keyBindFielset.getElementsByTagName("input")) {
            this[input.name] = KEY_NAMES[input.value] || input.value
            localStorage[input.name] = input.value
        }
        for (let input of autorepearFieldset.getElementsByTagName("input")) {
            this[input.name] = input.valueAsNumber
            localStorage[input.name] = input.value
        }
    
        this.keyBind = {}
        for (let actionName in playerActions) {
            this.keyBind[settings[actionName]] = playerActions[actionName]
        }
    }
}

function changeKey(input) {
    prevValue = input.value
    input.value = "Touche ?"
    input.onkeydown = function (event) {
        event.preventDefault()
        input.value = KEY_NAMES[event.key] || event.key
    }
    input.onblur = function (event) {
        if (input.value == "Touche ?") input.value = prevValue
        input.onkeydown = null
        input.onblur = null
    }
}


class Stats {
    constructor() {
        this.highScore = Number(localStorage["highScore"]) || 0
        this.combo = -1
        this.b2b = -1
    }

    set score(score) {
        this._score = score
        scoreTd.innerText = score.toLocaleString()
        if (score > this.highScore) {
            this.highScore = score
        }
    }

    get score() {
        return this._score
    }

    set highScore(highScore) {
        this._highScore = highScore
        highScoreTd.innerText = highScore.toLocaleString()
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
        levelTd.innerText = level
        levelSpan.innerHTML =  `<h1>LEVEL<br/>${this.level}</h1>`
        levelSpan.classList.add("show-level-animation")
    }

    get level() {
        return this._level
    }

    set goal(goal) {
        this._goal = goal
        goalTd.innerText = goal
    }

    get goal() {
        return this._goal
    }

    lockDown(nbClearedLines, tSpin) {
        // Cleared lines & T-Spin
        let patternScore = SCORES[tSpin][nbClearedLines] * this.level
        if (tSpin) {
            let div = document.createElement("div")
            div.className = "rotate-in-animation"
            div.innerHTML = tSpin
            scoreSpan.appendChild(div)
        }
        if (nbClearedLines) {
            let div = document.createElement("div")
            div.className = "zoom-in-animation"
            div.innerHTML = CLEARED_LINES_NAMES[nbClearedLines]
            scoreSpan.appendChild(div)
        }
        if (patternScore) {
            let div = document.createElement("div")
            div.className = "zoom-in-animation"
            div.style = "animation-delay: .2s; animation-duration: .8s"
            div.innerHTML = patternScore
            scoreSpan.appendChild(div)
            this.score += patternScore
        }

        // Combo
        if (nbClearedLines) {
            this.combo++
            if (this.combo >= 1) {
                let comboScore = (nbClearedLines == 1 ? 20 : 50) * this.combo * this.level
                let div = document.createElement("div")
                div.className = "zoom-in-animation"
                div.style = "animation-delay: .4s; animation-duration: .6s"
                div.innerHTML = `COMBO x${this.combo}<br/>${comboScore}`
                scoreSpan.appendChild(div)
                this.score += comboScore
            }
        } else {
            this.combo = -1
        }

        // Back to back sequence
        if ((nbClearedLines == 4) || (tSpin && nbClearedLines)) {
            this.b2b++
            if (this.b2b >= 1) {
                let b2bScore = patternScore / 2
                let div = document.createElement("div")
                div.className = "zoom-in-animation"
                div.style = "animation-delay: .4s; animation-duration: .6s"
                div.innerHTML = `BACK TO BACK x${this.b2b}<br/>${b2bScore}`
                scoreSpan.appendChild(div)
                this.score += b2bScore
            }
        } else if ((0 < nbClearedLines) && (nbClearedLines < 4) && !tSpin) {
            this.b2b = -1
        }

        this.goal -= nbClearedLines
        if (this.goal <= 0) this.level++
    }
}


/* Game */
onanimationend = function (event) {
    event.target.classList.remove(event.animationName)
}

scoreSpan.onanimationend = function(event) {
    event.target.remove() 
}

let scheduler = new Scheduler()
let settings = new Settings()
let stats = new Stats()
let holdQueue = new MinoesTable("holdTable")
let matrix = new PlayfieldMatrix("matrixTable")
let nextQueue = new NextQueue("nextTable")


function pause() {
    document.onkeydown = null
    document.onkeyup = null

    scheduler.clearInterval(fall)
    scheduler.clearTimeout(lockDown)
    scheduler.clearTimeout(repeat)
    scheduler.clearInterval(autorepeat)
    resumeButton.disabled = false
    settings.modal.show()
}

//window.onblur = pause()

pause()

function newGame(event) {
    stats.lockDelay = DELAY.LOCK
    resume(event)
    levelInput.name = "level"
    levelInput.disabled = true
    resumeButton.innerHTML = "Reprendre"
    event.target.onsubmit = resume
    settingsModal["data-bs-backdrop"] = ""
    stats.score = 0
    stats.goal = 0
    stats.level = levelInput.valueAsNumber
    localStorage["startLevel"] = levelInput.value
    generate()
}

function resume(event) {
    event.preventDefault()

    settings.load()

    document.onkeydown = onkeydown
    document.onkeyup = onkeyup

    if (stats.fallPeriod) scheduler.setInterval(fall, stats.fallPeriod)
}

function generate(piece=nextQueue.shift()) {
    matrix.piece = piece

    if (matrix.piece.canMove(TRANSLATION.NONE)) {
        scheduler.setInterval(fall, stats.fallPeriod)
    } else {
        gameOver()
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
        //matrix.table.classList.add("hard-dropped-table-animation")
        while (matrix.piece.move(TRANSLATION.DOWN, ROTATION.NONE, "hard-drop-animation")) stats.score +=2
        lockDown()
    },

    hold: function() {
        if (matrix.piece.holdEnabled) {
            scheduler.clearInterval(fall)
            scheduler.clearTimeout(lockDown)
    
            matrix.piece.holdEnabled = false
            matrix.piece.locked = false
            matrix.piece.orientation = ORIENTATION.NORTH
            if (holdQueue.piece) {
                let piece = holdQueue.piece
                holdQueue.piece = matrix.piece
                generate(piece)
            } else {
                holdQueue.piece = matrix.piece
                generate()
            }
        }
    },
    
    pause: pause,
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
                scheduler.setTimeout(repeat, settings.das)
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

    lockedMinoesCoord = matrix.piece.minoesCoord[matrix.piece.orientation]
        .translate(matrix.piece.center)
    if (lockedMinoesCoord.some(minoCoord => minoCoord.y >= 4)) {
        lockedMinoesCoord.forEach(minoCoord => {
            matrix.lockedMinoes[minoCoord.y][minoCoord.x] = matrix.piece.className
            matrix.drawMino(minoCoord, matrix.piece.className)
        })

        // T-Spin
        let tSpin = T_SPIN.NONE
        if (matrix.piece.lastRotation && matrix.piece.constructor == T) {
            let [a, b, c, d] = matrix.piece.tSlots[matrix.piece.orientation]
                .translate(matrix.piece.center)
                .map(minoCoord => !matrix.cellIsEmpty(minoCoord))
            if (a && b && (c || d))
                tSpin = T_SPIN.T_SPIN
            else if (c && d && (a || b))
                tSpin = matrix.piece.rotationPoint5Used ? T_SPIN.T_SPIN : T_SPIN.MINI
        }

        // Cleared lines
        let clearedLines = Array.from(new Set(lockedMinoesCoord.map(minoCoord => minoCoord.y)))
            .filter(y =>  matrix.lockedMinoes[y].filter(lockedMino => lockedMino).length == matrix.columns)
            .sort()
        for (y of clearedLines) {
            matrix.lockedMinoes.splice(y, 1)
            matrix.lockedMinoes.unshift(Array(matrix.columns))
            matrix.table.rows[y].classList.add("line-cleared-animation")
        }
        matrix.redraw()
        stats.lockDown(clearedLines.length, tSpin)
        
        generate()
    } else {
        gameOver()
    }
}

function gameOver() {
    matrix.piece.locked = false
    matrix.drawPiece()
    document.onkeydown = null
    document.onkeyup = null
    localStorage["highScore"] = stats.highScore
    levelSpan.innerHTML =  "<h1>GAME<br/>OVER</h1>"
    levelSpan.classList.add("show-level-animation")
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js');
}