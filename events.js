
/*
  These event listeners are here for different purposes.
  Some are unused or redundant, but will be implemented.
*/

// Disable default copy and cut actions
document.addEventListener("copy", async function (e) {
  e.preventDefault();
  await navigator.clipboard.writeText(JSON.stringify(frames));
});

document.addEventListener("cut", function (e) {
  e.preventDefault();
});

document.addEventListener('keydown', function (event) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
    console.log("undo");
  }
});

document.addEventListener('paste', function (event) {
  console.log("!!! paste");
  console.log(navigator.clipboard.readText());
  console.log(">>> ", keyIsDown(SHIFT));
  navigator.clipboard.readText().then(data => {
    for (const item of data) {
      console.log("****", item);
      if (item.types.includes('text/plain')) {
        item.getType('text/plain').then(blob => {
          const reader = new FileReader();
          reader.onload = () => {
            console.log(reader.result);
            frames = JSON.parse(reader.result);
            goToFrame(0)
          };
          reader.readAsText(blob);
        });
      }
      if (item.types.includes('image/png')) {
        item.getType('image/png').then(blob => {
          const reader = new FileReader();
          reader.onload = () => {
            const img = document.createElement('img');
            img.src = reader.result;

            img.addEventListener('load', async () => {
              const canvas = document.createElement('canvas');
              let context = canvas.getContext('2d');
              canvas.width = 12;
              canvas.height = 8;
              context.drawImage(img, 0, 0, canvas.width, canvas.height);
              const pixelFrame = { duration: DEFAULT_FRAME_DURATION, matrix: Array.from(Array(rows), () => new Array(columns).fill(0)) };
              console.log("frame before", pixelFrame.matrix);

              const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
              const imagePixels = imageData.data;

              for (let r = 0; r < rows; r++) {
                for (let c = 0; c < columns; c++) {
                  const pixelOffset = (r * columns + c) * 4;
                  const pxl = imagePixels[pixelOffset + 3];
                  pixelFrame.matrix[r][c] = (pxl > 128) ? 1 : 0;
                }
              }
              if (keyIsDown(SHIFT)) {
                newFrame(pixelFrame);
              } else {
                fillFrameBuffer(pixelFrame);
                commitFrame(currentFrame);
              }
              // 
            });
          };
          reader.readAsDataURL(blob);
        });
      }
    }
  });
});

/*
  TEMPORARILY UNUSED
  DO NOT EDIT/TOUCH
*/
document.addEventListener('drop', (e) => {
  e.stopPropagation();
  e.preventDefault();

  console.log(e.dataTransfer.files);
  navigator.clipboard.readText().then(data => {
    for (const item of data) {
      console.log("****", item);
      if (item.types.includes('image/png')) {
        item.getType('image/png').then(blob => {
          const reader = new FileReader();
          reader.onload = () => {
            // const img = document.createElement('img');
            img.src = reader.result;

            img.addEventListener('load', async () => {
              // document.body.appendChild(img);
              const canvas = document.createElement('canvas');
              let context = canvas.getContext('2d');
              canvas.width = 12;
              canvas.height = 8;
              // document.body.appendChild(canvas);
              context.drawImage(img, 0, 0, canvas.width, canvas.height);
              const pixelFrame = { duration: DEFAULT_FRAME_DURATION, matrix: Array.from(Array(rows), () => new Array(columns).fill(0)) }
              console.log("frame before", pixelFrame);

              const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
              const imagePixels = imageData.data;

              for (let r = 0; r < rows; r++) {
                for (let c = 0; c < columns; c++) {
                  const pixelOffset = (r * columns + c) * 4;
                  const pxl = imagePixels[pixelOffset + 3];
                  pixelFrame.matrix[r][c] = (pxl > 128) ? 1 : 0;
                }
              }
              if (keyIsDown(SHIFT)) {
                newFrame(pixelFrame);
              } else {
                fillFrameBuffer(pixelFrame);
                commitFrame();
              }
              document.removeChild
              // 
            });

          };
          reader.readAsDataURL(blob);
        });
      }
    }
  });
});


function keyPressed(event) 
{
  switch (event.keyCode) {
    case 72: // ALT + H => SHOW HELP
      if(keyIsDown(ALT)) showHelp()
      break;

    // TOPBAR ACTIONS
    case 32: // SPACE => PLAY
      playBack(currentFrame);
      break;
	  
    case 85: // Ctrl + U => LOAD PROJECT
      if (keyIsDown(CONTROL)) loadProject();
      break;
	  
    case 83: // S => Copy frame code to clipboard, Ctrl + S => SAVE PROJECT
      if (keyIsDown(CONTROL)) saveProject();
	  else                    exportSingleFrameCodeToClipboard();
      break;
	  
    case 69: // E => EXPORT / ERASE
      if (keyIsDown(CONTROL)) {
        exportUint32();
      } else {
        changeState(appState.ERASING);
      }
      break;

    // ARROWS
    case 37: // LEFT KEY
      if (keyIsDown(SHIFT)) {
        shiftMatrix(directions.LEFT, 1);
      } else {
        goToFrame(currentFrame - 1);
      }
      break;
	  
    case 38: // UP KEY
      if (keyIsDown(SHIFT)) {
        shiftMatrix(directions.UP, 1);
      }
      break;
	  
    case 39: // RIGHT KEY
      if (keyIsDown(SHIFT)) {
        shiftMatrix(directions.RIGHT, 1);
      } else {
        goToFrame(currentFrame + 1);
      }
      break;
	  
    case 40: // DOWN KEY
      if (keyIsDown(SHIFT)) {
        shiftMatrix(directions.DOWN, 1);
      }
      break;
    
    // CANVAS ACTIONS
    case 8: // DELETE  => CLEAR FRAME(+ALT) / DELETE FRAME(+ CTRL) / DELETE ALL (+CTRL+SHIFT)
      if (keyIsDown(ALT)) {
        clearFrame();
      }
      if (keyIsDown(CONTROL)) {
        deleteFrame();
      }
      if (keyIsDown(CONTROL) && keyIsDown(SHIFT)){
        deleteAllFrames()
      }
      break;
	  
    case 66: // B => BRUSH
      changeState(appState.DRAWING);
      break;

    // FOOTER ACTIONS
    case 78: // Ctrl + N => NEW FRAME
      if (keyIsDown(CONTROL)) {
        newFrame();
      }
      break;
	  
    case 68: // Ctrl + D => DUPLICATE FRAME
	  if (keyIsDown(CONTROL)) {
        newFrame(baseFrame);
      }
      break;    
    
	default:
      break;
    
    // case 66: // b
    //   if (keyIsDown(SHIFT)){
    //     exportSingleFrame();
    //   }
    //   break;
    //   case 70: // f
    //   if (keyIsDown(SHIFT)) {
    //     printFrames();
    //   } else {
    //     printFrameBuffer();
    //   }
    //   break;
    // case 75: // k
    //   console.clear();
    //   break;
    // case 80: // p
    // openPort();
    // break;
  
    // case 87: // w
    //   printSelectedCells();
    //   break;
    }
}

/*
  The following functions are callbacks from P5js.
  Some of them can be replaced by Vanilla JS, 
  but since we'll use it for vector operations,
  it does not make much sense to do so.
*/

function mousePressed() {
  actionEnabled = true;
}

function mouseReleased() {
  actionEnabled = false;
  lastHoverCell = null;
}