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

let currentState        = appState.IDLE;
let stateBeforePlayback = currentState;
let actionEnabled       = false;

var exportAnimationName = "animation";
var exportFrameName     = "frame";

var currentFrame         = 0;
var loopAnimation        = false;
var currentFrameDuration = DEFAULT_FRAME_DURATION;
var playbackInterval;

var frameBuffer  = new Array(NUM_ROWS);
var frameList    = new Array();
var previewID    = 0;
var previewsList = new Array();
var baseFrame;

let serialSendBuffer = new Uint32Array(3);

var hoverCell;
var lastHoverCell;


/* UI */

var frameDurationInput;
var displayHelp = false;


function setup() 
{
  const width  = CELL_SPACING + NUM_COLUMNS * (CELL_SIZE + CELL_SPACING);
  const height = CELL_SPACING + NUM_ROWS    * (CELL_SIZE + CELL_SPACING);
  createCanvas(width, height);
  
  newFramePreview(true);  

  createFrameBuffer(NUM_COLUMNS, NUM_ROWS);
  commitFrameBuffer(0);
  
  changeState(appState.DRAWING);

  const livePreviewSupported = Boolean(navigator.serial);
  if (!livePreviewSupported) {
    const livePreviewBtn = document.getElementById('live-preview-btn')
    livePreviewBtn.setAttribute('disabled', true);
  }
}


function draw() 
{
  if (hoverCell != lastHoverCell) 
  {
	if (lastHoverCell != null) { lastHoverCell.setSelected(false); }
	lastHoverCell = hoverCell;
	if (hoverCell != null) { hoverCell.setSelected(true); }
  }
	
  background('#C9D2D2');
  renderFrameBuffer();
  //renderFrameInfo();
  mouseAction();  
}


async function signalSuccess()
{
  // flash background green for a moment
  const ew = document.getElementById('editor-container');
  ew.classList.add('success');
  await new Promise(resolve => setTimeout(resolve, 250));
  ew.classList.remove('success');
}


function createFrameBuffer(_cols, _rows) 
{
  var index = 0;  
  for (r = 0; r < _rows; r++) 
  {
    frameBuffer[r] = new Array(_cols);
    for (c = 0; c < _cols; c++) 
	{
      frameBuffer[r][c] = new Cell(index, c, r);
	  index++;
    }
  }
}


function renderFrameBuffer() 
{
  const numRows = frameBuffer.length;
  const numCols = frameBuffer[0].length;
  for (r = 0; r < numRows; r++) 
  {
    for (c = 0; c < numCols; c++) 
	{
      let cell = frameBuffer[r][c];
      cell.render();
    }
  }
}


function renderFrameInfo() 
{
  push();
  textSize(28);
  frameString = "frame:" + (currentFrame + 1) + "/" + (frameList.length);
  fill(0x55, 0x55, 0x55);
  textAlign(RIGHT, BASELINE);
  textSize(24);
  text(frameString, width - cellOffset, height - cellOffset * 2);
  pop();
}


function mouseAction() 
{
  if (!(mouseX < width && mouseY < height))
  {
	hoverCell = null;
	return;
  }

  const numRows = frameBuffer.length;
  const numCols = frameBuffer[0].length;
  for (r = 0; r < numRows; r++) 
  {
    for (c = 0; c < numCols; c++) 
	{
      let cell = frameBuffer[r][c];
      cV = cell.position;
      mV = createVector(mouseX, mouseY);
      distance = mV.dist(cV);
      if (distance < (CELL_SIZE / 2))
	  {
        hoverCell = cell;
        if (actionEnabled) 
		{
          if (currentState == appState.DRAWING) { 
		    cell.setState(true);
            commitFrameBuffer(currentFrame);
          }
          else if (currentState == appState.ERASING) {
            cell.setState(false);
            commitFrameBuffer(currentFrame);
          }
        }
      }
    }
  }
}


function mouseMoved() 
{
  const numRows = frameBuffer.length;
  const numCols = frameBuffer[0].length;
  for (r = 0; r < numRows; r++) 
  {
    for (c = 0; c < numCols; c++) 
	{
      let cell = frameBuffer[r][c];
      cV = cell.position;
      mV = createVector(mouseX, mouseY);
      distance = mV.dist(cV);
      if (distance < (CELL_SIZE / 2))
	  {
		hoverCell = cell;
		if ((currentState == appState.DRAWING) || (currentState == appState.ERASING)) {
		  changeState(cell.state ? appState.ERASING : appState.DRAWING);
		}
	  }
	}
  }
}


function renderThumbnail(_frameNumber) 
{
  if (frameList.length == 0) return;
  const framePreviewID = previewsList[_frameNumber];
  canvas = document.getElementById(`canvas-${framePreviewID}`);
  c2d = canvas.getContext('2d');
  c2d.smoothingEnabled = false;
  c2d.clearRect(0, 0, c2d.canvas.width, c2d.canvas.height);
  let frame = frameList[_frameNumber];
  const numRows = frame.matrix.length;
  const numCols = frame.matrix[0].length;
  for (r = 0; r < numRows; r++) 
  {
    for (c = 0; c < numCols; c++) 
	{
      c2d.beginPath();
      c2d.rect(c * 8, r * 8 , 8, 8);
      c2d.fillStyle = (frame.matrix[r][c] === 1) ? CELL_ON_COLOR : CELL_OFF_COLOR;
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


function deleteFrame() 
{
  if (frameList.length <= 1) {
    clearFrame();
    return;
  }
  frameList.splice(currentFrame, 1);
  currentFrame = currentFrame < frameList.length ? currentFrame : frameList.length - 1;
  
  deleteThumbnail(currentFrame);
  goToFrame(currentFrame);
}


function deleteAllFrames() 
{
  frameList.length = 0;

  const targetFrameID = previewsList.forEach((id) => { document.getElementById(id).parentElement.remove(); });
  previewsList.length = 0;

  disableButtons();
}


function deleteThumbnail(_frameNumber)
{
  const targetFrameID = previewsList[_frameNumber];
  document.getElementById(targetFrameID).parentElement.remove();
  disableButtons();
  previewsList.splice(_frameNumber, 1);
}


function clearFrame()
{
  const numRows = frameBuffer.length;
  const numCols = frameBuffer[0].length;
  for (r = 0; r < numRows; r++) 
  {
    for (c = 0; c < numCols; c++) 
	{
	  frameBuffer[r][c].setState(false);
    }
  }
  commitFrameBuffer(currentFrame);
}


function newFrame(_frameToClone = null)
{
  let newFrame = _frameToClone;
  if (newFrame == null) 
  {
    newFrame = { 
	  duration: DEFAULT_FRAME_DURATION, 
	  matrix:   Array.from(Array(NUM_ROWS), () => new Array(NUM_COLUMNS).fill(0)), 
	  selected: false 
	}
  }
  const lastFrame = frameList.length - 1;
  commitFrameBuffer(lastFrame);
  frameList.splice(lastFrame + 1, 0, newFrame);
  fillFrameBuffer(newFrame);
  currentFrame = lastFrame + 1;

  newFramePreview();

  goToFrame(currentFrame);
  toggleFrameSelection(currentFrame, false);
  disableButtons();
}


function toggleFrameSelection(_frameNumber = currentFrame, _newState = null)
{
  var newState = (_newState != null) ? _newState : !frameList[_frameNumber].selected
  frameList[_frameNumber].selected = newState;
}


function createFramesPreviews()
{  
  framePreviewID = 0;
  for(frame in frameList) {
    newFramePreview();
    currentFrame++;
  }
  goToFrame(0);
  disableButtons();
}


function newFramePreview(firstFrame = false) 
{
  const framePreviewID        = `frame-preview-${previewID}`;
  const framePreviewContainer = document.createElement('div');
  framePreviewContainer.setAttribute('class', 'frame-preview-container');

  currentFrameDurationInput = document.createElement("INPUT");
  currentFrameDurationInput.setAttribute("type", "number")
  currentFrameDurationInput.setAttribute('class', 'frame-duration');
  currentFrameDurationInput.setAttribute('id', `frame-duration-${framePreviewID}`);
  let referenceDuration = DEFAULT_FRAME_DURATION;
  if(!firstFrame){
    referenceDuration = frameList[currentFrame].duration;
  }
  currentFrameDuration            = referenceDuration;
  currentFrameDurationInput.value = referenceDuration;
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
  const addButton       = document.getElementById('add-button');
  framesContainer.insertBefore(framePreviewContainer, addButton);
  previewsList.push(framePreviewID);
  renderThumbnail(currentFrame);
  frameDurationInput = currentFrameDurationInput;
  previewID++;
}


function commitFrameBuffer(_frameNumber) 
{
  var frame = {};
  frame.matrix   = new Array();
  frame.selected = false;
  if(frameList[_frameNumber] != null){
    frame.selected = frameList[_frameNumber].selected;
  }
  let binaryString   = "";
  let currentBit     = 0;
  let bufIdx         = 0;
  let frameUpdatable = false;
  const numRows = frameBuffer.length;
  const numCols = frameBuffer[0].length;
  for (r = 0; r < numRows; r++) 
  {
    frame.matrix[r] = new Array();
    for (c = 0; c < numCols; c++) 
	{
      let cell = frameBuffer[r][c];
      frame.matrix[r][c] = cell.state ? 1 : 0;
      binaryString += cell.state ? 1 : 0;
      if (((currentBit + 1) % 32) == 0) {
        const newValue = parseInt(binaryString, 2);
        if (serialSendBuffer[bufIdx] != newValue) {
          serialSendBuffer[bufIdx] = newValue;
          frameUpdatable = true;
        }
        binaryString = "";
        bufIdx++;
      }
      currentBit++;
    }
  }
  if (frameUpdatable) {
    if (serialPortReady) {
      writeSerialData();
    }
  }
  //frameDurationInput.value = currentFrameDuration;
  frame.duration = currentFrameDuration;
  frameList[_frameNumber] = frame;
  baseFrame = frame;
  renderThumbnail(_frameNumber);
}


function fillFrameBuffer(_frame) 
{
  const numRows = frameBuffer.length;
  const numCols = frameBuffer[0].length;
  for (r = 0; r < numRows; r++) 
  {
    for (c = 0; c < numCols; c++) 
	{
      frameBuffer[r][c].setState(_frame.matrix[r][c]);
    }
  }
}


function changeFrameDuration(_value, _frameNumber)
{
  frameList[_frameNumber].duration = _value;
}


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
  if (animationName === null) { return; }
  
  exportAnimationName = animationName;  
  var code = generateAnimationCode(animationName);
  if (exportToClipboard) { copyStringToClipboard(code); signalSuccess(); }
  else                   { saveStringToFile(code, animationName + ".h"); }
}


function generateFrameCode(frameName)
{
  var printOut = "const uint32_t " + frameName + "[] = {";
  let binaryString = "";
  var frame = frameList[currentFrame];
  const numRows = frame.matrix.length;
  const numCols = frame.matrix[0].length;
  for (r = 0; r < numRows; r++) 
  {
    for (c = 0; c < numCols; c++) 
	{
      binaryString += frame.matrix[r][c];
    }
  }
  let uint32String = "";
  let uint32Array  = new Array();
  for (let c = 0; c < binaryString.length; c++) 
  {
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
  for (let f = 0; f < frameList.length; f++) 
  {
    printOut += "\t{";
    let frame = frameList[f];
    if (frame.duration == undefined) frame.duration = DEFAULT_FRAME_DURATION;
    let binaryString = "";
    const numRows = frame.matrix.length;
    const numCols = frame.matrix[0].length;
    for (r = 0; r < numRows; r++) 
    {
      for (c = 0; c < numCols; c++) 
	  {
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
          if (f != frameList.length - 1) {
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
      frameList = JSON.parse(fileContent);
      createFramesPreviews();
      goToFrame(0);
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
  const blob = new Blob([JSON.stringify(frameList)], { type: "text/plain" });
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
  
  const numRows = frameBuffer.length;
  const numCols = frameBuffer[0].length;
  for (r = 0; r < numRows; r++) 
  {
    for (c = 0; c < numCols; c++) 
	{
	  let cell = frameBuffer[r][c];
	  cell.setState(tempFrame[r][c]);
    }
  }
  commitFrameBuffer(currentFrame);
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


function playNextFrame() 
{
  playbackInterval = setTimeout(() => {
    if (currentFrame < frameList.length - 1) {
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
  if (currentFrame >= frameList.length) { currentFrame = frameList.length - 1; }
  if (currentFrame < 0                ) { currentFrame = 0; }
  
  fillFrameBuffer(frameList[currentFrame]);
  currentFrameDuration = frameList[currentFrame].duration;
  commitFrameBuffer(currentFrame);
  
  // render all thumbnails unselected
  document.getElementsByClassName('frame-preview-container selected').forEach((p) => p.setAttribute('class', 'frame-preview-container'));
  // "select" the new one
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
  if (frameList.length === 1) {
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

