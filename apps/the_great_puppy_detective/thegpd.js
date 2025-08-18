// const dev = true; // Set to true for development/testing to show the correct answer
const dev = false;
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
let endlessMode = false;

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

function getRandomOptions(correctOption, n = 4) {
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
  fiftyBtn.className = 'lifeline-btn lifeline-5050';
  fiftyBtn.innerHTML = '50/50';
  fiftyBtn.disabled = !lifelines.fifty;
  fiftyBtn.onclick = function() {
    useFiftyFifty();
    this.blur();
  };
  lifelineDiv.appendChild(fiftyBtn);
  // Reroll
  const rerollBtn = document.createElement('button');
  rerollBtn.className = 'lifeline-btn lifeline-reroll';
  rerollBtn.innerHTML = 'REROLL!';
  rerollBtn.disabled = lifelines.reroll === 0;
  rerollBtn.onclick = function() {
    useReroll();
    this.blur();
  };
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
  ddBtn.onclick = function() {
    useDoubleDip();
    this.blur();
  };
  lifelineDiv.appendChild(ddBtn);
}

function createLifelineInfoPopup() {
  if (document.getElementById('lifeline-info-popup')) return;
  const popup = document.createElement('div');
  popup.id = 'lifeline-info-popup';
  popup.innerHTML = `
    <div class="lifeline-info-content">
      <h2>Lifelines</h2>
      <ul>
        <li><b>50/50</b>: Removes two incorrect options, leaving one right and one wrong answer.</li>
        <li><b>REROLL!</b>: Get a new photo for the same dog breed. You have 5 rerolls per run.</li>
        <li><b>DOUBLE-DIP!</b>: Allows two guesses for one question. If your first guess is wrong, try again!</li>
      </ul>
      <button id="close-lifeline-info" class="big-play-btn" style="margin-top:18px;">Close</button>
    </div>
  `;
  document.body.appendChild(popup);
  setTimeout(() => { popup.classList.add('show'); }, 10);
  document.getElementById('close-lifeline-info').onclick = () => {
    popup.classList.remove('show');
    setTimeout(() => popup.remove(), 300);
  };
}


function addLifelineInfoButton() {
  if (document.getElementById('lifeline-info-btn')) return;
  const scoreDiv = document.querySelector('.score');
  if (!scoreDiv) return;
  const btn = document.createElement('button');
  btn.id = 'lifeline-info-btn';
  btn.title = 'What do lifelines do?';
  btn.innerHTML = '<span style="font-size:1.3em;">&#9432;</span>';
  btn.className = 'lifeline-info-btn';
  btn.onclick = createLifelineInfoPopup;
  btn.type = 'button';
  // Remove all inline styles, use only CSS for layout
  scoreDiv.appendChild(btn);
}

// Patch renderLifelines to always add the info button (now after score bar)
const origRenderLifelines = renderLifelines;
renderLifelines = function() {
  origRenderLifelines();
  addLifelineInfoButton();
};

function useFiftyFifty() {
  if (!lifelines.fifty) return;
  lifelines.fifty = false;
  // Mark 1 incorrect option as selected/disabled (since 4 options, 50/50 should leave 2)
  const correct = currentOptions.find(opt => getAcceptedLabels(currentBreed.breed, currentBreed.sub).map(x => x.toLowerCase()).includes(opt.label.toLowerCase()));
  const incorrect = currentOptions.filter(opt => opt !== correct);
  shuffle(incorrect);
  const toMark = incorrect.slice(0, 2); // Mark 2 incorrect (leave 2 options)
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

  // DEV: Show correct answer below options
  let devAnswerDiv = document.getElementById('dev-answer');
  if (dev) {
    if (!devAnswerDiv) {
      devAnswerDiv = document.createElement('div');
      devAnswerDiv.id = 'dev-answer';
      devAnswerDiv.style.margin = '10px auto 0 auto';
      devAnswerDiv.style.color = '#ffb300';
      devAnswerDiv.style.fontSize = '1.05em';
      devAnswerDiv.style.fontWeight = '600';
      devAnswerDiv.style.textAlign = 'center';
      optionsDiv.parentNode.insertBefore(devAnswerDiv, optionsDiv.nextSibling);
    }
    const accepted = getAcceptedLabels(currentBreed.breed, currentBreed.sub);
    devAnswerDiv.textContent = '[DEV] Correct answer: ' + accepted[0];
  } else if (devAnswerDiv) {
    devAnswerDiv.textContent = '';
  }
}

// Highlight the current question step in the Millionaire-style sidebar
function updateScoreSidebar(currentStep) {
  // Only update sidebar if not in endless mode
  if (endlessMode) return;
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
  // Hide sidebar if in endless mode, show otherwise
  const sidebar = document.querySelector('.score-sidebar');
  if (endlessMode && sidebar) sidebar.style.display = 'none';
  else if (sidebar) sidebar.style.display = '';
  // Fetch image first
  const imgUrl = await fetchBreedImage(currentBreed.breed, currentBreed.sub);
  imgEl.src = imgUrl;
  imgEl.onload = () => {
    loader.style.display = 'none';
    imgEl.style.opacity = 1;
    // Build options
    currentOptions = getRandomOptions(currentBreed, 4);
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
  const congratsScreen = document.getElementById('congrats-screen');
  congratsScreen.style.display = '';
  // Add success.gif if not already present
  if (!document.getElementById('success-gif')) {
    const gif = document.createElement('img');
    gif.id = 'success-gif';
    gif.src = 'success.gif';
    gif.alt = 'Success!';
    gif.style.display = 'block';
    gif.style.margin = '18px auto 0 auto';
    gif.style.maxWidth = '220px';
    gif.style.width = '80%';
    gif.style.borderRadius = '1.2em';
    congratsScreen.insertBefore(gif, congratsScreen.querySelector('#victory-buttons'));
  }
  // Endless Mode button
  const endlessBtn = document.getElementById('endless-mode-btn');
  if (endlessBtn) {
    endlessBtn.onclick = () => {
      endlessMode = true;
      congratsScreen.style.display = 'none';
      document.getElementById('game-screen').style.display = '';
      // Remove the gif for next time
      const gif = document.getElementById('success-gif');
      if (gif) gif.remove();
  // Do not reset score when entering endless mode
  currentQuestionNumber = 0;
      // Hide the score sidebar for endless mode
      const sidebar = document.querySelector('.score-sidebar');
      if (sidebar) sidebar.style.display = 'none';
      updateScoreDisplay();
      nextRound();
    };
  }
  // Home button
  const homeBtn = document.getElementById('home-btn-victory');
  if (homeBtn) {
    homeBtn.onclick = () => {
      // Reset everything for a fresh start
      endlessMode = false;
      score = 0;
      currentQuestionNumber = 0;
      lifelines = { fifty: true, reroll: 5, doubledip: true };
      congratsScreen.style.display = 'none';
      document.getElementById('start-screen').style.display = '';
      // Remove the gif for next time
      const gif = document.getElementById('success-gif');
      if (gif) gif.remove();
      // Restore the score sidebar
      const sidebar = document.querySelector('.score-sidebar');
      if (sidebar) sidebar.style.display = '';
      updateScoreDisplay();
    };
  }
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
    if (!endlessMode && score === 10) {
      setTimeout(showCongratsScreen, 900);
    } else {
      setTimeout(nextRound, 1200);
    }
  } else if (doubleDipActive && !doubleDipUsed) {
    doubleDipUsed = true;
    btn.disabled = true;
    btn.classList.add('selected');
    document.getElementById('result').textContent = 'Try again!';
    // Hide double-dip banner after second guess
    const ddText = document.getElementById('double-dip-active');
    if (ddText) ddText.style.display = 'none';
  } else {
    document.getElementById('result').innerHTML = `Oops! The answer was: ${accepted[0]}.<br>Your streak was ${score}.`;
    if (endlessMode) {
      // In endless mode, show regular play again/home buttons, not congrats screen
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
      // Show Play Again and Home buttons
      let playAgainBtn = document.getElementById('play-again-btn');
      let homeBtn = document.getElementById('home-btn');
      if (!homeBtn) {
        homeBtn = document.createElement('button');
        homeBtn.id = 'home-btn';
        homeBtn.className = 'big-play-btn';
        homeBtn.textContent = 'Home';
        homeBtn.style.marginRight = '16px';
        homeBtn.style.marginTop = '10px';
        homeBtn.onclick = () => {
          // Reset everything for a fresh start
          endlessMode = false;
          score = 0;
          currentQuestionNumber = 0;
          lifelines = { fifty: true, reroll: 5, doubledip: true };
          document.getElementById('game-screen').style.display = 'none';
          document.getElementById('start-screen').style.display = '';
          playAgainBtn.style.display = 'none';
          homeBtn.style.display = 'none';
          // Restore the score sidebar
          const sidebar = document.querySelector('.score-sidebar');
          if (sidebar) sidebar.style.display = '';
          updateScoreDisplay();
        };
        playAgainBtn.parentNode.insertBefore(homeBtn, playAgainBtn);
      }
      playAgainBtn.style.display = '';
      playAgainBtn.style.marginLeft = '16px';
      playAgainBtn.style.marginTop = '10px';
      homeBtn.style.display = '';
      playAgainBtn.onclick = () => {
        playAgainBtn.style.display = 'none';
        homeBtn.style.display = 'none';
        // If in endless mode, reset everything as if starting fresh
        if (endlessMode) {
          endlessMode = false;
          score = 0;
          currentQuestionNumber = 0;
          lifelines = { fifty: true, reroll: 5, doubledip: true };
          // Restore sidebar
          const sidebar = document.querySelector('.score-sidebar');
          if (sidebar) sidebar.style.display = '';
          updateScoreDisplay();
        }
        nextRound();
      };
    } else {
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
      // Show Play Again and Home buttons
      let playAgainBtn = document.getElementById('play-again-btn');
      let homeBtn = document.getElementById('home-btn');
      if (!homeBtn) {
        homeBtn = document.createElement('button');
        homeBtn.id = 'home-btn';
        homeBtn.className = 'big-play-btn';
        homeBtn.textContent = 'Home';
        homeBtn.style.marginRight = '16px';
        homeBtn.style.marginTop = '10px';
        homeBtn.onclick = () => {
          document.getElementById('game-screen').style.display = 'none';
          document.getElementById('start-screen').style.display = '';
          playAgainBtn.style.display = 'none';
          homeBtn.style.display = 'none';
        };
        playAgainBtn.parentNode.insertBefore(homeBtn, playAgainBtn);
      }
      playAgainBtn.style.display = '';
      playAgainBtn.style.marginLeft = '16px';
      playAgainBtn.style.marginTop = '10px';
      homeBtn.style.display = '';
      playAgainBtn.onclick = () => {
        playAgainBtn.style.display = 'none';
        homeBtn.style.display = 'none';
        nextRound();
      };
    }
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
  // Show high score on home screen
  const homeHighScoreId = 'home-high-score';
  let homeHighScore = document.getElementById(homeHighScoreId);
  if (!homeHighScore) {
    homeHighScore = document.createElement('div');
    homeHighScore.id = homeHighScoreId;
    homeHighScore.style.color = '#00c6ff';
    homeHighScore.style.fontWeight = '700';
    homeHighScore.style.fontSize = '1.13em';
    homeHighScore.style.margin = '18px auto 0 auto';
    homeHighScore.style.textAlign = 'center';
    document.getElementById('start-screen').appendChild(homeHighScore);
  }
  function updateHomeHighScore() {
    homeHighScore.textContent = `Highest Score: ${highScore}`;
  }
  updateHomeHighScore();
  // Update home high score whenever highScore changes
  const origUpdateScoreDisplay = updateScoreDisplay;
  updateScoreDisplay = function() {
    origUpdateScoreDisplay();
    updateHomeHighScore();
  };
  // Add floating home button to joseppy.ca if not present
  if (!document.getElementById('joseppy-home-btn')) {
    const btn = document.createElement('button');
    btn.id = 'joseppy-home-btn';
    btn.style.position = 'fixed';
    btn.style.bottom = '24px';
    btn.style.right = '24px';
    btn.style.zIndex = '9999';
    btn.style.background = 'rgba(30,32,36,0.92)';
    btn.style.padding = '0';
    btn.style.opacity = '0.92';
    btn.style.backdropFilter = 'blur(2px)';
    btn.style.borderRadius = '50%';
    btn.style.width = '48px';
    btn.style.height = '48px';
    btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.13)';
    btn.title = 'Back to joseppy.ca';
    btn.onmouseenter = () => { btn.style.boxShadow = '0 4px 16px rgba(25,118,210,0.18)'; btn.style.transform = 'scale(1.07)'; };
    btn.onmouseleave = () => { btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.13)'; btn.style.transform = 'scale(1)'; };
    btn.onclick = () => { window.location.href = 'https://joseppy.ca'; };
    const img = document.createElement('img');
    img.src = '../portfolio/images/favicon.ico';
    img.alt = 'joseppy.ca';
    img.style.width = '24px';
    img.style.height = '24px';
    img.style.display = 'block';
    img.style.margin = '0 auto';
    btn.appendChild(img);
    document.body.appendChild(btn);
  }
};
