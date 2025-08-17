// Guess the Dog Breed: 6 clickable options, using all breeds/sub-breeds from Dog CEO API

let allBreeds = {};
let allBreedOptions = [];
let currentBreed = null;
let score = 0;
let highScore = 0;
let lifelines = {
  fifty: true,
  reroll: 5,
  doubledip: true,
};
let doubleDipActive = false;
let doubleDipUsed = false;
let currentOptions = [];
let currentQuestionNumber = 0;

async function fetchAllBreeds() {
  const resp = await fetch('https://dog.ceo/api/breeds/list/all');
  const data = await resp.json();
  return data.message;
}

function getAllBreedOptions() {
  // Returns array of {breed, sub, label}
  const options = [];
  for (const breed in allBreeds) {
    const subs = allBreeds[breed];
    if (subs.length === 0) {
      options.push({ breed, sub: null, label: breed.replace(/-/g, ' ') });
    } else {
      for (const sub of subs) {
        options.push({ breed, sub, label: `${sub} ${breed}`.replace(/-/g, ' ') });
      }
    }
  }
  return options;
}

function getRandomBreedAndSub() {
  return allBreedOptions[Math.floor(Math.random() * allBreedOptions.length)];
}

async function fetchBreedImage(breed, sub) {
  let url = sub
    ? `https://dog.ceo/api/breed/${breed}/${sub}/images/random`
    : `https://dog.ceo/api/breed/${breed}/images/random`;
  const resp = await fetch(url);
  const data = await resp.json();
  return data.message;
}

function getAcceptedLabels(breed, sub) {
  if (!sub) return [breed.replace(/-/g, ' ')];
  return [
    `${sub} ${breed}`.replace(/-/g, ' '),
    `${sub}-${breed}`.replace(/-/g, ' '),
    `${sub}_${breed}`.replace(/-/g, ' '),
    `${breed} ${sub}`.replace(/-/g, ' '),
    `${sub}`.replace(/-/g, ' '),
    `${breed}`.replace(/-/g, ' ')
  ];
}

function getRandomOptions(correctOption, n = 6) {
  const options = [correctOption];
  while (options.length < n) {
    const candidate = allBreedOptions[Math.floor(Math.random() * allBreedOptions.length)];
    if (!options.some(o => o.label === candidate.label)) {
      options.push(candidate);
    }
  }
  return shuffle(options);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function renderLifelines() {
  const lifelineDiv = document.getElementById('lifelines');
  lifelineDiv.innerHTML = '';
  // Double Dip Power-up text
  let ddText = document.getElementById('double-dip-active');
  if (doubleDipActive) {
    if (!ddText) {
      ddText = document.createElement('div');
      ddText.id = 'double-dip-active';
      ddText.className = 'double-dip-active';
      ddText.textContent = 'DOUBLE-DIP POWER-UP ACTIVE';
      lifelineDiv.parentNode.insertBefore(ddText, lifelineDiv);
    } else {
      ddText.style.display = '';
    }
  } else if (ddText) {
    ddText.style.display = 'none';
  }
  // 50/50
  const fiftyBtn = document.createElement('button');
  fiftyBtn.className = 'lifeline-btn';
  fiftyBtn.innerHTML = '50/50';
  fiftyBtn.disabled = !lifelines.fifty;
  fiftyBtn.onclick = useFiftyFifty;
  lifelineDiv.appendChild(fiftyBtn);
  // Reroll
  const rerollBtn = document.createElement('button');
  rerollBtn.className = 'lifeline-btn lifeline-reroll';
  rerollBtn.innerHTML = 'REROLL!';
  rerollBtn.disabled = lifelines.reroll === 0;
  rerollBtn.onclick = useReroll;
  if (lifelines.reroll > 0) {
    const badge = document.createElement('span');
    badge.className = 'lifeline-badge';
    badge.textContent = lifelines.reroll;
    rerollBtn.appendChild(badge);
  }
  lifelineDiv.appendChild(rerollBtn);
  // Double Dip
  const ddBtn = document.createElement('button');
  ddBtn.className = 'lifeline-btn';
  ddBtn.innerHTML = 'DOUBLE-DIP!';
  ddBtn.disabled = !lifelines.doubledip || doubleDipActive;
  ddBtn.onclick = useDoubleDip;
  lifelineDiv.appendChild(ddBtn);
}

function useFiftyFifty() {
  if (!lifelines.fifty) return;
  lifelines.fifty = false;
  // Mark 3 incorrect options as selected/disabled
  const correct = currentOptions.find(opt => getAcceptedLabels(currentBreed.breed, currentBreed.sub).map(x => x.toLowerCase()).includes(opt.label.toLowerCase()));
  const incorrect = currentOptions.filter(opt => opt !== correct);
  shuffle(incorrect);
  const toMark = incorrect.slice(0, 3);
  const optionsDiv = document.getElementById('options');
  Array.from(optionsDiv.children).forEach((btn, idx) => {
    const opt = currentOptions[idx];
    if (toMark.includes(opt)) {
      btn.disabled = true;
      btn.classList.add('selected');
    }
  });
  renderLifelines();
}

function useReroll() {
  if (lifelines.reroll === 0) return;
  lifelines.reroll--;
  rerollImage();
  renderLifelines();
}

async function rerollImage() {
  const imgEl = document.getElementById('breed-img');
  const loader = document.getElementById('loader');
  loader.style.display = 'block';
  imgEl.style.opacity = 0;
  const imgUrl = await fetchBreedImage(currentBreed.breed, currentBreed.sub);
  imgEl.src = imgUrl;
  imgEl.onload = () => {
    loader.style.display = 'none';
    imgEl.style.opacity = 1;
  };
}

function useDoubleDip() {
  if (!lifelines.doubledip || doubleDipActive) return;
  doubleDipActive = true;
  lifelines.doubledip = false;
  doubleDipUsed = false;
  renderLifelines();
}

function renderOptions() {
  const optionsDiv = document.getElementById('options');
  optionsDiv.innerHTML = '';
  currentOptions.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt.label;
    btn.onclick = () => checkUserAnswer(opt, btn);
    optionsDiv.appendChild(btn);
  });
  optionsDiv.style.opacity = 1;
}

// Highlight the current question step in the Millionaire-style sidebar
function updateScoreSidebar(currentStep) {
    const steps = document.querySelectorAll('.score-step');
    steps.forEach(step => {
        step.classList.remove('active', 'achieved');
        const stepNum = parseInt(step.dataset.step);
        if (stepNum === currentStep) {
            step.classList.add('active');
        } else if (stepNum <= currentStep) {
            step.classList.add('achieved');
        }
    });
}

async function nextRound() {
  currentBreed = getRandomBreedAndSub();
  document.getElementById('result').textContent = '';
  doubleDipActive = false;
  doubleDipUsed = false;
  // Reset lifelines if streak is 0
  if (score === 0) lifelines = { fifty: true, reroll: 5, doubledip: true };
  renderLifelines();
  const imgEl = document.getElementById('breed-img');
  const optionsDiv = document.getElementById('options');
  let loader = document.getElementById('loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'loader';
    loader.innerHTML = `<div class="spinner"></div>`;
    loader.style.margin = '32px auto';
    loader.style.display = 'block';
    imgEl.parentNode.insertBefore(loader, imgEl);
  }
  loader.style.display = 'block';
  imgEl.style.opacity = 0;
  optionsDiv.style.opacity = 0;
  // Fetch image first
  const imgUrl = await fetchBreedImage(currentBreed.breed, currentBreed.sub);
  imgEl.src = imgUrl;
  imgEl.onload = () => {
    loader.style.display = 'none';
    imgEl.style.opacity = 1;
    // Build options
    currentOptions = getRandomOptions(currentBreed, 6);
    renderOptions();
    // Update the score sidebar
    updateScoreSidebar(currentQuestionNumber);
  };
}

function updateScoreDisplay() {
  document.getElementById('score').textContent = score;
  document.getElementById('high-score').textContent = highScore;
}

function showCongratsScreen() {
  document.getElementById('game-screen').style.display = 'none';
  document.getElementById('congrats-screen').style.display = '';
  const playAgainBtn = document.getElementById('play-again-congrats-btn');
  playAgainBtn.onclick = () => {
    document.getElementById('congrats-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = '';
    score = 0;
    currentQuestionNumber = 0;
    updateScoreDisplay();
    nextRound();
  };
}

function checkUserAnswer(selectedOption, btn) {
  const accepted = getAcceptedLabels(currentBreed.breed, currentBreed.sub).map(x => x.toLowerCase());
  if (accepted.includes(selectedOption.label.toLowerCase())) {
    score++;
    currentQuestionNumber++; // Increment question number on correct answer
    if (score > highScore) {
      highScore = score;
      updateScoreDisplay();
    } else {
      document.getElementById('score').textContent = score;
    }
    document.getElementById('result').textContent = 'Correct!';
    // Highlight correct answer and grey out others
    const optionsDiv = document.getElementById('options');
    if (optionsDiv) {
      Array.from(optionsDiv.querySelectorAll('button')).forEach(answerBtn => {
        answerBtn.disabled = true;
        if (answerBtn.textContent === selectedOption.label) {
          answerBtn.classList.add('correct');
        } else {
          answerBtn.classList.add('selected');
        }
      });
    }
    if (score === 10) {
      setTimeout(showCongratsScreen, 900);
    } else {
      setTimeout(nextRound, 1200);
    }
  } else if (doubleDipActive && !doubleDipUsed) {
    doubleDipUsed = true;
    btn.disabled = true;
    btn.classList.add('selected');
    document.getElementById('result').textContent = 'Try again!';
  } else {
    document.getElementById('result').innerHTML = `Oops! The answer was: ${accepted[0]}.<br>Your streak was ${score}.`;
    score = 0;
    currentQuestionNumber = 0; // Reset question number on game over
    updateScoreDisplay();
    // Disable all answer buttons on loss
    const optionsDiv = document.getElementById('options');
    if (optionsDiv) {
      Array.from(optionsDiv.querySelectorAll('button')).forEach(answerBtn => {
        answerBtn.disabled = true;
        const isCorrect = accepted.includes(answerBtn.textContent.toLowerCase());
        if (answerBtn === btn && !isCorrect) {
          answerBtn.classList.add('incorrect'); // User's wrong pick: red
        } else if (isCorrect) {
          answerBtn.classList.add('correct'); // Correct answer: green
        } else {
          answerBtn.classList.add('selected'); // Others: greyed out
        }
      });
    }
    // Disable lifelines on loss
    const lifelineDiv = document.getElementById('lifelines');
    if (lifelineDiv) {
      Array.from(lifelineDiv.querySelectorAll('button')).forEach(btn => {
        btn.disabled = true;
      });
    }
    // Show Play Again button instead of auto-restarting
    const playAgainBtn = document.getElementById('play-again-btn');
    playAgainBtn.style.display = '';
    playAgainBtn.onclick = () => {
      playAgainBtn.style.display = 'none';
      nextRound();
    };
  }
}

window.onload = async () => {
  document.getElementById('play-btn').onclick = async () => {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = '';
    allBreeds = await fetchAllBreeds();
    allBreedOptions = getAllBreedOptions();
    // Add lifeline bar
    let lifelineDiv = document.getElementById('lifelines');
    if (!lifelineDiv) {
      lifelineDiv = document.createElement('div');
      lifelineDiv.id = 'lifelines';
      lifelineDiv.style.marginTop = '24px';
      lifelineDiv.style.display = 'flex';
      lifelineDiv.style.justifyContent = 'center';
      lifelineDiv.style.gap = '18px';
      document.getElementById('game-screen').appendChild(lifelineDiv);
    }
    updateScoreDisplay();
    nextRound();
  };
};
