function ReplayManager() {
  this.moveTimer = null;

  this.tileIndex = 0;
  this.moveIndex = 0;

  this.totalMoves = 0;

  this.events = {};
  this.log = {
    moves: [],
    compressedMoves: '',
    compressedTiles: ''
  };

  this.replayMoves = [];
  this.replayTiles = [];
  this.replaying = false;
  this.paused = false;
  this.replaySpeed = 0;

  this.historySize = 100;
  this.moveHistory = [];
  this.replayHistory = [];

  this.replayTimer = null;

  this.milestones = {
    '4': 0,
    '8': 0,
    '16': 0,
    '32': 0,
    '64': 0,
    '128': 0,
    '256': 0,
    '512': 0,
    '1024': 0,
    '2048': 0,
    '4096': 0,
    '8192': 0,
    '16384': 0,
    '32768': 0,
    '65536': 0,
    '131072': 0,
  }

  this.replayDOMContainer = document.querySelector(".replay textarea");
  this.replayDOMCurrentMove = document.querySelector(".replay .current");
  this.replayDOMCurrentSpeed = document.querySelector(".replay .speed span");
  this.replayDOMTotalMoves = document.querySelector(".replay .total");
  this.replayDOMPlayButton = document.querySelector(".replay .controls .button.play");
  this.replayDOMPauseButton = document.querySelector(".replay .controls .button.pause");
  this.replayDOMStopButton = document.querySelector(".replay .controls .button.stop");
  this.replayDOMFasterButton = document.querySelector(".replay .controls .button.faster");
  this.replayDOMSlowerButton = document.querySelector(".replay .controls .button.slower");
  this.replayDOMReplayButton = document.querySelector(".replay-button");

  this.replayDOMPlayButton.addEventListener("click", this.runReplay.bind(this));
  this.replayDOMPlayButton.addEventListener("touchend", this.runReplay.bind(this));
  this.replayDOMPauseButton.addEventListener("click", this.pauseReplay.bind(this));
  this.replayDOMPauseButton.addEventListener("touchend", this.pauseReplay.bind(this));
  this.replayDOMStopButton.addEventListener("click", this.stopReplay.bind(this));
  this.replayDOMStopButton.addEventListener("touchend", this.stopReplay.bind(this));
  this.replayDOMReplayButton.addEventListener("click", this.runReplay.bind(this));
  this.replayDOMReplayButton.addEventListener("touchend", this.runReplay.bind(this));
  this.replayDOMFasterButton.addEventListener("click", this.setSpeed.bind(this, 100));
  this.replayDOMFasterButton.addEventListener("touchend", this.setSpeed.bind(this, 100));
  this.replayDOMSlowerButton.addEventListener("click", this.setSpeed.bind(this, -100));
  this.replayDOMSlowerButton.addEventListener("touchend", this.setSpeed.bind(this, -100));

  this.replayDOMContainer.addEventListener("click", function() {
    this.select();
  });
}

ReplayManager.prototype.emit = function (event, data) {
  var callbacks = this.events[event];
  if (callbacks) {
    callbacks.forEach(function (callback) {
      callback(data);
    });
  }
};

ReplayManager.prototype.on = function (event, callback) {
  if (!this.events[event]) {
    this.events[event] = [];
  }
  this.events[event].push(callback);
};

ReplayManager.prototype.encode = function (moves) {
  var i, rv = [], n = ~~((moves.length + 2) / 3) * 3;

  for (i = 0; i < n; i += 3) {
    rv.push(
      32 +
      ((moves[i] || 0) & 3) +
      ((moves[i + 1] || 0) & 3) * 4 +
      ((moves[i + 2] || 0) & 3) * 16
    );
  }

  return String.fromCharCode.apply(null, rv);
}

ReplayManager.prototype.decode = function (compressed) {
  var i, rv = [], n = compressed.length;

  for (i = 0; i < n; ++i) {
    var b = compressed.charCodeAt(i) - 32;
    rv.push(b & 3);
    rv.push(~~(b / 4) & 3);
    rv.push(~~(b / 16) & 3);
  }

  return rv;
}

ReplayManager.prototype.reset = function(state) {
  var state = state || {};
  this.log = state.log || {
    moves: [],
    compressedMoves: '',
    compressedTiles: ''
  };
  this.replayMoves = state.replayMoves || [];
  this.replayTiles = state.replayTiles || [];
  this.moveHistory = state.moveHistory || [];
  this.replayHistory = state.replayHistory || [];

  this.update();
}

ReplayManager.prototype.recordMove = function(direction) {
  this.log.moves.push(direction);
  this.log.compressedMoves = this.encode(this.log.moves);
  this.update();
}

ReplayManager.prototype.saveState = function(cells, score) {
  var replay = {
    log: JSON.parse(JSON.stringify(this.log)),
    replayMoves: this.replayMoves,
    replayTiles: this.replayTiles,
    moveHistory: this.moveHistory,
    replayHistory: this.replayHistory,
    code: 'j' + this.log.compressedMoves + 'a' + this.log.compressedTiles + 'm' + this.log.moves.length,
    score: score
  };

  this.moveHistory.unshift(cells);
  this.moveHistory.length = Math.min(this.moveHistory.length, this.historySize); 

  this.replayHistory.unshift(replay);
  this.replayHistory.length = Math.min(this.replayHistory.length, this.historySize); 
}

ReplayManager.prototype.getHistory = function() {
  if (this.moveHistory.length == 0) return false;
  return { grid: this.moveHistory.shift(), replay: this.replayHistory.shift() };
}

ReplayManager.prototype.recordTile = function(tile) {
  value = (tile.value / 2) - 1;
  this.log.compressedTiles += this.encode([value,tile.x,tile.y]);
  this.update();
}

ReplayManager.prototype.update = function() {
  if (this.replaying == true) {
    this.replayDOMCurrentMove.innerHTML = this.moveIndex;
    this.replayDOMTotalMoves.innerHTML = this.totalMoves;
  } else {
    this.replayDOMCurrentMove.innerHTML = this.log.moves.length;
    this.replayDOMTotalMoves.innerHTML = this.log.moves.length;
  }
  this.replayDOMContainer.value = 'j' + this.log.compressedMoves + 'a' + this.log.compressedTiles + 'm' + this.log.moves.length;
}

ReplayManager.prototype.runReplay = function() {
  this.replaying = true;
  this.tileIndex = 0;
  this.moveIndex = 0;

  replaycode = this.replayDOMContainer.value;
  this.replayDOMContainer.readOnly = true;

  this.replayDOMPlayButton.style.display = "none";
  this.replayDOMPauseButton.style.display = "block";

  this.emit("restart");
  this.emit('ignoreKeys', true);

  mv = replaycode.split('j')[1].split('a')[0];
  tl = replaycode.split('a')[1].split('m')[0];
  this.totalMoves = replaycode.split('m')[1];

  this.replayMoves = this.decode(mv);
  tempTiles = this.decode(tl);
  while (tempTiles.length > 0) this.replayTiles.push(tempTiles.splice(0, 3));

  // create the two initial tiles
  this.emit("addTile", this.getReplayTile());
  this.emit("addTile", this.getReplayTile());

  this.initTimer(this.replaySpeed);
}

ReplayManager.prototype.pauseReplay = function() {
  if (this.paused) this.replayDOMPauseButton.className = 'button pause';
  else this.replayDOMPauseButton.className = 'button pause active';
  this.paused = (this.paused) ? false : true;
}

ReplayManager.prototype.setSpeed = function(amt) {
  this.replaySpeed += amt;  
  if (this.replaySpeed <= 0) this.replaySpeed = 0;
  this.replayDOMCurrentSpeed.innerHTML = this.replaySpeed;
  if (this.replaying) this.initTimer();
}

ReplayManager.prototype.initTimer = function() {
  this.replayTimer = new Date();
  clearInterval(this.moveTimer);
  var that = this;
  var callReplayMove = function() {
    if (!that.paused) that.getReplayMove();
  }

  this.moveTimer = window.setInterval(callReplayMove, this.replaySpeed);
}

ReplayManager.prototype.stopReplay = function() {
  this.replaying = false;
  this.paused = false;
  this.replayDOMContainer.readOnly = false;
  this.replayDOMPlayButton.style.display = "block";
  this.replayDOMPauseButton.style.display = "none";
  clearInterval(this.moveTimer);
  this.emit('ignoreKeys', false);
  this.update();
}

ReplayManager.prototype.getReplayTile = function() {
  if (this.tileIndex == this.replayTiles.length) {
    this.stopReplay();
    return null;
  }

  var cell = {
    x: this.replayTiles[this.tileIndex][1],
    y: this.replayTiles[this.tileIndex][2]
  };

  var tile = new Tile(cell, ((this.replayTiles[this.tileIndex][0]*2)+2));

  this.tileIndex++;

  return tile;
}

ReplayManager.prototype.getReplayMove = function() {
  var numMoves = 1;
  if (this.replaySpeed == 0) numMoves = 200;

  for (var i = 0; i < numMoves; i++) {
    if (this.moveIndex == this.totalMoves) {
      this.stopReplay();

      var endTime = new Date();
      var elapsed = endTime - this.replayTimer;
      console.log('finished in ', elapsed/1000);

      return null;
    }
    this.emit("move", this.replayMoves[this.moveIndex]);
    this.moveIndex++;
    this.update();
  }
}