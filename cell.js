
/*
* @Author: ubi
* @Date:   2018-06-24 11:58:19
* @Last Modified by:   ubi
* @Last Modified time: 2018-07-01 18:09:33
*/


/*
    This file comes from the original FotogramMatrice,
    hence it contains code which is not useful or used
    anymore.
    Cleanup is in progress and refactoring will happen
*/

function Cell(_index, _itemID, _coords) {
    this.cellColor      = '#374146'; // ECF1F1
    this.highlightColor = '#D35400';
    this.activeColor    = '#FF4146'; // 374146
    this.currentColor   = this.cellColor;
    this.col = _coords.col;
    this.row = _coords.row;
    this.coords = _coords;
    this.index = 0;
    this.state = 0;
    this.itemID = _itemID;
    this.index  = _index;
    this.centerVector = createVector(0, 0);
    this.selected = false;
	
    this.getId = function() {
        return this.index;
    };

    this.switchStatus = function() {
        this.setState(!this.state);
    };

    this.setState = function(_state) {
        //if(_state == this.state) return;
        this.state = _state;
        if(_state == false){
        	this.clear();
        }
        // this.updateView();
    };

    this.select = function(_select = true){
        this.selected = _select;
    }
	
    this.clear = function(){
        this.state = 0;
    }
	
    this.update = function() {
    };

    this.render = function(){
        rectMode(CENTER);
        strokeWeight(0);
        fill(this.currentColor);
        rect(0, 0, cellSize, cellSize);

        let borderColor = this.cellColor;
        let cellBackgroundColor = this.cellColor;

        // Update cell colors based on state and selection
        if (this.state) {
        cellBackgroundColor = this.activeColor;
        borderColor = this.selected ? this.highlightColor : this.activeColor;
        } else {
            borderColor = this.selected ? this.highlightColor : this.cellColor;
        }
        
        fill(borderColor);
        rect(0, 0, cellSize, cellSize);
        fill(cellBackgroundColor);
        rect(0, 0, cellSize - 6, cellSize - 6);
    }
    this.highLight = function(){
        this.currentColor = this.highlightColor;
    }
    this.darken = function(){
        this.currentColor = this.cellColor;
    }
    this.getMemory = function(_format) {

        var memory = {};
        memory.state = this.state;
        memory.color = this.color;
        var memoryJSON = "{ state: " + memory.state + ", " + "color: \"" + memory.color + "\"}";
        var memoryBinary = memory.state === 0 ? 0 : 1;
        var memoryHex = (new RGBColor(memory.color)).toHex('0x');
        var alpha = (memory.state ? "ff" : "00");
        if (_format === "binary") {
            return (memoryBinary);
        } else if (_format === "JSON") {
            return (memoryJSON);
        } else if (_format === "HEX") {
            return (memoryHex + alpha);
        } else if (_format === undefined) {
            return memory;
        }
    };

    this.setMemory = function(_memory) {
        this.state = _memory.state;
        this.color = _memory.color;
    };
}