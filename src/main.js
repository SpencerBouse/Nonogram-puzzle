import { inRange,isEqual } from "./helpers.js";

// disable drag event so that it can be used for puzzle
document.addEventListener('dragstart', event => event.preventDefault());

let autoCorrectStatus = false
let darkMode = false

class Cell{
  status = null;
  highlighted = false;
  incorrect = false;
  constructor(id,status,incorrect){
    this.id = id,
    this.status = status,
    this.incorrect = incorrect,
    this.row = Math.floor(id/puzzleX),
    this.column = id % puzzleX
  }

  // call update class whenever status is changed
  updateClass() {
    const cell = document.getElementById(`cell${this.id}`)
    cell.classList.remove('filled','marked','highlighted', 'incorrect')
    cell.classList.add(this.status, this.incorrect ? 'incorrect': null)

    cell.innerHTML = (this.status==='marked'||this.incorrect) ? '&#215;' : ''
  }
}

let puzzleX = 5
let puzzleY = 5
let puzzle = []

let puzzleBoard = []

function setup(){
  // setup buttons
  document.getElementById('changeTheme').addEventListener('click', changeTheme)
  document.getElementById('autoCorrect').addEventListener('click', autoCorrect)
  document.getElementById('reset').addEventListener('click', reset)
  document.getElementById('newGame').addEventListener('click', newGame)


  //  get grid dimensions from button value
  const gridSizeRegex = /[0-9]+/g
  const gridSize = document.getElementById('gridSizeSelect').value.match(gridSizeRegex)
  puzzleX = gridSize[0]
  puzzleY = gridSize[1]

  // generate random puzzle based on puzzleX and puzzleY
  puzzle = localStorage.getItem('puzzle') ? JSON.parse(localStorage.getItem('puzzle')) : Array.from({length:puzzleX*puzzleY}, ()=> Math.floor(Math.random()*2))
  localStorage.setItem('puzzle', JSON.stringify(puzzle))

  // create board array and puzzle dom element based on puzzle array
  createBoardFromPuzzle(puzzle)
  // get hints based on puzzle array
  getHintsByPuzzle(puzzle)

  // update dark mode and autocorrect from local storage
  if(localStorage.getItem('darkMode')){
    darkMode = localStorage.getItem('darkMode')==='true' ? false : true 
    changeTheme()
  }
  if(localStorage.getItem('autoCorrectStatus')){
    autoCorrectStatus = localStorage.getItem('autoCorrectStatus')==='true' ? false : true 
    autoCorrect()
  }

  // once everything is built start timer(using reset to stop any existing timers)
  resetTimer()
}

//TIMER
let timeInterval;
let sec=0;
let min=0;
let hr=0;

function timer(){
  sec++
  if(sec>60){
    min++
    sec=0
  }
  if(min>60){
    hr++
    min=0
  }

  let hour = hr<10 ?`0${hr}` : hr
  let minute = min<10 ? `0${min}` : min
  let second = sec<10 ? `0${sec}` : sec

  let timerElement = document.getElementById('timer')
  timerElement.innerHTML = `${hour}:${minute}:${second}`
}
function startTimer() {
  timeInterval = setInterval(timer,1000)
}
function stopTimer(){
  clearInterval(timeInterval)
}
function resetTimer() {
  stopTimer()
  sec=0
  min=0
  hr=0
  document.getElementById('timer').innerHTML = '00:00:00'
  startTimer()
}

function createBoardFromPuzzle(puzzle){
  const rootElement = document.documentElement

  rootElement.style.setProperty('--grid-col-count', puzzleX)
  rootElement.style.setProperty('--rule-group-width', `${100/puzzleX}%`)
  rootElement.style.setProperty('--rule-group-height', `${100/puzzleY}%`)

  const puzzleDiv = document.getElementById('puzzle')

  puzzleDiv.classList.add('cursor-pointer')
  // disable right click menu in puzzle div
  puzzleDiv.addEventListener('contextmenu', event => event.preventDefault());

  puzzleBoard = puzzle.map((_,index)=>{
    let cell;
    if(localStorage.getItem('puzzleBoard')){
      let storedCell = JSON.parse(localStorage.getItem('puzzleBoard'))[index]
      cell = new Cell(index,storedCell.status,storedCell.incorrect)
    }else{
      cell = new Cell(index)
    }
    const cellElement = document.createElement('div')

    cellElement.data = index

    cellElement.setAttribute('id', `cell${index}`)
    cellElement.addEventListener('mouseup', mouseUp)
    cellElement.addEventListener('mouseenter', mouseOver)
    cellElement.addEventListener('mousedown', mouseDown)

    puzzleDiv.append(cellElement)

    cellElement.classList.add('cell','rounded','before:rounded','text-orange-400','select-none','border-slate-600','border-2','hover:z-10','before:hover:outline','before:hover:outline-4','before:hover:outline-blue-500','text-center','bg-white')

    switch(puzzleX){
      case '5':
        cellElement.classList.add('text-width-5')
        break
      case '10':
        cellElement.classList.add('text-width-10')
        break
      case '15':
        cellElement.classList.add('text-width-15')
        break
    }

    if(cell.row !== 0 && cell.row !== (puzzleY-1)){
      switch((cell.row+1)%5){
        case 0:
          cellElement.classList.add('border-b-blue-400','rounded-b-none')
          break
        case 1:
          cellElement.classList.add('border-t-blue-400','rounded-t-none')
          break
      }
    }
    if(cell.column !== 0 && cell.column !== (puzzleX-1)){
      switch((cell.column+1)%5){
        case 0:
          cellElement.classList.add('border-r-blue-400','rounded-r-none')
          break
        case 1:
          cellElement.classList.add('border-l-blue-400','rounded-l-none')
          break
      }
    }
    cell.updateClass()
    return cell
  })

  localStorage.setItem('puzzleBoard', JSON.stringify(puzzleBoard))

}
function getHintsByPuzzle(puzzle){
  /*
  hints = [
    [[5],[1,1,1],[5],[1,1],[1,1]],
    [[3,1],[1,2],[3],[1,2],[3,1]]
  ]
  */
  // rotate and reverse array to get top to bottom rules
  const rotatedArray = puzzle.map((_,i)=> puzzle[((i%puzzleX)*puzzleX)+Math.floor(i/puzzleX)] )
  const hints = [getHintsByArray(rotatedArray),getHintsByArray(puzzle)]
  const topHints = document.getElementById('topHints')
  const sideHints = document.getElementById('sideHints')

  hints.forEach((hintGroup,index)=>{
    if(hintGroup.length){
      hintGroup.forEach(ruleGrp=>{
        const ruleGroup = document.createElement('div')

        const classes = ['ruleGroup','items-center','flex','justify-end','even:bg-slate-200','even:dark:bg-slate-700']
        index ? classes.push('pr-4','sideHints') : classes.push('pb-4','flex-col','topHints')
        classes.push(puzzleX==='15'? 'text-xl':'text-2xl')
        ruleGroup.classList.add(...classes)

        if(ruleGrp.length){
          ruleGrp.forEach(rule=>{
            const ruleText = document.createElement('p')
            ruleText.classList.add('rule','m-0','decoration-2','cursor-pointer')
            ruleText.addEventListener('click', (e)=> { e.target.classList.toggle('line-through')}) 
            if(index) ruleText.classList.add('pl-5')
            ruleText.textContent = rule
            ruleGroup.append(ruleText)
          })
        }
        index ? sideHints.append(ruleGroup) : topHints.append(ruleGroup)
      })
    }
  })
}
function getHintsByArray(arr){
  let count = 0
  let ruleGroup = []
  const rules = []

  arr.forEach((cell,index)=>{
    if(cell){
      count++
    }else{
      if(count){
        ruleGroup.push(count)
        count = 0
      }
    }

    if((index+1)%puzzleX === 0){
      if(count){
        ruleGroup.push(count)
        count = 0
      }
      rules.push(ruleGroup.length ? ruleGroup : [0] )
      ruleGroup = []
    }
  })

  return rules
}

// MOUSE EVENTS
let startingCell;
let startStatus;
let endingCell;

let mouseStatus = 'up'

function mouseDown(event){
  const btnPress = event.which
  
  startingCell = puzzleBoard[event.target.data]
  startStatus = startingCell.status
  
  if(btnPress===1 || btnPress===3){
    mouseStatus = 'down'
  }
}

function mouseOver(event){
  let cellElement = document.elementFromPoint(event.clientX, event.clientY)
  endingCell = puzzleBoard[cellElement.data]

  if(mouseStatus === 'down'){
    // get cell closest to endingCell (mouse postion), bias towards last direction travel
    let cellIndex;
    if(Math.abs(endingCell.row - startingCell.row) < Math.abs(endingCell.column - startingCell.column)){
      cellIndex = (startingCell.row * puzzleX)+endingCell.column
    }else{
      cellIndex = (endingCell.row * puzzleX)+startingCell.column
    }

    endingCell = puzzleBoard[cellIndex]
    puzzleBoard.forEach(cell=>{
      const cellElement = document.getElementById(`cell${cell.id}`)

      if(startingCell.row === endingCell.row ? inRange(cell.column, startingCell.column, endingCell.column) && isEqual(cell.row, startingCell.row, endingCell.row):inRange(cell.row, startingCell.row, endingCell.row) && isEqual(cell.column, startingCell.column, endingCell.column)){
        cellElement.classList.add('highlighted')
        cell.highlighted = true
      }else{
        cellElement.classList.remove('highlighted')
        if(cell.highlighted) cell.highlighted = null
      }

    })
    document.getElementById(`cell${cellIndex}`).classList.add('highlighted')
  }
}

function mouseUp(event){
  const endingCell = puzzleBoard[event.target.data]
  const btnPress = event.which
  const setStatus = btnPress === 1 ? 'filled': btnPress === 3 ? 'marked' : ''

  // if only one cell is clicked
  if(startingCell === endingCell) {
    endingCell.status = endingCell.status === setStatus ? null : setStatus
    if(!endingCell.incorrect){
      endingCell.updateClass()
    }
  }

  mouseStatus = 'up'

  puzzleBoard.forEach(cell=>{
    if(cell.highlighted){
      if(!cell.incorrect){
        if(btnPress===1){
          cell.status = startStatus === 'filled'? null:'filled'
        }else if(btnPress===3){
          cell.status = startStatus === 'marked'? null:'marked'
        }
        cell.updateClass()
      }
      cell.highlighted = false
    }
    
    
    if(autoCorrectStatus){
      checkAutoCorrect()
    }
  })

  localStorage.setItem('puzzleBoard', JSON.stringify(puzzleBoard))

  checkIfSolved()
}

function checkIfSolved(){
  if(JSON.stringify(puzzle) === JSON.stringify(puzzleBoard.map(cell=> cell.status==='filled'?1:0))){
    //if solved, enter win state
    document.getElementById('winContainer').classList.remove('hidden')
    
    stopTimer()
    document.getElementById('timer').classList.add('text-blue-400')
    document.getElementById('puzzle').classList.remove('cursor-pointer')
    //clear storage
    localStorage.removeItem('puzzle')
    localStorage.removeItem('puzzleBoard')
    puzzleBoard.forEach(cell=>{
      const cellElement = document.getElementById(`cell${cell.id}`)
      cellElement.removeEventListener('mousedown', mouseDown)
      cellElement.removeEventListener('mouseup', mouseUp)
      cellElement.classList.remove('before:hover:outline','before:hover:outline-4','before:hover:outline-blue-500','hover:z-10')
    })
  }
}

function newGame(){
  // reset puzzle
  puzzle = []
  puzzleBoard = []

  // clear dom
  document.getElementById('topHints').innerHTML = ''
  document.getElementById('sideHints').innerHTML = ''
  document.getElementById('puzzle').innerHTML = ''
  document.getElementById('winContainer').classList.add('hidden')
  document.getElementById('timer').classList.remove('text-blue-400')

  //clear storage
  localStorage.removeItem('puzzle')
  localStorage.removeItem('puzzleBoard')

  setup()
}
function changeTheme(){
  const docElement = document.documentElement
  darkMode = darkMode ? false : true 
  darkMode ? docElement.classList.add('dark') : docElement.classList.remove('dark')
  localStorage.setItem('darkMode', docElement.classList.contains('dark') ? true : false)
}
function autoCorrect(){
  const autoCorrectElement = document.getElementById('autoCorrectSvg')
  autoCorrectStatus = autoCorrectStatus ? false : true
  autoCorrectStatus ? autoCorrectElement.classList.add('stroke-blue-400') : autoCorrectElement.classList.remove('stroke-blue-400')
  localStorage.setItem('autoCorrectStatus', autoCorrectStatus)
  checkAutoCorrect()
}
function checkAutoCorrect(){
  puzzleBoard.forEach(cell=>{
    if(cell.status){
      if(!cell.incorrect){
        if((cell.status==='filled' && !puzzle[cell.id])||(cell.status==='marked' && puzzle[cell.id])){
          // Mark incorrect
          cell.incorrect = true
          if(cell.status === 'filled'){
            cell.status = 'marked'
          }else if(cell.status === 'marked'){
            cell.status = 'filled'
          }
          cell.updateClass()
        }
      }else if(cell.incorrect && !autoCorrectStatus){
        cell.incorrect = false
        cell.updateClass()
      }
    }
  })

  checkIfSolved()
}
function reset(){
  puzzleBoard.forEach(cell=>{
    const cellElement = document.getElementById(`cell${cell.id}`)

    cell.status = null
    cell.highlighted = false
    cell.incorrect = false
    cell.updateClass()

    cellElement.addEventListener('mousedown', mouseDown)
    cellElement.addEventListener('mouseup', mouseUp)
    cellElement.classList.add('hover:bg-blue-300')
  })

  resetTimer()

  document.getElementById('winContainer').classList.add('hidden')
  document.getElementById('timer').classList.remove('text-blue-400')
}

window.addEventListener('load', setup)