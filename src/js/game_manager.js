function GameManager(size, InputManager, Actuator, ScoreManager, Replay, AI) {
  this.size         = size; // Size of the grid
  this.inputManager = new InputManager;
  this.scoreManager = new ScoreManager;
  this.actuator     = new Actuator;
  this.replay       = new Replay;
  this.ai           = new AI;

  this.startTiles   = 2;

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("undo", this.undo.bind(this));
  this.inputManager.on("aimove", this.aimove.bind(this));

  this.setup();

  this.replay.on("move", this.move.bind(this));
  this.replay.on("restart", this.restart.bind(this));
  this.replay.on("addTile", this.addTile.bind(this));
  this.replay.on("ignoreKeys", this.ignoreKeys.bind(this));

  this.ai.on("move", this.move.bind(this));
}

// Restart the game
GameManager.prototype.restart = function () {
  this.replay.reset();
  this.actuator.restart();
  this.setup();
};

GameManager.prototype.ignoreKeys = function (t) {
  this.inputManager.ignoreKeys(t);
}

// Set up the game
GameManager.prototype.setup = function () {
  this.grid         = new Grid(this.size);

  this.score        = 0;
  this.over         = false;
  this.won          = false;
  this.continue     = true;

  // Add the initial tiles
  if (!this.replay.replaying) {
    this.addStartTiles();
  }

  // Update the actuator
  this.actuate();
};

// Set up the initial tiles to start the game with
GameManager.prototype.addStartTiles = function () {
  for (var i = 0; i < this.startTiles; i++) {
    this.addRandomTile();
  }
};

GameManager.prototype.addTile = function (tile) {
  if (this.grid.cellsAvailable()) {
    this.grid.insertTile(tile);
    this.replay.recordTile(tile);
  }
};

// Adds a tile in a random position
GameManager.prototype.addRandomTile = function () {
  if (this.grid.cellsAvailable()) {
    var value = Math.random() < 0.9 ? 2 : 4;
    var cell = this.grid.randomAvailableCell();
    var tile = new Tile(cell, value);
    this.addTile(tile);
  }
};

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
  if (this.scoreManager.get() < this.score) {
    this.scoreManager.set(this.score);
  }

  this.actuator.actuate(this.grid, {
    score:     this.score,
    over:      this.over,
    won:       this.won,
    continue:  this.continue,
    bestScore: this.scoreManager.get(),
    milestones: this.replay.milestones,
  });

};

// Save all tile positions and remove merger info
GameManager.prototype.prepareTiles = function () {
  this.grid.eachCell(function (x, y, tile) {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });
};

// Move a tile and its representation
GameManager.prototype.moveTile = function (tile, cell) {
  this.grid.cells[tile.x][tile.y] = null;
  this.grid.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};

// undo the last move hopefully?
GameManager.prototype.undo = function() {
  
  var history = this.replay.getHistory();
  if (!history) return;

  this.replay.reset(history.replay);
  this.score = history.replay.score;
  
  // reset the grid
  this.grid.cells = [];
  for (var x = 0; x < this.grid.size; x++) {
    var row = this.grid.cells[x] = [];
    for (var y = 0; y < this.grid.size; y++) {
      if (history.grid[x][y] === null) {
        row.push(null);
      } else {
        var historicTile = history.grid[x][y];
        var newTile = new Tile({ x: historicTile.x, y: historicTile.y }, historicTile.value);
        row.push(newTile);
      }
    }
  }

  this.actuate();
}

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
  // 0: up, 1: right, 2:down, 3: left
  var self = this;

  if ((this.over || this.won) && !this.continue) return; // Don't do anything if the game's over

  var cell, tile;

  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved      = false;

  // Save the current tile positions and remove merger information
  this.prepareTiles();

  // save the current grid state in case we need it for the undo history later on
  var startState = JSON.parse(JSON.stringify(this.grid.cells));
  var startScore = this.score;

  // Traverse the grid in the right direction and move tiles
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      cell = { x: x, y: y };
      tile = self.grid.cellContent(cell);

      if (tile) {
        var positions = self.findFarthestPosition(cell, vector);
        var next      = self.grid.cellContent(positions.next);

        // Only one merger per row traversal?
        if (next && next.value === tile.value && !next.mergedFrom) {
          var merged = new Tile(positions.next, tile.value * 2);
          merged.mergedFrom = [tile, next];

          self.grid.insertTile(merged);
          self.grid.removeTile(tile);

          // Converge the two tiles' positions
          tile.updatePosition(positions.next);

          // Update the score
          self.score += merged.value;

          // The mighty 131072 tile
          if (merged.value === 131072) self.won = true;

          // record a milestone if appropriate
          if ((merged.value & -merged.value) == merged.value)
            self.replay.milestones[merged.value] = self.replay.milestones[merged.value] || self.replay.log.moves.length;
          
        } else {
          self.moveTile(tile, positions.farthest);
        }

        if (!self.positionsEqual(cell, tile)) {
          moved = true; // The tile moved from its original cell!
        }
      }
    });
  });

  if (moved) {
    this.replay.saveState(startState, startScore);
    if (this.replay.replaying) {
      tile = this.replay.getReplayTile();
      if (tile != null) this.addTile(tile);
    } else {
      this.addRandomTile();
    }

    this.replay.recordMove(direction);

    if (!this.movesAvailable()) {
      this.over = true; // Game over!
    }

    this.actuate();
  }
};

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
  // Vectors representing tile movement
  var map = {
    0: { x: 0,  y: -1 }, // up
    1: { x: 1,  y: 0 },  // right
    2: { x: 0,  y: 1 },  // down
    3: { x: -1, y: 0 }   // left
  };

  return map[direction];
};

// Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [] };

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
  }

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();

  return traversals;
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (this.grid.withinBounds(cell) &&
           this.grid.cellAvailable(cell));

  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  };
};

GameManager.prototype.movesAvailable = function () {
  return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

// Check for available matches between tiles (more expensive check)
GameManager.prototype.tileMatchesAvailable = function () {
  var self = this;

  var tile;

  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      tile = this.grid.cellContent({ x: x, y: y });

      if (tile) {
        for (var direction = 0; direction < 4; direction++) {
          var vector = self.getVector(direction);
          var cell   = { x: x + vector.x, y: y + vector.y };

          var other  = self.grid.cellContent(cell);

          if (other && other.value === tile.value) {
            return true; // These two tiles can be merged
          }
        }
      }
    }
  }

  return false;
};

GameManager.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y;
};

GameManager.prototype.aimove = function() {
  this.ai.move(this.grid);
}