// This is my own helper library. Will grow with time.
var UTILS = {
  batchAddEvents: (arr) => {
    var i = 0,
        max = arr.length
    
    for (i; i < max; i++) {
      let type = arr[i].type || 'click'
      arr[i].el.addEventListener(type, fn, false)
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

  this.stateReset = (newState) => {
    state = newState
    _.events.fire('board_changed', newState)
  }
    
  // method for adding a marker, X or O, to the board's state.
  this.placeMarker = (e, marker) => {
    let btn = this.state[e.target.value] 
    btn = (typeof btn === null) ? marker : btn
  }
    
  // Privileged method for safely accessing state without accidental mutation
  this.getState = () => Object.assign({}, state)
  
    
  _.events.on('game_reset', 'stateReset', this)

  // This is temporary - remove when finished dev
  _.events.fire('board_changed', state)
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
  _.events.on('game_reset', 'startToReset', this)
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

  _.events.on('game_reset', 'gameReset', this)
} // Messages constructor



// Constructor for the Main object. Mostly handles the app's plumbing. 
// '_' becomes an alias for the UTILS library, and 'app' an alias for TTT
TTT.Main = TTT.Main || (function (app, _) {
  var board, display, score, messages
  
  const {Board, Display, Messages, Score} = app
  const {getEl, makePublisher} = _
  
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
  
  const start_btn = getEl('start-reset')
  const start_btn_icon = start_btn.querySelector('i')
  const scoreboard_el = getEl('scoreboard')
  const messages_els = {
    'playmode-select': getEl('playmode-select'),
    'x-o-select': getEl('x-o-select'),
    'outcome': getEl('outcome')
  }
  
  const Main = function () {
    
    if (!(this instanceof Main)) return new Main()
    
    let state = {
      ai: false,
      
    }

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
    
    start_btn.addEventListener('click', this.reset)
    
  }
  Main.prototype.reset = function () { 
    UTILS.events.fire('game_reset', {
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
  
  return Main
  
})(TTT, UTILS) // end init fn 


  

var ttt // this is temporarily declared here so I can play with it in the console

window.addEventListener('load', () => {
  ttt = new TTT.Main(); 
  // ttt.reset();
}, false)