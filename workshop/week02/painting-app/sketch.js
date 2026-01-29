let brushColor = '#000000'; // 默认黑色
let brushSize = 5;          // 默认粗细
let isEraser = false;       // 橡皮擦状态
let colorPicker;
let sizeSlider;

function setup() {
  createCanvas(windowWidth, windowHeight - 60);
  background(255);

  // 创建控制面板容器
  let controls = createDiv();
  controls.style('padding', '10px');
  controls.style('background', '#f0f0f0');
  controls.style('display', 'flex');
  controls.style('gap', '20px');
  controls.style('align-items', 'center');

  // 1. 颜色选择器
  createSpan('Color: ').parent(controls);
  colorPicker = createColorPicker(brushColor);
  colorPicker.parent(controls);
  colorPicker.input(() => {
    brushColor = colorPicker.value();
    isEraser = false;
  });

  // 2. 粗细滑块
  createSpan('Width: ').parent(controls);
  sizeSlider = createSlider(1, 50, brushSize);
  sizeSlider.parent(controls);
  sizeSlider.input(() => {
    brushSize = sizeSlider.value();
  });

  // 3. 橡皮擦按钮
  let eraserBtn = createButton('Eraser');
  eraserBtn.parent(controls);
  eraserBtn.mousePressed(() => {
    isEraser = true;
  });

  // 4. 画笔按钮 (切回画笔)
  let brushBtn = createButton('Brush');
  brushBtn.parent(controls);
  brushBtn.mousePressed(() => {
    isEraser = false;
    brushColor = colorPicker.value();
  });

  // 5. 清屏按钮
  let clearBtn = createButton('Clear');
  clearBtn.parent(controls);
  clearBtn.mousePressed(() => {
    background(255);
  });
  
  // --- 新增：保存按钮 ---
  let saveBtn = createButton('Save');
  saveBtn.parent(controls);
  saveBtn.style('background-color', '#4CAF50'); 
  saveBtn.style('color', 'white');
  saveBtn.style('border', 'none');
  saveBtn.style('padding', '5px 10px');
  saveBtn.style('cursor', 'pointer');
  
  saveBtn.mousePressed(saveMyCanvas);
}

function saveMyCanvas() {
  // 获取当前时间作为文件名，防止覆盖
  let timeStamp = year() + "-" + month() + "-" + day() + "_" + hour() + minute() + second();
  saveCanvas(canvas, timeStamp, 'png');
}

function draw() {
  if (mouseIsPressed) {
    // 设置绘画样式
    if (isEraser) {
      stroke(255); // 橡皮擦即为白色
    } else {
      stroke(brushColor);
    }
    
    strokeWeight(brushSize);
    strokeCap(ROUND); // 使线条末端圆润
    
    // 连接上一帧和当前帧的坐标，防止移动过快产生断点
    line(pmouseX, pmouseY, mouseX, mouseY);
  }
}

// 窗口大小改变时自动调整
function windowResized() {
  resizeCanvas(windowWidth, windowHeight - 60);
}