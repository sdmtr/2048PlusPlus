function VGrid(grid) {
  this.columns = [[],[],[],[]];
  this.rows = [[],[],[],[]];
  
  if (grid) this.ingest(grid);
}

VGrid.prototype.ingest = function (grid) {
  var self = this;

  grid.cells.forEach(function (column, columnIndex) {
    column.forEach(function (cell, rowIndex) {
      var value = (cell) ? cell.value : 0;
      self.columns[columnIndex].push(value);
      self.rows[rowIndex].push(value);
    });
  });
};

VGrid.prototype.clone = function(clone) {
  var self = this;
  clone.columns.forEach(function (column, x) {
    column.forEach(function(cell, y) {
      self.columns[x][y] = cell;
      self.rows[y][x] = cell;
    });
  });
}

VGrid.prototype.resolveLine = function(line) {
  var score = 0;
  // create an array of objects from the line so we can track merges
  var smarterLine = line.map(function(entry) { return { value: entry, merged: false }; });

  for (var attempts = 0; attempts < 3; attempts++) {
    smarterLine.forEach(function(entry, index) {
      var neighbour = index - 1;

      // i'm a zero or i am the first number, either way we can move on
      if (entry.value == 0 || index == 0) return;

      if (smarterLine[neighbour].value == 0) {
        // the slot next to me is empty, so i'll move myself there
        smarterLine[neighbour] = { value: entry.value, merged: entry.merged };
        smarterLine[index] = { value: 0, merged: false };
      } else if (smarterLine[neighbour].value == entry.value && smarterLine[neighbour].merged === false && entry.merged === false) {
        // the slot next to me is the same as me and neither of us are the product of a merge, so let's merge
        score += entry.value * 2;
        smarterLine[neighbour] = { value: entry.value * 2, merged: true };
        smarterLine[index] = { value: 0, merged: false };
      }
    });
  }

  // turn it back into an array of tile values
  smarterLine = smarterLine.map(entry => entry.value);

  return { line: smarterLine, score: score };
}

VGrid.prototype.resolve = function(direction) {
  var self = this;
  var score = 0;

  switch (direction) {
    case 0:
      this.columns.forEach(function(line) {
        var resolvedLine = self.resolveLine(line);
        score += resolvedLine.score;
      });
      break;

    case 1:
      this.rows.forEach(function(line) {
        var resolvedLine = self.resolveLine(line.reverse());
        score += resolvedLine.score;
      });
      break;

    case 2:
      this.columns.forEach(function(line) {
        var resolvedLine = self.resolveLine(line.reverse());
        score += resolvedLine.score;
      });
      break;

    case 3:
      this.rows.forEach(function(line) {
        var resolvedLine = self.resolveLine(line);
        score += resolvedLine.score;
      });
      break;
  }

  return score;
}

VGrid.prototype.availableCells = function() {
  var available = [];
  this.columns.forEach(function (column, x) {
    column.forEach(function(cell, y) {
      if (cell === 0) available.push({ x: x, y: y });
    });
  });

  return available;
}

VGrid.prototype.randomAvailableCell = function() {
  var available = this.availableCells();
  return available[~~(available.length * Math.random())];
}

VGrid.prototype.addRandomTile = function(x, y) {
  var cell = this.randomAvailableCell();
  var value = Math.random() < 0.9 ? 2 : 4;
  this.columns[cell.x][cell.y] = value;
  this.rows[cell.y][cell.x] = value;
}

VGrid.prototype.print = function() {
  console.log(this.columns);
  console.log(this.rows);
}

// take in a vgrid, absorb its current score, keep moving it down the line until it's dead in which case reset its score to zero, or it hits the depth limit. keep track of the highest score you see as oyu do this and then pick the start of that thread 

// if (line[i-1] > line[i]) {
//     monotonicity_left += pow(line[i-1], SCORE_MONOTONICITY_POWER) - pow(line[i], SCORE_MONOTONICITY_POWER);
// } else {
//     monotonicity_right += pow(line[i], SCORE_MONOTONICITY_POWER) - pow(line[i-1], SCORE_MONOTONICITY_POWER);
// }