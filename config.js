// Deine Google Apps Script Web-App URL
const API_URL = 'https://script.google.com/macros/s/AKfycbwMgHdKikX6yd0D2ex9nu0yXqpVE69uCz9xpKj4kAD47oGJ7uqwTcrCtouaA4x4no_9/exec';

// API Wrapper für Google Apps Script
const google = {
  script: {
    run: {
      withSuccessHandler: function(callback) {
        this.successCallback = callback;
        return this;
      },
      withFailureHandler: function(callback) {
        this.failureCallback = callback;
        return this;
      }
    }
  }
};

// Füge alle Backend-Funktionen hinzu
['loginOrRegister', 'getLernkarten', 'getQuizDeAr', 'getQuizAr', 'getFortschritt', 
 'markiereAlsGelernt', 'speichereQuizAntwort', 'getStatistik'].forEach(funcName => {
  google.script.run[funcName] = async function(...args) {
    try {
      const response = await fetch(API_URL + '?action=' + funcName, {
        method: 'POST',
        body: JSON.stringify({ args: args })
      });
      const data = await response.json();
      if (this.successCallback) this.successCallback(data);
    } catch (error) {
      if (this.failureCallback) this.failureCallback(error);
    }
  };
});
