/* eslint-disable no-undef */
// Originally created by ubi de feo
//  - Creative Technologist since 1997 
//  - http://ubidefeo.com, https://github.com/ubidefeo
//  - original idea from http://ubidefeo.com/fotogrammatrice
// 
// Adapted for teaching by Stefan Marks
//  - http://stefanmarks.info
//  - 

const appState = {
  IDLE:    "idle",
  DRAWING: "drawing",
  ERASING: "erasing",
  PLAYING: "playing"
}

const directions = {
  RIGHT: "right",
  LEFT:  "left",
  UP:    "up",
  DOWN:  "down"
}

const DEFAULT_FRAME_DURATION = 100;

let currentState        = appState.IDLE;
let stateBeforePlayback = currentState;
let actionEnabled       = false;

var exportAnimationName = "animation";
var exportFrameName     = "frame";

var columns    = 12;
var rows       = 8;
var cellSize   = 40;
var cellOffset = 2;

var gridArea = { _x: 0, _y: 0, _width: 0, _height: 0 };

var currentFrame         = 0;
let playbackInterval;
var loopAnimation        = false;
var currentFrameDuration = DEFAULT_FRAME_DURATION;

var frameBuffer  = new Array(rows);
var frames       = new Array();
var previewID    = 0;
var previewsList = new Array();

var baseFrame;
let selectedCells;

let uint32Buffer = new Uint32Array(3);

var hoverCell;
var lastHoverCell;

/* UI */

var frameDurationInput;
var displayHelp = false;


function setup() 
{
  /*  Create the editor canvas  */
  const width  = cellOffset + columns * (cellSize + cellOffset);
  const height = cellOffset + rows    * (cellSize + cellOffset);
  currentFrameDuration = DEFAULT_FRAME_DURATION;
  newFramePreview(true);
  createCanvas(width, height);
  createMatrix(rows, columns);
  
  selectedCells = {matrix: Array.from(Array(rows), () => new Array(columns).fill(0))};
  
  gridArea._x = cellOffset;
  gridArea._y = cellOffset;
  gridArea._width = (cellSize + cellOffset) * columns - cellOffset;
  gridArea._height = (cellSize + cellOffset) * rows - cellOffset;

  /*  Editor will start in DRAWING mode */
  
  changeState(appState.DRAWING);

  const livePreviewSupported = Boolean(navigator.serial);
  if (!livePreviewSupported) {
    const livePreviewBtn = document.getElementById('live-preview-btn')
    livePreviewBtn.setAttribute('disabled', true);
  }
}

function draw() {
  background('#C9D2D2');
  renderMatrix();
  //renderFrameInfo();
  mouseAction();
  
}

async function signalSuccess()
{
  const ew = document.getElementById('editor-container');
  ew.classList.add('success');
  await new Promise(resolve => setTimeout(resolve, 250));
  ew.classList.remove('success');
}


function createMatrix(_rows, _cols) 
{
  var index = 0;
  var coords = { "col": 0, "row": 0 };
  for (r = 0; r < _rows; r++) {
    frameBuffer[r] = new Array(columns);
    for (c = 0; c < _cols; c++) {
      coords.col = c;
      coords.row = r;
      newCell = new Cell(index, index, coords);
      frameBuffer[r][c] = newCell;
    }
  }
  commitFrame(currentFrame);
}


function renderMatrix() 
{
  for (r = 0; r < rows; r++) {
    for (c = 0; c < columns; c++) {
      let cell = frameBuffer[r][c]
      push();
      translate(cellOffset, cellOffset)
      translate(cellSize / 2, cellSize / 2)
      var positionVector = createVector(cell.col * (cellSize + cellOffset), cell.row * (cellSize + cellOffset));
      cell.centerVector = positionVector;
      translate(positionVector);
      cell.update();
      cell.render();
      pop();
    }
  }
}


function renderFrameInfo() 
{
  push();
  textSize(28);
  frameString = "frame:" + (currentFrame + 1) + "/" + (frames.length);
  fill(0x55, 0x55, 0x55);
  textAlign(RIGHT, BASELINE);
  textSize(24);
  text(frameString, width - cellOffset, height - cellOffset * 2);
  pop();
}


function mouseAction() 
{
  if (!(mouseX < width && mouseY < height)) {
    hoverCell = null;
    lastHoverCell = hoverCell;
    return;
  }

  /*
    Render action radius.
    This will not be visible because outside the canvas area,
    but WILL BE KEPT HERE for future debugging purposes and
    behaviour enhancements.
    Might cause merging annoyances if removed from a fork 
  */
  
  for (r = 0; r < rows; r++) {
    for (c = 0; c < columns; c++) {
      let cell = frameBuffer[r][c]
      strokeWeight(1)
      cV = createVector(cell.centerVector.x + cellOffset + cellSize / 2, cell.centerVector.y + cellOffset + cellSize / 2);
      mV = createVector(mouseX, mouseY);
      distance = mV.dist(cV);
      hoverCell = cell;
      if (distance < (cellSize / 2)) {
        hoverCell = cell;
        if (actionEnabled) {
          if (currentState == appState.DRAWING) {
            (frameBuffer[hoverCell.row][hoverCell.col]).setState(true);
            commitFrame(currentFrame);
          }
          else if (currentState == appState.ERASING) {
            (frameBuffer[hoverCell.row][hoverCell.col]).setState(false);
            commitFrame(currentFrame);
          }
        }
	  }
    }
  }
}


function mouseMoved() 
{
  for (r = 0; r < rows; r++) {
    for (c = 0; c < columns; c++) {
      let cell = frameBuffer[r][c]
      cV = createVector(cell.centerVector.x + cellOffset + cellSize / 2, cell.centerVector.y + cellOffset + cellSize / 2);
      mV = createVector(mouseX, mouseY);
      distance = mV.dist(cV);
      if (distance < (cellSize / 2)) {
		if ((currentState == appState.DRAWING) || (currentState == appState.ERASING)) {
		  changeState(frameBuffer[cell.row][cell.col].state == 0 ? appState.DRAWING : appState.ERASING);
		}
	  }
	}
  }
}


function renderThumbnail() 
{
  const framePreviewID = previewsList[currentFrame]
  canvas = document.getElementById(`canvas-${framePreviewID}`);
  c2d = canvas.getContext('2d');
  c2d.smoothingEnabled = false;
  c2d.clearRect(0, 0, c2d.canvas.width, c2d.canvas.height);
  for (var r = 0; r < rows; r++) {
      for (var c = 0; c < columns; c++){
          c2d.beginPath();
          c2d.rect( c * 8, r * 8 , 8, 8);
          let pixelColor = '#ECF1F1'
          if(frames.length > 0){
            pixelColor = frames[currentFrame].matrix[r][c] === 1 ? '#374146' : '#ECF1F1';
          }
          c2d.fillStyle = pixelColor
          c2d.fill();
          c2d.closePath();
      }
  }
}


function showHelp()
{
  displayHelp = !displayHelp;
  const helper = document.getElementById('helper');
  const helperButton = document.getElementById('helper-button')
  const wrapper = document.getElementById('editor-wrapper')
  if (displayHelp) {
    helper.setAttribute('class', 'helper-container visible');
    helperButton.setAttribute('class', 'helper-button selected');
    wrapper.setAttribute('class', 'editor-wrapper with-helper');
  } else {
    helper.setAttribute('class', 'helper-container');
    helperButton.setAttribute('class', 'helper-button');
    wrapper.setAttribute('class', 'editor-wrapper');
  }
}


function changeState(_newState) 
{
  if(_newState == appState.PLAYING){
    stateBeforePlayback = currentState;
  }
  setButtonClass(_newState);
  currentState = _newState;
}


function setButtonClass(currentState) 
{
  const selectedButton = document.getElementById(currentState);
  if (!selectedButton) return;
  const currentClassName = selectedButton.className;
  selectedButton.setAttribute('class', `${currentClassName} selected`);
  Object.values(appState).forEach((state) => {
    if (state !== currentState) {
      document.getElementById(state)?.setAttribute('class', 'toolbar-button');
    }
  })
}

function deleteFrame(_frameNumber = currentFrame) 
{
  if (frames.length <= 1) {
    clearFrame();
    return;
  }
  frames.splice(_frameNumber, 1);
  currentFrame = _frameNumber < frames.length ? _frameNumber : _frameNumber - 1;
  
  deleteThumbnail();
  renderThumbnail();
  goToFrame(currentFrame);
}


function deleteAllFrames() 
{
  frames.length = 0;

  const targetFrameID = previewsList.forEach((id) => { document.getElementById(id).parentElement.remove(); });
  previewsList.length = 0;

  disableButtons();
}


function deleteThumbnail(_frameNumber = currentFrame)
{
  const targetFrameID = previewsList[currentFrame]
  document.getElementById(targetFrameID).parentElement.remove()
  disableButtons();
  previewsList.splice(_frameNumber, 1);
}


function clearFrame()
{
  for (r = 0; r < rows; r++) {
    for (c = 0; c < columns; c++) {
      let cell = frameBuffer[r][c];
      cell.setState(false);
    }
  }
  commitFrame(currentFrame);
}


function newFrame(_frameToClone = null)
{
  let newFrame = _frameToClone;
  if (newFrame == null) {
    newFrame = { duration: DEFAULT_FRAME_DURATION, matrix: Array.from(Array(rows), () => new Array(columns).fill(0)), selected: false }
  }
  const lastFrame = frames.length - 1;
  commitFrame(lastFrame);
  frames.splice(lastFrame + 1, 0, newFrame);
  fillFrameBuffer(newFrame);
  currentFrame = lastFrame + 1;

  newFramePreview();

  goToFrame(currentFrame);
  toggleFrameSelection(currentFrame, false);
  disableButtons();
}


function toggleFrameSelection(_frameNumber = currentFrame, _newState = null)
{
  var newState = (_newState != null) ? _newState : !frames[_frameNumber].selected
  frames[_frameNumber].selected = newState;
}


function createFramesPreviews()
{  
  framePreviewID = 0;
  for(frame in frames) {
    newFramePreview();
    currentFrame++;
  }
  goToFrame(0);
  disableButtons();
}

function newFramePreview(firstFrame = false) 
{
  const framePreviewID = `frame-preview-${previewID}`;
  const framePreviewContainer = document.createElement('div');
  framePreviewContainer.setAttribute('class', 'frame-preview-container');

  currentFrameDurationInput = document.createElement("INPUT");
  currentFrameDurationInput.setAttribute("type", "number")
  currentFrameDurationInput.setAttribute('class', 'frame-duration');
  currentFrameDurationInput.setAttribute('id', `frame-duration-${framePreviewID}`);
  let referenceDuration = DEFAULT_FRAME_DURATION;
  if(!firstFrame){
    referenceDuration = frames[currentFrame].duration;
  }
  currentFrameDurationInput.value = currentFrameDuration = referenceDuration;
  currentFrameDurationInput.addEventListener('input', (event) => {
    const splitString = event.target.id.split('-')
    const id = splitString[splitString.length - 1];
    changeFrameDuration(event.target.value, id);
  });  
  
  const newFramePreview = document.createElement('div');
  newFramePreview.setAttribute('class', 'frame-preview');
  newFramePreview.setAttribute('id', framePreviewID);
  newFramePreview.addEventListener('click', (e) => {
    const splitString = e.target.id.split('-')
    const id = splitString[splitString.length - 1];
    const targetFrame = previewsList.indexOf(`frame-preview-${id}`);
    goToFrame(targetFrame)
  });

  const canvas = document.createElement('canvas');
  canvas.setAttribute('width', 96);
  canvas.setAttribute('height', 64);
  canvas.setAttribute("id", `canvas-${framePreviewID}`);

  newFramePreview.appendChild(canvas);

  framePreviewContainer.appendChild(newFramePreview);
  framePreviewContainer.appendChild(currentFrameDurationInput);

  const framesContainer = document.getElementById('frames-container');
  const addButton = document.getElementById('add-button');
  framesContainer.insertBefore(framePreviewContainer, addButton);
  previewsList.push(framePreviewID);
  renderThumbnail();
  frameDurationInput = currentFrameDurationInput;
  previewID++;
}


function commitFrame(_frameNumber = 0) 
{
  var frame = {};
  frame.matrix = new Array();
  var frameSelected = false;
  if(frames[currentFrame] != null){
    frameSelected = frames[currentFrame].selected;
  }
  let binaryString = "";
  let currentBit = 0;
  let uint32_index = 0;
  let frameUpdatable = false;
  for (let r = 0; r < rows; r++) {
    frame.matrix[r] = new Array();
    for (c = 0; c < columns; c++) {
      let cell = frameBuffer[r][c];
      frame.matrix[r][c] = cell.state ? 1 : 0;
      binaryString += cell.state ? 1 : 0;
      if (((currentBit + 1) % 32) == 0) {
        const newValue = parseInt(binaryString, 2);
        if (uint32Buffer[uint32_index] != newValue) {
          uint32Buffer[uint32_index] = newValue;
          frameUpdatable = true;
        }
        binaryString = "";
        uint32_index++;
      }
      currentBit++;
    }
  }
  if (frameUpdatable) {
    if (serialPortReady) {
      writeSerialData();
    }
  }
  frameDurationInput.value = currentFrameDuration;
  frame.duration = currentFrameDuration;
  frames[_frameNumber] = frame;
  frames[_frameNumber].selected = frameSelected;
  baseFrame = frame;
  renderThumbnail();
}


function fillFrameBuffer(_frame = frames[currentFrame]) 
{
  for (r = 0; r < rows; r++) {
    for (c = 0; c < columns; c++) {
      frameBuffer[r][c].state = _frame.matrix[r][c]
    }
  }
}


function changeFrameDuration(_value, frameNumber = currentFrame)
{
  frames[frameNumber].duration = _value;
}


/*  
  CONSOLE FRAME PRINT (DEBUG)
  The following functions are only useful for debug purposes.
  They print a text block preview of the frames into the console
*/

function printFrameBuffer() 
{
  console.log("frameBuffer                 selected");
  var printOut = "";
  for (r = 0; r < rows; r++) {
    for (c = 0; c < columns; c++) {
      let cell = frameBuffer[r][c];
      printOut += cell.state ? "🟪" : "⬜️";

    }
    printOut += " > "
    for (c = 0; c < columns; c++) {
      let cell = frameBuffer[r][c];
      printOut += cell.selected ? "🟨" : "⬜️";
    }
    printOut += "\n"
  }
  console.log(printOut);
}


function printSelectedCells() 
{
  console.log("print selected cells");
  var printOut = "";
  for (r = 0; r < rows; r++) {
    for (c = 0; c < columns; c++) {
      let selectedCell = selectedCells.matrix[r][c];
      printOut += selectedCell ? "🟪" : "⬜️";
    }
    printOut += "\n"
  }
  console.log(printOut);
}


function printFrames() 
{
  console.log("frames");
  var printOut = "";
  for (let f = 0; f < frames.length; f++) {
    let frame = frames[f].matrix;
    for (r = 0; r < rows; r++) {
      for (c = 0; c < columns; c++) {
        let value = frame[r][c];
        printOut += value ? "🟪" : "⬜️";
      }
      printOut += "\n";
    }
    printOut += "\n";
  }
  console.log(printOut);
}

/*  END CONSOLE FRAME PRINT (DEBUG) */


/*
  The following functions export frames content into
  different kind of structures
*/

/*  USED FOR OUR 12x8 matrix  */

function exportFrame(exportToClipboard) 
{
  var frameName = promptForName("Choose a name for your single frame. Do NOT use spaces:", exportFrameName);
  if(frameName === null) { return; }
  
  exportFrameName = frameName; // save for following dialogues
  var code = generateFrameCode(frameName);
  if (exportToClipboard) { copyStringToClipboard(code); signalSuccess(); }
  else                   { saveStringToFile(code, frameName + ".h"); }
}


function exportAnimation(exportToClipboard) 
{
  var animationName = promptForName("Choose a name for your animation. Do NOT use spaces:", exportAnimationName);
  if(animationName === null) { return; }
  
  exportAnimationName = animationName;  
  var code = generateAnimationCode(animationName);
  if (exportToClipboard) { copyStringToClipboard(code); signalSuccess(); }
  else                   { saveStringToFile(code, animationName + ".h"); }
}


function generateFrameCode(frameName)
{
  var printOut = "const uint32_t " + frameName + "[] = {";
  let binaryString = "";
  for (r = 0; r < rows; r++) {
    for (c = 0; c < columns; c++) {
      let value = frames[currentFrame].matrix[r][c];
      binaryString += value;
    }
  }
  let uint32String = "";
  let uint32Array = new Array();
  for (let c = 0; c < binaryString.length; c++) {
    uint32String += (binaryString[c]);
    if ((c + 1) % 32 == 0) {
      uint32String = "0x" + parseInt(uint32String, 2).toString(16).padStart(8, '0')
      printOut += "\n\t" + uint32String;

      if (c + 1 == binaryString.length) {
        printOut += "\n";
      } else {
        printOut += ",";
      }

      uint32Array.push(uint32String);
      uint32String = "";
    }
  }
  printOut += "};"
  return printOut;
}


function generateAnimationCode(animationName) 
{
  var printOut = "const uint32_t " + animationName + "[][4] = {" + "\n";
  for (let f = 0; f < frames.length; f++) {
    printOut += "\t{";
    let frame = frames[f];
    if (frame.duration == undefined) frame.duration = DEFAULT_FRAME_DURATION;
    let binaryString = "";
    for (r = 0; r < rows; r++) {
      for (c = 0; c < columns; c++) {
        let value = frame.matrix[r][c];
        binaryString += value;
      }
    }
    
    // split binary string into uint32_t chunks
    let uint32String = "";
    let uint32Array = new Array();
    for (let c = 0; c < binaryString.length; c++) {
      uint32String += (binaryString[c]);
      if ((c + 1) % 32 == 0) {
        uint32String = "0x" + parseInt(uint32String, 2).toString(16).padStart(8, '0')
        printOut += "\n\t\t" + uint32String;

        if (c + 1 == binaryString.length) {
          printOut += ",\n";
          printOut += `\t\t${frame.duration}`;
          printOut += "\n\t}";
          if (f != frames.length - 1) {
            printOut += ",";
          }
          printOut += "\n";
        } else {
          printOut += ",";
        }

        uint32Array.push(uint32String);
        uint32String = "";
      }
    }
  }

  printOut += "};"
  return printOut;
}


function copyStringToClipboard(str) {
	/*
   // Create new element
   var el = document.createElement('textarea');
   // Set value (string to be copied)
   el.value = str;
   // Set non-editable to avoid focus and move outside of view
   el.setAttribute('readonly', '');
   el.style = {position: 'absolute', left: '-9999px'};
   document.body.appendChild(el);
   // Select text inside element
   el.select();
   // Copy text to clipboard
   document.execCommand('copy');
   // Remove temporary element
   document.body.removeChild(el);*/
   try {
    navigator.clipboard.writeText(str);
  } catch (error) {
    console.error(error.message);
  }
}


function saveStringToFile(str, filename)
{
  const blob = new Blob([str], { type: "text/plain" });
  const downloadLink = document.createElement("a");
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = filename;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}


/*
  TEMPORARILY UNUSED AND BUGGY
  DO NOT TOUCH
*/
function exportFrames()
{
  var printOut = "";
  printOut += "const uint16_t " + DEFAULT_ANIMATION_NAME + "[][8] = {" + "\n";
  for (let f = 0; f < frames.length; f++) {
    let frame = frames[f];
    printOut += "\t{\n"
    for (r = 0; r < rows; r++) {

      let uint16_t_value = "";
      for (c = 0; c < columns; c++) {
        let value = frame.matrix[r][c];
        uint16_t_value += value;
      }
      uint16_t_value = "\t\t0x" + parseInt(uint16_t_value, 2).toString(16);
      printOut += uint16_t_value;
      if (r < rows - 1) {
        printOut += ",\n";
      } else {
        printOut += "\n"

      }
    }
    printOut += "\t}"
    printOut += ""
    if (f < frames.length - 1) {
      printOut += ",\n";
    } else {
      printOut += "\n"
    }
  }
  printOut += "}"

  /*
    Create download blob and link,
    trigger download and then remove it
  */
  const blob = new Blob([printOut], { type: "text/plain" });
  const downloadLink = document.createElement("a");
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = "animationFrames.h";
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}


/*
  Project load/save
*/
function loadProject() 
{
  const fileUpload = document.createElement("input");
  fileUpload.type = "file"
  fileUpload.id = "file-input";
  fileUpload.addEventListener("change", function () {
    const fileReference = fileUpload.files[0];
    const fReader       = new FileReader();
    fReader.onload = function (event) {
      var fileContent = event.target.result;
      deleteAllFrames();
      frames = JSON.parse(fileContent);
      createFramesPreviews();
      goToFrame(0);
      console.log(fileContent); // do something with the file content
    };
    fReader.readAsText(fileReference);
  });
  
  /*
    Create upload link,
    trigger upload and remove it
  */
  document.body.appendChild(fileUpload);
  fileUpload.click();
  document.body.removeChild(fileUpload);
}


function saveProject() 
{
  /*
    Create download blob and link,
    trigger download and then remove it
  */
  const blob = new Blob([JSON.stringify(frames)], { type: "text/plain" });
  const downloadLink = document.createElement("a");
  downloadLink.href = URL.createObjectURL(blob);

  const now = new Date()
  var year = now.getFullYear();
  var month = now.getMonth() + 1;
  var day = now.getDate();
  var hours = now.getHours();
  var minutes = now.getMinutes();
  var seconds = now.getSeconds();
  const datetimeFileName = "" + year + month + day + hours + minutes + seconds;

  var fileName;
  fileName = promptForName("Please enter a file name:", "MatrixProject_" + datetimeFileName);
  
  if (fileName === null) {
    document.body.removeChild(downloadLink);
    return;
  }

  downloadLink.download = fileName + ".mpj";
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}


function shiftMatrix(_direction) 
{
  var wrapEnabled = keyIsDown(ALT);
  tempFrame = offsetArray(baseFrame.matrix, _direction, wrapEnabled);
  
  for (let r = 0; r < rows; r++) {
    for (c = 0; c < columns; c++) {
	  let cell = frameBuffer[r][c];
	  cell.setState(tempFrame[r][c]);
    }
  }
  commitFrame(currentFrame);
}


function playBack(_startFrame = currentFrame) 
{
  var loop = keyIsDown(SHIFT);
  clearTimeout(playbackInterval);
  if(currentState == appState.PLAYING){
    changeState(stateBeforePlayback);
  }else{
    changeState(appState.PLAYING);   
    loopAnimation = loop;
    goToFrame(_startFrame);
    playNextFrame();
  }
}

function playNextFrame() {
  playbackInterval = setTimeout(() => {
    if (currentFrame < frames.length - 1) {
      currentFrame++;
      goToFrame(currentFrame);
      playNextFrame();
    } else {
      currentFrame = 0;
      goToFrame(currentFrame);
      if(loopAnimation){
        playNextFrame();
      }else{
        currentState = stateBeforePlayback;
      }
    }
  }, currentFrameDuration);
}


function goToFrame(_frame) 
{
  currentFrame = _frame;
  if (currentFrame >= frames.length) currentFrame = frames.length -1;
  if (currentFrame < 0) currentFrame = 0;
  //console.log("going to frame ", currentFrame);  
  fillFrameBuffer()
  currentFrameDuration = frames[currentFrame].duration;
  commitFrame(currentFrame);
  document.getElementsByClassName('frame-preview-container selected').forEach((p) => p.setAttribute('class', 'frame-preview-container'));
  const previewFrameID = previewsList[currentFrame];
  const selected = document.getElementById(previewFrameID);
  selected.parentElement.setAttribute('class', 'frame-preview-container selected');
}


function undo() 
{
  console.log('undo to be implemented')
}


function redo() 
{
  console.log('undo to be implemented')
}


document.addEventListener('dragover', (e) => {
  e.stopPropagation();
  e.preventDefault();
});


/*
  NOTE TO FUTURE SELF:
  WHILE WRITING SOME OF THIS CODE I INTRODUCED A SERIES
  OF ANNOYING BUGS WHILE PARSING PASTED PNG DATA TO BE USED AS PIXELS.
  A MAIN THING I LEARNED WAS THAT I LEARNED HOW NOT TO CREATE NEW ARRAYS IN JS.
  THE CREATION OF EMPTY BI-DIMENSIONAL ARRAYS THAT USED `fill()` TO
  INITIALIZE ROWS OF DATA: WRONG.
  DAVE SIMPSON HELPED ME FIND THE BUG AND FIX IT :)
  (https://github.com/davegarthsimpson)
*/
function offsetArray(array, direction, wrap) 
{
  const numRows = array.length;
  const numCols = array[0].length;

  // Determine the amount of cellOffset based on the direction
  let rowOffset = 0;
  let colOffset = 0;
  if (direction === directions.UP) {
    rowOffset = -1;
  } else if (direction === directions.DOWN) {
    rowOffset = 1;
  } else if (direction === directions.LEFT) {
    colOffset = -1;
  } else if (direction === directions.RIGHT) {
    colOffset = 1;
  }

  // Create a new array with the same dimensions as the original array, and initialize each element to 0
  const result = Array.from({ length: numRows }, () => Array(numCols).fill(0));

  // Loop through each cell in the original array and copy it to the new array with the cellOffset
  for (let i = 0; i < numRows; i++) {
    for (let j = 0; j < numCols; j++) {
      let newRow = i + rowOffset;
      let newCol = j + colOffset;

      // Handle wrapping if enabled
      if (wrap) {
        if (newRow < 0) newRow = numRows - 1;
        if (newRow >= numRows) newRow = 0;
        if (newCol < 0) newCol = numCols - 1;
        if (newCol >= numCols) newCol = 0;
      } else {
        if (newRow < 0 || newRow >= numRows || newCol < 0 || newCol >= numCols) {
          // If wrapping is disabled and the cellOffset goes out of bounds, copy 0 to the new array instead of throwing an error
          continue;
        }
      }

      // Copy the value from the original array to the new array with the cellOffset
      result[newRow][newCol] = array[i][j];
    }
  }
  return result;
}


function promptForName(description, defaultString)
{
  var nameString;
  if(isElectron){
    nameString = defaultString;
  }else{
    nameString = prompt(description, defaultString);
  }
  return nameString;
}


function disableButtons() 
{
  const deleteButton = document.getElementById('delete-button');
  const play = document.getElementById('play');
  if (frames.length === 1) {
    deleteButton.setAttribute('disabled', true);
    play.setAttribute('disabled', true);
  } else {
    deleteButton.removeAttribute('disabled');
    play.removeAttribute('disabled');
  }
}


// LIVE VIEW DIALOGS 
function showLiveTestDialog(show) 
{
  const display = show ? "block" : "none"
  const testLiveModal = document.getElementById("test-live-modal");
  testLiveModal.style.display = display;
}


function deviceConnectedDialog(show, port = false)
{
  const display = show ? "block" : "none"
  const deviceConnectedModal = document.getElementById("device-connected-modal");
  deviceConnectedModal.style.display = display;

  if(!show && port) openPort()
}


function liveTestDialogGo()
{
  showLiveTestDialog(false)
  deviceConnectedDialog(true)
}


function deviceConnectedBack()
{
  deviceConnectedDialog(false)
  showLiveTestDialog(true)
}

