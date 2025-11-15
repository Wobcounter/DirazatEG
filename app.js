let currentUser = '';
let alleLernkarten = [];
let alleQuizDeAr = [];
let alleQuizAr = [];
let fortschritt = {};
let currentModus = '';
let currentQuizTyp = '';
let currentKapitel = 0;
let currentKarten = [];
let currentIndex = 0;
let quizErgebnisse = [];

function hideAllScreens() {
  document.querySelectorAll('.container > div').forEach(div => {
    div.classList.add('hidden');
  });
}

function showLoader() {
  document.getElementById('loader').classList.remove('hidden');
}

function hideLoader() {
  document.getElementById('loader').classList.add('hidden');
}

function showError(message) {
  const errorDiv = document.getElementById('loginError');
  errorDiv.textContent = message;
  errorDiv.classList.remove('hidden');
}

function hideError() {
  document.getElementById('loginError').classList.add('hidden');
}

function login() {
  const username = document.getElementById('usernameInput').value.trim();
  
  if (!username) {
    showError('Bitte gib einen Namen ein!');
    return;
  }
  
  hideError();
  showLoader();
  
  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'loginOrRegister',
      username: username
    })
  })
  .then(res => res.json())
  .then(result => {
    if (result.success) {
      currentUser = username;
      localStorage.setItem('lernapp_user', username);
      loadAllData();
    } else {
      hideLoader();
      showError(result.message);
    }
  })
  .catch(error => {
    hideLoader();
    showError('Fehler: ' + error);
  });
}

function loadAllData() {
  showLoader();
  
  Promise.all([
    fetch(API_URL + '?action=getLernkarten').then(r => r.json()),
    fetch(API_URL + '?action=getQuizDeAr').then(r => r.json()),
    fetch(API_URL + '?action=getQuizAr').then(r => r.json()),
    fetch(API_URL + '?action=getFortschritt&username=' + currentUser).then(r => r.json())
  ])
  .then(([karten, quizDeAr, quizAr, fort]) => {
    alleLernkarten = karten;
    alleQuizDeAr = quizDeAr;
    alleQuizAr = quizAr;
    fortschritt = fort;
    hideLoader();
    showMainMenu();
  })
  .catch(error => {
    hideLoader();
    showError('Fehler beim Laden: ' + error);
  });
}

function showMainMenu() {
  hideAllScreens();
  document.getElementById('mainMenu').classList.remove('hidden');
  document.getElementById('welcomeText').textContent = 'Hallo ' + currentUser + '! 👋';
}

function showLernkartenModus() {
  hideAllScreens();
  currentModus = '';
  document.getElementById('lernkartenModusScreen').classList.remove('hidden');
}

function showQuizModus() {
  hideAllScreens();
  currentQuizTyp = '';
  document.getElementById('quizModusScreen').classList.remove('hidden');
}

function logout() {
  localStorage.removeItem('lernapp_user');
  currentUser = '';
  hideAllScreens();
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('usernameInput').value = '';
}

function goBack() {
  if (currentModus) {
    showLernkartenModus();
    currentModus = '';
  } else if (currentQuizTyp) {
    showQuizModus();
    currentQuizTyp = '';
  } else {
    showMainMenu();
  }
}

function showStatistik() {
  hideAllScreens();
  showLoader();
  
  fetch(API_URL + '?action=getStatistik&username=' + currentUser)
    .then(res => res.json())
    .then(stats => {
      hideLoader();
      document.getElementById('statistikScreen').classList.remove('hidden');
      
      let html = '';
      
      for (let i = 1; i <= 4; i++) {
        const kap = stats['kapitel' + i];
        const prozent = kap.gesamt > 0 ? Math.round((kap.gelernt / kap.gesamt) * 100) : 0;
        const quizProzent = kap.quizGesamt > 0 ? Math.round((kap.quizRichtig / kap.quizGesamt) * 100) : 0;
        
        html += '<div class="stats">';
        html += '<h3>Kapitel ' + i + '</h3>';
        
        html += '<div class="stat-item">';
        html += '<span>Lernkarten gelernt:</span>';
        html += '<span><strong>' + kap.gelernt + ' / ' + kap.gesamt + '</strong></span>';
        html += '</div>';
        
        html += '<div class="progress-bar">';
        html += '<div class="progress-fill" style="width: ' + prozent + '%">' + prozent + '%</div>';
        html += '</div>';
        
        if (kap.quizGesamt > 0) {
          html += '<div class="stat-item">';
          html += '<span>Quiz richtig:</span>';
          html += '<span><strong>' + kap.quizRichtig + ' / ' + kap.quizGesamt + '</strong></span>';
          html += '</div>';
          
          html += '<div class="progress-bar">';
          html += '<div class="progress-fill" style="width: ' + quizProzent + '%">' + quizProzent + '%</div>';
          html += '</div>';
        }
        
        html += '</div>';
      }
      
      document.getElementById('statistikContent').innerHTML = html;
    })
    .catch(error => {
      hideLoader();
      alert('Fehler beim Laden der Statistik: ' + error);
    });
}

function showKapitelWahl(modus) {
  currentModus = modus;
  hideAllScreens();
  document.getElementById('kapitelWahlScreen').classList.remove('hidden');
  
  const gelernteKartenIds = fortschritt.gelernteKarten.map(k => k.kapitel + '-' + k.karteId);
  
  let html = '';
  
  for (let i = 1; i <= 4; i++) {
    const kapitelKarten = alleLernkarten.filter(k => k.kapitel === i);
    const gelernt = kapitelKarten.filter(k => 
      gelernteKartenIds.includes(k.kapitel + '-' + k.id)
    ).length;
    
    html += '<button class="btn btn-success" onclick="startLernkarten(' + i + ')">';
    html += '📖 Kapitel ' + i + ' (' + gelernt + '/' + kapitelKarten.length + ' gelernt)';
    html += '</button>';
  }
  
  const alleKarten = alleLernkarten.length;
  const alleGelernt = fortschritt.gelernteKarten.length;
  
  html += '<button class="btn btn-info" onclick="startLernkartenAlte()">';
  html += '🔄 Alte wiederholen (' + alleGelernt + ' Karten)';
  html += '</button>';
  
  html += '<button class="btn btn-info" onclick="startLernkartenNeue()">';
  html += '✨ Nur Neue (' + (alleKarten - alleGelernt) + ' Karten)';
  html += '</button>';
  
  html += '<button class="btn btn-warning" onclick="startLernkartenAlle()">';
  html += '🎲 Alle gemischt (' + alleKarten + ' Karten)';
  html += '</button>';
  
  document.getElementById('kapitelButtons').innerHTML = html;
}

function startLernkarten(kapitel) {
  currentKapitel = kapitel;
  currentKarten = alleLernkarten.filter(k => k.kapitel === kapitel);
  currentIndex = 0;
  zeigeLernkarte();
}

function startLernkartenAlte() {
  const gelernteIds = fortschritt.gelernteKarten.map(k => k.kapitel + '-' + k.karteId);
  currentKarten = alleLernkarten.filter(k => gelernteIds.includes(k.kapitel + '-' + k.id));
  currentIndex = 0;
  
  if (currentKarten.length === 0) {
    alert('Du hast noch keine Karten gelernt!');
    return;
  }
  
  shuffleArray(currentKarten);
  zeigeLernkarte();
}

function startLernkartenNeue() {
  const gelernteIds = fortschritt.gelernteKarten.map(k => k.kapitel + '-' + k.karteId);
  currentKarten = alleLernkarten.filter(k => !gelernteIds.includes(k.kapitel + '-' + k.id));
  currentIndex = 0;
  
  if (currentKarten.length === 0) {
    alert('Super! Du hast alle Karten schon gelernt! 🎉');
    return;
  }
  
  zeigeLernkarte();
}

function startLernkartenAlle() {
  currentKarten = [...alleLernkarten];
  currentIndex = 0;
  shuffleArray(currentKarten);
  zeigeLernkarte();
}

function zeigeLernkarte() {
  if (currentIndex >= currentKarten.length) {
    hideAllScreens();
    alert('🎉 Super! Du hast alle Karten durchgegangen!');
    showMainMenu();
    return;
  }
  
  hideAllScreens();
  document.getElementById('lernkartenScreen').classList.remove('hidden');
  
  const karte = currentKarten[currentIndex];
  const istGelernt = fortschritt.gelernteKarten.some(k => 
    k.kapitel === karte.kapitel && k.karteId === karte.id
  );
  
  let html = '';
  html += '<div class="karten-counter">Karte ' + (currentIndex + 1) + ' / ' + currentKarten.length + '</div>';
  
  html += '<div class="card" id="karteVorderseite" onclick="flipCard()">';
  
  if (currentModus === 'ar') {
    html += '<div class="arabic">' + karte.frageAR + '</div>';
  } else {
    html += '<div class="german">' + karte.frageDE + '</div>';
    html += '<div class="arabic" style="margin-top: 15px;">' + karte.frageAR + '</div>';
  }
  
  html += '</div>';
  
  html += '<div class="card flipped hidden" id="karteRueckseite" onclick="flipCard()">';
  
  if (currentModus === 'ar') {
    html += '<div class="arabic">' + karte.antwortAR + '</div>';
  } else {
    html += '<div class="german">' + karte.antwortDE + '</div>';
    html += '<div class="arabic" style="margin-top: 15px;">' + karte.antwortAR + '</div>';
  }
  
  html += '</div>';
  
  if (!istGelernt) {
    html += '<button class="btn btn-success" onclick="markiereGelernt()">✅ Als gelernt markieren</button>';
  } else {
    html += '<div class="success">✅ Diese Karte hast du schon gelernt!</div>';
  }
  
  html += '<button class="btn btn-primary" onclick="naechsteKarte()">➡️ Nächste Karte</button>';
  html += '<button class="btn btn-secondary" onclick="goBack()">← Zurück</button>';
  
  document.getElementById('lernkartenContent').innerHTML = html;
}

function flipCard() {
  const vorder = document.getElementById('karteVorderseite');
  const rueck = document.getElementById('karteRueckseite');
  
  vorder.classList.toggle('hidden');
  rueck.classList.toggle('hidden');
}

function markiereGelernt() {
  const karte = currentKarten[currentIndex];
  
  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'markiereAlsGelernt',
      username: currentUser,
      kapitel: karte.kapitel,
      karteId: karte.id
    })
  })
  .then(res => res.json())
  .then(() => {
    fortschritt.gelernteKarten.push({
      kapitel: karte.kapitel,
      karteId: karte.id
    });
    zeigeLernkarte();
  });
}

function naechsteKarte() {
  currentIndex++;
  zeigeLernkarte();
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function showQuizKapitelWahl(typ) {
  currentQuizTyp = typ;
  hideAllScreens();
  document.getElementById('kapitelWahlScreen').classList.remove('hidden');
  
  let html = '';
  
  for (let i = 1; i <= 4; i++) {
    html += '<button class="btn btn-warning" onclick="startQuiz(' + i + ')">';
    html += '📖 Kapitel ' + i;
    html += '</button>';
  }
  
  html += '<button class="btn btn-info" onclick="startQuizAlle()">';
  html += '🎲 Alle Kapitel gemischt';
  html += '</button>';
  
  document.getElementById('kapitelButtons').innerHTML = html;
}

function startQuiz(kapitel) {
  currentKapitel = kapitel;
  
  if (currentQuizTyp === 'de_ar') {
    currentKarten = alleQuizDeAr.filter(q => q.kapitel === kapitel);
  } else {
    currentKarten = alleQuizAr.filter(q => q.kapitel === kapitel);
  }
  
  currentIndex = 0;
  quizErgebnisse = [];
  zeigeQuizFrage();
}

function startQuizAlle() {
  if (currentQuizTyp === 'de_ar') {
    currentKarten = [...alleQuizDeAr];
  } else {
    currentKarten = [...alleQuizAr];
  }
  
  shuffleArray(currentKarten);
  currentIndex = 0;
  quizErgebnisse = [];
  zeigeQuizFrage();
}

function zeigeQuizFrage() {
  if (currentIndex >= currentKarten.length) {
    zeigeQuizErgebnis();
    return;
  }
  
  hideAllScreens();
  document.getElementById('quizScreen').classList.remove('hidden');
  
  const frage = currentKarten[currentIndex];
  
  let html = '';
  html += '<div class="karten-counter">Frage ' + (currentIndex + 1) + ' / ' + currentKarten.length + '</div>';
  
  if (currentQuizTyp === 'de_ar') {
    html += '<div class="german" style="margin-bottom: 10px;">' + frage.frageDE + '</div>';
    html += '<div class="arabic">' + frage.frageAR + '</div>';
    
    html += '<div style="margin-top: 20px;">';
    html += '<div class="quiz-option" onclick="pruefeAntwort(\'A\')">';
    html += '<div class="german">A) ' + frage.aDE + '</div>';
    html += '<div class="arabic">' + frage.aAR + '</div>';
    html += '</div>';
    
    html += '<div class="quiz-option" onclick="pruefeAntwort(\'B\')">';
    html += '<div class="german">B) ' + frage.bDE + '</div>';
    html += '<div class="arabic">' + frage.bAR + '</div>';
    html += '</div>';
    
    html += '<div class="quiz-option" onclick="pruefeAntwort(\'C\')">';
    html += '<div class="german">C) ' + frage.cDE + '</div>';
    html += '<div class="arabic">' + frage.cAR + '</div>';
    html += '</div>';
    
    html += '<div class="quiz-option" onclick="pruefeAntwort(\'D\')">';
    html += '<div class="german">D) ' + frage.dDE + '</div>';
    html += '<div class="arabic">' + frage.dAR + '</div>';
    html += '</div>';
    html += '</div>';
  } else {
    html += '<div class="arabic" style="font-size: 22px; margin-bottom: 20px;">' + frage.frageAR + '</div>';
    
    html += '<div class="quiz-option" onclick="pruefeAntwort(\'A\')">';
    html += '<div class="arabic">أ) ' + frage.aAR + '</div>';
    html += '</div>';
    
    html += '<div class="quiz-option" onclick="pruefeAntwort(\'B\')">';
    html += '<div class="arabic">ب) ' + frage.bAR + '</div>';
    html += '</div>';
    
    html += '<div class="quiz-option" onclick="pruefeAntwort(\'C\')">';
    html += '<div class="arabic">ج) ' + frage.cAR + '</div>';
    html += '</div>';
    
    html += '<div class="quiz-option" onclick="pruefeAntwort(\'D\')">';
    html += '<div class="arabic">د) ' + frage.dAR + '</div>';
    html += '</div>';
  }
  
  html += '<div id="quizFeedback"></div>';
  html += '<button class="btn btn-secondary" onclick="goBack()">← Zurück</button>';
  
  document.getElementById('quizContent').innerHTML = html;
}

function pruefeAntwort(antwort) {
  const frage = currentKarten[currentIndex];
  const richtig = antwort === frage.richtig;
  
  quizErgebnisse.push(richtig);
  
  const optionen = document.querySelectorAll('.quiz-option');
  optionen.forEach((opt, idx) => {
    opt.classList.add('disabled');
    const buchstabe = ['A', 'B', 'C', 'D'][idx];
    if (buchstabe === frage.richtig) {
      opt.classList.add('correct');
    }
    if (buchstabe === antwort && !richtig) {
      opt.classList.add('wrong');
    }
  });
  
  let feedback = '<div class="quiz-feedback ' + (richtig ? 'correct' : 'wrong') + '">';
  if (richtig) {
    feedback += '✅ Richtig! Super gemacht!';
  } else {
    feedback += '❌ Leider falsch. Die richtige Antwort ist ' + frage.richtig + '.';
  }
  feedback += '</div>';
  
  feedback += '<button class="btn btn-primary" onclick="naechsteQuizFrage()">➡️ Weiter</button>';
  
  document.getElementById('quizFeedback').innerHTML = feedback;
  
  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'speichereQuizAntwort',
      username: currentUser,
      kapitel: frage.kapitel,
      quizTyp: currentQuizTyp === 'de_ar' ? 'Quiz_DE_AR' : 'Quiz_AR',
      frageId: frage.id,
      richtig: richtig
    })
  });
}

function naechsteQuizFrage() {
  currentIndex++;
  zeigeQuizFrage();
}

function zeigeQuizErgebnis() {
  const richtige = quizErgebnisse.filter(r => r).length;
  const gesamt = quizErgebnisse.length;
  const prozent = Math.round((richtige / gesamt) * 100);
  
  let html = '';
  html += '<h2>🎉 Quiz beendet!</h2>';
  
  html += '<div class="stats">';
  html += '<h3>Dein Ergebnis:</h3>';
  html += '<div class="stat-item">';
  html += '<span>Richtige Antworten:</span>';
  html += '<span><strong>' + richtige + ' / ' + gesamt + '</strong></span>';
  html += '</div>';
  
  html += '<div class="progress-bar">';
  html += '<div class="progress-fill" style="width: ' + prozent + '%">' + prozent + '%</div>';
  html += '</div>';
  html += '</div>';
  
  if (prozent >= 80) {
    html += '<div class="success">🌟 Ausgezeichnet! Du kennst dich super aus!</div>';
  } else if (prozent >= 60) {
    html += '<div class="success">👍 Gut gemacht! Weiter so!</div>';
  } else {
    html += '<div class="error">💪 Übe noch ein bisschen weiter!</div>';
  }
  
  html += '<button class="btn btn-warning" onclick="' + (currentKapitel ? 'startQuiz(' + currentKapitel + ')' : 'startQuizAlle()') + '">🔄 Nochmal versuchen</button>';
  html += '<button class="btn btn-primary" onclick="showMainMenu()">🏠 Hauptmenü</button>';
  
  document.getElementById('quizContent').innerHTML = html;
}

window.onload = function() {
  const savedUser = localStorage.getItem('lernapp_user');
  if (savedUser) {
    document.getElementById('usernameInput').value = savedUser;
  }
};
