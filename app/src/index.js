// This is my own helper library. Will grow with time.
var UTILS = {
  batchAddEvents: (arr, fn, type) => {
    var i = 0,
        max = arr.length
    
    type = type || 'click'

    for (i; i < max; i++) {
      arr[i].addEventListener(type, fn, false)
    }
  },
  getEl: (id) => document.getElementById(id),
  events: {
    subscribers: {
      any: []
    },
    on: function (type, fn, context) {
      type = type || 'any'
      fn = (typeof fn === 'function') ? fn : context[fn]
      
      if (!this.subscribers[type]) this.subscribers[type] = []
      this.subscribers[type].push({fn: fn, context: context || this})
    },
    remove: function (type, fn, context) {
      this.visitSubscribers('unsubscribe', type, fn, context)
    },
    fire: function (type, publication) {
      this.visitSubscribers('publish', type, publication)
    },
    visitSubscribers: function (action, type, arg, context) {
      var pubtype = type || 'any',
          subscribers = this.subscribers[type],
          i,
          max = subscribers? subscribers.length : 0
      
      for (i = 0; i < max; i++) {
        if (action === 'publish') {
          subscribers[i].fn.call(subscribers[i].context, arg)
        } else {
          if (subscribers[i].fn === arg && subscribers[i].context === context) {
            subscribers.splice(i, 1)
          }
        }
      }
    }
  }
}


var TTT = TTT || {}


// Constructor for the Board object
TTT.Board = TTT.Board || function Board (board_btns, app, _) {
  
  // Enforce the "new" operator
  if (!(this instanceof Board)) return new Board(board_btns, app, _)
  
  // Stores the current state of the board tiles.
  let state = {
    '0': null,
    '1': 'X',
    '2': null,
    '3': null,
    '4': null,
    '5': null,
    '6': null,
    '7': null,
    '8': null
  }

  this.resetState = (new_state) => {
    this.setState(new_state)
    _.events.fire('board_reset', null)
  }
  
  this.setState = (new_state) => {
    state = new_state
    this.checkIfFull(new_state)
    _.events.fire('board_changed', this.getState())
  }

  this.checkIfFull = (new_state) => {
    let full = true
    for (let i in new_state) {
      if (new_state.hasOwnProperty(i) && full === true) {
        full = (new_state[i] === null) ? false : true 
      }
    }
    return full
  }
    
  // method for adding a marker, X or O, to the board's state.
  this.placeMarker = (obj) => {
    const new_state = this.getState()
    const tile_num = obj.e.currentTarget.value
    let tile_val = new_state[tile_num]
    if (!tile_val) {
      new_state[tile_num] = obj.marker
      const board_is_full = this.checkIfFull(new_state)
      if (board_is_full) {
        _.events.fire('full_board', null)
      }
      this.setState(new_state)
      console.log('placeMarker ran in Board')
    }
  }
    
  // Privileged method for safely accessing state without accidental mutation
  this.getState = () => Object.assign({}, state)
  
    
  _.events.on('game_reset', 'resetState', this)
  _.events.on('tile_selected', 'placeMarker', this)

  // This is temporary - remove when finished dev
  _.events.fire('board_changed', this.getState())
}// Board constructor



// Constructor for the Display object  
// This object is probably too tightly coupled with other objects. 
// Not sure this should even be a constructor!
TTT.Display = TTT.Display || function Display (els, app, _) {
    
  // Enforce the "new" operator
  if (!(this instanceof Display)) return new Display(els, app, _)
  
  this.renderBoard = (state) => {
    for (let i in state) {
      if (state.hasOwnProperty(i)) {
        els.board_btns[i].className = (state[i]) ? `marker-${state[i].toLowerCase()}` : ''
      }
    }
  }

  this.renderScore = (state) => els.scoreboard.textContent = `Player One: ${state.p_one} || Player Two: ${state.p_two}`

  this.startToReset = () => els.start_btn.className = 'fa fa-refresh'

  this.renderMessage = (msgs_state) => { 
    for (let i in msgs_state) {
      if (msgs_state.hasOwnProperty(i)) {
        els.messages[i].className = (msgs_state[i] === true) ? 'active-message animated fadeIn' : ''
      }
    }
    console.log('rendermessages worked')
  }

  _.events.on('messages_update', 'renderMessage', this)
  _.events.on('board_changed', 'renderBoard', this)
  _.events.on('board_reset', 'startToReset', this)
  _.events.on('score_update', 'renderScore', this)
} // Display constructor



// Constructor for the Score object  
TTT.Score = TTT.Score || function Score (_) {
    
  // Enforce the "new" operator
  if (!(this instanceof Score)) return new Score(_)
  
  let state = {
    p_one: 2,
    p_two: 1
  }
  
  this.increment = (player) => {
    if (player !== null && state.hasOwnProperty) {
      state[player] ++
      _.events.fire('score_update', state)      
    }
  }
  
  this.reset = () => {
    state = {p_one: 0, p_two: 0}
    _.events.fire('score_update', state)
    console.log('score reset: ', state)
  }

  _.events.on('game_reset', 'reset', this)
  _.events.on('outcome_determined', 'increment', this)
} // Display constructor



// Constructor for the Messages object  
TTT.Messages = TTT.Messages || function Messages (_) {
  
  // Enforce the "new" operator
  if (!(this instanceof Messages)) return new Messages(_)
  
  let state = {
    'playmode-select': false,
    'x-o-select': false,
    'outcome': false
  }
  
  this.gameReset = () => {
    state = {
      'playmode-select': true,
      'x-o-select': false,
      'outcome': false
    }
    _.events.fire('messages_update', state)
  }

  this.promptMarkerSelect = () => {
    state['playmode-select'] = false
    state['x-o-select'] = true
    _.events.fire('messages_update', state)
  }

  this.closeMessages = () => {
    for (var i in state) {
      state[i] = (state.hasOwnProperty(i)) ? false : state[i]
    }
    _.events.fire('messages_update', state)
  }

  _.events.on('marker_chosen', 'closeMessages', this)
  _.events.on('playmode_chosen', 'promptMarkerSelect', this)
  _.events.on('board_reset', 'gameReset', this)
} // Messages constructor



// Constructor for the Main object. Mostly handles the app's plumbing. 
// '_' becomes an alias for the UTILS library, and 'app' an alias for TTT
TTT.Main = TTT.Main || (function (app, _) {
  var board, display, score, messages
  
  const {Board, Display, Messages, Score} = app
  const {getEl, makePublisher} = _

  const victory_paths = [
    [0,1,2],
    [3,4,5],
    [6,7,8],
    [0,3,6],
    [1,4,7],
    [2,5,8],
    [0,4,8],
    [2,4,6]
  ]
  
  const board_btns = {
    '0': getEl('zero'),
    '1': getEl('one'),
    '2': getEl('two'),
    '3': getEl('three'),
    '4': getEl('four'),
    '5': getEl('five'),
    '6': getEl('six'),
    '7': getEl('seven'),
    '8': getEl('eight')
  }

  const board_btns_arr = getEl('board').querySelectorAll('button')
  
  const start_btn = getEl('start-reset')
  const start_btn_icon = start_btn.querySelector('i')
  const scoreboard_el = getEl('scoreboard')
  const messages_els = {
    'playmode-select': getEl('playmode-select'),
    'x-o-select': getEl('x-o-select'),
    'outcome': getEl('outcome')
  }

  const playmode_btns = [
    getEl('one-player'),
    getEl('two-player')
  ]

  const marker_select_btns = [
    getEl('play-as-x'),
    getEl('play-as-o')
  ]

  const newDisplay = () => display = Display({ 
    board_btns: board_btns, 
    start_btn: start_btn_icon,
    scoreboard: scoreboard_el,
    messages: messages_els
  }, app, _)
  const newBoard = () => board = Board(board_btns, app, _)  
  const newScore = () => score = Score(_)
  const newMessages = () => messages = Messages(_)
  
  newDisplay()
  newMessages()
  newScore()
  newBoard()
  
  // in hindsight the following constructor should have been
  // a separate "Logic" or "Game" module, maybe?
  const Main = function () {
    
    if (!(this instanceof Main)) return new Main()
    
    let state = {
      ai: false,
      p_one_is_x: false,
      is_p_one_turn: false,
      fresh_game: true,
      no_more_moves: false,
      winner: null
    }

    this.getState = () => Object.assign({}, state)

    this.setAi = (e) => {
      state.ai = (e.currentTarget.id === 'one-player') ? true : false
      _.events.fire('playmode_chosen', null)
    }

    this.setPlayerOneMarker = (e) => {
      console.log('marker set for p1!')
      state.p_one_is_x = (e.currentTarget.id === 'play-as-x') ? true : false
      state.is_p_one_turn = state.p_one_is_x
      _.events.fire('marker_chosen', null)
    }

    this.togglePlayer = () => {
      state.is_p_one_turn = !state.is_p_one_turn
      if (state.is_p_one_turn === false && state.ai === true) {
        console.log('computer plays now!')
      }
      console.log('toggle player!')
    }

    this.handleTileSelect = (board_state) => {
      if (!state.fresh_game) {
        state.winner = this.checkForWin(board_state)
        console.log(state.winner)
        if (state.winner.player) {
          _.events.fire('outcome_determined', state.winner)
          console.log(`Outcome determined! Player ${state.winner.player} won!`)
        } else {
          console.log('no winner yet :( womp womp')
          this.togglePlayer()
        }
        console.log('tile select valid, handled tile select')
      }
    }

    this.checkForWin = (board_state) => {
      if(!state.fresh_game) {
        const b = board_state
        const winner = victory_paths.reduce((acc, path) => {
          if (!acc.player && b[path[0]] && b[path[0]] === b[path[1]] && b[path[1]] === b[path[2]]) {
            acc.path = path
            acc.player = ((state.p_one_is_x && b[path[0]] === 'X') || (!state.p_one_is_x && b[path[0]] === 'O')) ? 'one' : 'two'
          }
          return acc
        }, {player: null, path: []})

        return winner
      }
    }

    // this.endTurn = () => {
    //   state.is_p_one_turn = !state.is_p_one_turn
    //   if (state.ai) {

    //   }
    // }

    // this.endGame = () => {

    // }

    this.reset = () => { 
      state = {
        ai: false,
        p_one_is_x: false,
        is_p_one_turn: false,
        fresh_game: true,
        no_more_moves: false
      }
      _.events.fire('game_reset', {
        '0': null,
        '1': null,
        '2': null,
        '3': null,
        '4': null,
        '5': null,
        '6': null,
        '7': null,
        '8': null
      })
    }

    this.tileClicked = (e) => {
      // if (e.currentTarget.className.length > 0) return 
      state.fresh_game = false
      if (!state.ai || state.is_p_one_turn){
        const {is_p_one_turn, p_one_is_x} = state
        const marker = ((is_p_one_turn && p_one_is_x) || (!is_p_one_turn && !p_one_is_x)) ? 'X' : 'O'
        // e.className = (e.className.length > 0) ? e.className : `marker-${marker}`
        console.log(e.currentTarget.id, 'tileClicked ran in Main!')
        _.events.fire('tile_selected', {e, marker})
      }
    }

    this.setNoMoreMoves = () => state.no_more_moves = true
    
    start_btn.addEventListener('click', this.reset)
    _.batchAddEvents(playmode_btns, this.setAi)
    _.batchAddEvents(marker_select_btns, this.setPlayerOneMarker)
    _.batchAddEvents(board_btns_arr, this.tileClicked)

    _.events.on('full_board', 'setNoMoreMoves', this)
    _.events.on('board_changed', 'checkForWin', this)
    _.events.on('board_changed', 'handleTileSelect', this)

  }
  
  return Main
  
})(TTT, UTILS) // end init fn 


  

var ttt // this is temporarily declared here so I can play with it in the console

window.addEventListener('load', () => {
  ttt = new TTT.Main(); 
  // ttt.reset();
}, false)