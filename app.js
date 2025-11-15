// Supabase Client initialisieren
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = '';
let alleLernkarten = [];
let alleQuizDeAr = [];
let alleQuizAr = [];
let fortschritt = { gelernteKarten: [] };
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

async function login() {
  const username = document.getElementById('usernameInput').value.trim();
  
  if (!username) {
    showError('Bitte gib einen Namen ein!');
    return;
  }
  
  hideError();
  showLoader();
  
  try {
    // Prüfe ob Benutzer existiert
    const { data: existingUser } = await supabaseClient
      .from('benutzer')
      .select('*')
      .eq('username', username)
      .single();
    
    if (!existingUser) {
      // Neuen Benutzer anlegen
      await supabaseClient
        .from('benutzer')
        .insert([{ username: username }]);
    }
    
    currentUser = username;
    localStorage.setItem('lernapp_user', username);
    await loadAllData();
  } catch (error) {
    hideLoader();
    showError('Fehler beim Login: ' + error.message);
  }
}

async function loadAllData() {
  showLoader();
  
  try {
    // Lade Lernkarten
    const { data: karten } = await supabaseClient
      .from('lernkarten')
      .select('*')
      .order('id');
    
    // Lade Quiz DE-AR
    const { data: quizDeAr } = await supabaseClient
      .from('quiz_de_ar')
      .select('*')
      .order('id');
    
    // Lade Quiz AR
    const { data: quizAr } = await supabaseClient
      .from('quiz_ar')
      .select('*')
      .order('id');
    
    // Lade Fortschritt
    const { data: fort } = await supabaseClient
      .from('fortschritt')
      .select('*')
      .eq('benutzer', currentUser);
    
    alleLernkarten = karten || [];
    alleQuizDeAr = quizDeAr || [];
    alleQuizAr = quizAr || [];
    
    // Fortschritt aufbereiten
    fortschritt = { gelernteKarten: [] };
    if (fort) {
      fortschritt.gelernteKarten = fort
        .filter(f => f.typ === 'lernkarte')
        .map(f => ({ kapitel: f.kapitel, karteId: f.karte_id }));
    }
    
    hideLoader();
    showMainMenu();
  } catch (error) {
    hideLoader();
    showError('Fehler beim Laden: ' + error.message);
  }
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

async function showStatistik() {
  hideAllScreens();
  showLoader();
  
  try {
    const { data: fort } = await supabaseClient
      .from('fortschritt')
      .select('*')
      .eq('benutzer', currentUser);
    
    hideLoader();
    document.getElementById('statistikScreen').classList.remove('hidden');
    
    let html = '';
    
    for (let i = 1; i <= 4; i++) {
      const kapitelKarten = alleLernkarten.filter(k => k.kapitel === i);
      const gelernt = fort?.filter(f => f.kapitel === i && f.typ === 'lernkarte').length || 0;
      
      const quizEntries = fort?.filter(f => f.kapitel === i && f.typ === 'quiz') || [];
      const quizRichtig = quizEntries.filter(q => q.status === 'richtig').length;
      const quizGesamt = quizEntries.length;
      
      const prozent = kapitelKarten.length > 0 ? Math.round((gelernt / kapitelKarten.length) * 100) : 0;
      const quizProzent = quizGesamt > 0 ? Math.round((quizRichtig / quizGesamt) * 100) : 0;
      
      html += '<div class="stats">';
      html += '<h3>Kapitel ' + i + '</h3>';
      
      html += '<div class="stat-item">';
      html += '<span>Lernkarten gelernt:</span>';
      html += '<span><strong>' + gelernt + ' / ' + kapitelKarten.length + '</strong></span>';
      html += '</div>';
      
      html += '<div class="progress-bar">';
      html += '<div class="progress-fill" style="width: ' + prozent + '%">' + prozent + '%</div>';
      html += '</div>';
      
      if (quizGesamt > 0) {
        html += '<div class="stat-item">';
        html += '<span>Quiz richtig:</span>';
        html += '<span><strong>' + quizRichtig + ' / ' + quizGesamt + '</strong></span>';
        html += '</div>';
        
        html += '<div class="progress-bar">';
        html += '<div class="progress-fill" style="width: ' + quizProzent + '%">' + quizProzent + '%</div>';
        html += '</div>';
      }
      
      html += '</div>';
    }
    
    document.getElementById('statistikContent').innerHTML = html;
  } catch (error) {
    hideLoader();
    alert('Fehler beim Laden der Statistik: ' + error.message);
  }
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
    html += '<div class="arabic">' + karte.frage_ar + '</div>';
  } else {
    html += '<div class="german">' + karte.frage_de + '</div>';
    html += '<div class="arabic" style="margin-top: 15px;">' + karte.frage_ar + '</div>';
  }
  
  html += '</div>';
  
  html += '<div class="card flipped hidden" id="karteRueckseite" onclick="flipCard()">';
  
  if (currentModus === 'ar') {
    html += '<div class="arabic">' + karte.antwort_ar + '</div>';
  } else {
    html += '<div class="german">' + karte.antwort_de + '</div>';
    html += '<div class="arabic" style="margin-top: 15px;">' + karte.antwort_ar + '</div>';
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

async function markiereGelernt() {
  const karte = currentKarten[currentIndex];
  
  try {
    await supabaseClient
      .from('fortschritt')
      .insert([{
        benutzer: currentUser,
        kapitel: karte.kapitel,
        typ: 'lernkarte',
        karte_id: karte.id,
        status: 'gelernt'
      }]);
    
    fortschritt.gelernteKarten.push({
      kapitel: karte.kapitel,
      karteId: karte.id
    });
    
    zeigeLernkarte();
  } catch (error) {
    alert('Fehler: ' + error.message);
  }
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
    html += '<div class="german" style="margin-bottom: 10px;">' + frage.frage_de + '</div>';
    html += '<div class="arabic">' + frage.frage_ar + '</div>';
    
    html += '<div style="margin-top: 20px;">';
    html += '<div class="quiz-option" onclick="pruefeAntwort(\'A\')">';
    html += '<div class="german">A) ' + frage.a_de + '</div>';
    html += '<div class="arabic">' + frage.a_ar + '</div>';
    html += '</div>';
    
    html += '<div class="quiz-option" onclick="pruefeAntwort(\'B\')">';
    html += '<div class="german">B) ' + frage.b_de + '</div>';
    html += '<div class="arabic">' + frage.b_ar + '</div>';
    html += '</div>';
    
    html += '<div class="quiz-option" onclick="pruefeAntwort(\'C\')">';
    html += '<div class="german">C) ' + frage.c_de + '</div>';
    html += '<div class="arabic">' + frage.c_ar + '</div>';
    html += '</div>';
    
    html += '<div class="quiz-option" onclick="pruefeAntwort(\'D\')">';
    html += '<div class="german">D) ' + frage.d_de + '</div>';
    html += '<div class="arabic">' + frage.d_ar + '</div>';
    html += '</div>';
    html += '</div>';
  } else {
    html += '<div class="arabic" style="font-size: 22px; margin-bottom: 20px;">' + frage.frage_ar + '</div>';
    
    html += '<div class="quiz-option" onclick="pruefeAntwort(\'A\')">';
    html += '<div class="arabic">أ) ' + frage.a_ar + '</div>';
    html += '</div>';
    
    html += '<div class="quiz-option" onclick="pruefeAntwort(\'B\')">';
    html += '<div class="arabic">ب) ' + frage.b_ar + '</div>';
    html += '</div>';
    
    html += '<div class="quiz-option" onclick="pruefeAntwort(\'C\')">';
    html += '<div class="arabic">ج) ' + frage.c_ar + '</div>';
    html += '</div>';
    
    html += '<div class="quiz-option" onclick="pruefeAntwort(\'D\')">';
    html += '<div class="arabic">د) ' + frage.d_ar + '</div>';
    html += '</div>';
  }
  
  html += '<div id="quizFeedback"></div>';
  html += '<button class="btn btn-secondary" onclick="goBack()">← Zurück</button>';
  
  document.getElementById('quizContent').innerHTML = html;
}

async function pruefeAntwort(antwort) {
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
  
  try {
    await supabaseClient
      .from('fortschritt')
      .insert([{
        benutzer: currentUser,
        kapitel: frage.kapitel,
        typ: 'quiz',
        karte_id: frage.id,
        status: richtig ? 'richtig' : 'falsch'
      }]);
  } catch (error) {
    console.error('Fehler beim Speichern:', error);
  }
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
