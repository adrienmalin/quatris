let scheduler = new Scheduler()
let settings = new Settings()
let stats = new Stats()
let holdQueue = new MinoesTable("holdTable")
let matrix = new Matrix()
let nextQueue = new NextQueue()
let playing = false
let favicon

window.onload = function(event) {
    document.selectedStyleSheetSet = stylesheetSelect.value
    favicon = document.querySelector("link[rel~='icon']")

    restart()
}

function restart() {
    stats.modal.hide()
    holdQueue.init()
    stats.init()
    matrix.init()
    nextQueue.init()
    settings.init()
    pauseSettings()
}

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
        const audioContext = new AudioContext()
        for(const sound of document.getElementsByTagName("audio"))
            audioContext.createMediaElementSource(sound).connect(audioContext.destination)

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
        for(const sound of document.getElementsByTagName("audio"))
            sound.volume = sfxVolumeRange.value

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
        if (matrix.piece.move(TRANSLATION.DOWN)) {
            stats.score++
            return true
        } else {
            return false
        }
    },

    hardDrop: function() {
        scheduler.clearTimeout(lockDown)
        playSound(hardDropSound)
        while (matrix.piece.move(TRANSLATION.DOWN, ROTATION.NONE, true)) stats.score +=2
        // wallSound.currentTime = 0
        // wallSound.pause()
        matrix.table.classList.add("hard-dropped-table-animation")
        lockDown()
    },

    hold: function() {
        if (matrix.piece.holdEnabled) {
            scheduler.clearInterval(fall)
            scheduler.clearTimeout(lockDown)
    
            let heldPiece = holdQueue.piece
            matrix.piece.facing = FACING.NORTH
            matrix.piece.locked = false
            holdQueue.piece = matrix.piece
            holdQueue.piece.holdEnabled = false
            holdQueue.piece.locked = false
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
            matrix.drawPiece()
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
                matrix.drawPiece()
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

onanimationend = function (event) {
    event.target.classList.remove(event.animationName)
}

messagesSpan.onanimationend = function(event) {
    event.target.remove() 
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