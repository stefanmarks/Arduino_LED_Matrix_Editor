
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

function Cell(_index, _column, _row) 
{
    this.state        = 0;
    this.currentColor = CELL_OFF_COLOR;
    this.index        = _index;
    this.coords       = { 'col' : _column, 'row' : _row};
    this.selected     = false;

	this.position = createVector(
	  (_column * (CELL_SIZE + CELL_SPACING)) + ((CELL_SIZE / 2) + CELL_SPACING), 
	  (_row    * (CELL_SIZE + CELL_SPACING)) + ((CELL_SIZE / 2) + CELL_SPACING)
	);
	
    this.toggleState = function() 
	{
        this.setState(!this.state);
    };

    this.setState = function(_state) 
	{    
        this.state = _state;
		this.currentColor = this.state ? CELL_ON_COLOR : CELL_OFF_COLOR;    
    };

    this.setSelected = function(_select = true)
	{
        this.selected = _select;
    };
	
    this.clear = function()
	{
        this.setState(0);
    };

    this.render = function() 
	{
	  push();
      rectMode(CENTER);
      translate(this.position.x, this.position.y);
      strokeWeight(0);
      fill(this.selected ? CELL_HILIGHT_COLOR : CELL_OFF_COLOR);
      rect(0, 0, CELL_SIZE, CELL_SIZE);
      fill(this.currentColor);
      rect(0, 0, CELL_SIZE - 6, CELL_SIZE - 6);
	  pop();
    };
    
    this.getMemory = function(_format) 
	{
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
