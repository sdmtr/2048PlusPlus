function AIManager() {
  this.events = {};
  this.MAXDEPTH = 2;
}

AIManager.prototype.emit = function (event, data) {
  var callbacks = this.events[event];
  if (callbacks) {
    callbacks.forEach(function (callback) {
      callback(data);
    });
  }
};

AIManager.prototype.on = function (event, callback) {
  if (!this.events[event]) {
    this.events[event] = [];
  }
  this.events[event].push(callback);
};

AIManager.prototype.move = function(grid) {
  // this.emit('move', this.state.direction);

  var origin = new VGrid(grid);


}

AIManager.prototype.descend = function(origin) {
  var children = [];
  var score = 0;

  for (var direction = 0; direction < 4; direction++) {
    var child = new VGrid();
    child.clone(origin);
    score += child.resolve(direction);
    // descend into a new arm at this point
  }

  return score;
}