/* ============================================================================
   English Scenes — app.js
   ----------------------------------------------------------------------------
   Drives the learning features on every page:
     1. Text-to-speech (Web Speech API) for the "Listen" buttons.
     2. The notebook — save / delete sentences in localStorage.
     3. Multiple-choice questions with instant feedback.
     4. Rendering the My Collection page.
   Plain JavaScript, no libraries.
   ============================================================================ */

(function () {
  "use strict";

  var KEY = "english-scenes-notebook";

  /* --------------------------------------------------------------------------
     1. Text-to-speech
     -------------------------------------------------------------------------- */
  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();               // stop any previous voice
    var u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.95;                                 // slightly slower for learners
    window.speechSynthesis.speak(u);
  }

  /* --------------------------------------------------------------------------
     2. The notebook (localStorage)
     -------------------------------------------------------------------------- */
  function getCollection() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch (e) { return []; }
  }
  function saveCollection(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
  }
  function hasSentence(en) {
    return getCollection().some(function (s) { return s.en === en; });
  }
  function addSentence(en, zh) {
    if (hasSentence(en)) return;
    var list = getCollection();
    list.push({ en: en, zh: zh });
    saveCollection(list);
  }
  function removeSentence(en) {
    saveCollection(getCollection().filter(function (s) { return s.en !== en; }));
  }

  /* --------------------------------------------------------------------------
     3. Listen + Collect buttons (on the scene pages)
     -------------------------------------------------------------------------- */
  function markSaved(btn) {
    btn.classList.add("saved");
    btn.textContent = "Saved ✓";
    btn.disabled = true;
  }

  function initCards() {
    // "Listen" buttons read their sentence aloud.
    document.querySelectorAll("[data-speak]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        speak(btn.getAttribute("data-speak"));
      });
    });

    // "Collect" buttons save the sentence to the notebook.
    document.querySelectorAll("[data-collect]").forEach(function (btn) {
      var en = btn.getAttribute("data-collect");
      var zh = btn.getAttribute("data-collect-zh") || "";
      if (hasSentence(en)) markSaved(btn);
      btn.addEventListener("click", function () {
        if (btn.classList.contains("saved")) return;
        addSentence(en, zh);
        markSaved(btn);
      });
    });
  }

  /* --------------------------------------------------------------------------
     4. Multiple-choice questions
     -------------------------------------------------------------------------- */
  function initQuiz() {
    document.querySelectorAll(".quiz").forEach(function (quiz) {
      var feedback = quiz.querySelector(".feedback");
      quiz.querySelectorAll(".option").forEach(function (opt) {
        opt.addEventListener("click", function () {
          if (quiz.dataset.answered) return;      // lock after first answer
          quiz.dataset.answered = "1";

          var correct = opt.getAttribute("data-correct") === "true";
          quiz.querySelectorAll(".option").forEach(function (o) {
            o.disabled = true;
            if (o.getAttribute("data-correct") === "true") o.classList.add("correct");
          });
          if (!correct) opt.classList.add("wrong");

          if (feedback) {
            feedback.textContent = correct
              ? (feedback.getAttribute("data-ok") || "Correct!")
              : (feedback.getAttribute("data-no") || "Not quite.");
            feedback.classList.add(correct ? "ok" : "no");
            feedback.hidden = false;
          }
        });
      });
    });
  }

  /* --------------------------------------------------------------------------
     5. My Collection page
     -------------------------------------------------------------------------- */
  function initCollectionPage() {
    if (document.querySelector("[data-collection-list]")) renderCollection();
  }

  function renderCollection() {
    var list = document.querySelector("[data-collection-list]");
    if (!list) return;
    var items = getCollection();

    if (!items.length) {
      list.innerHTML =
        "<p class='empty'>Your notebook is empty. Save sentences from the " +
        "Airport, Café and Campus pages.</p>";
      return;
    }

    list.innerHTML = "";
    items.forEach(function (s) {
      var div = document.createElement("div");
      div.className = "collection-item";

      var body = document.createElement("div");
      body.innerHTML = "<div class='en'>" + esc(s.en) + "</div><p class='zh'>" + esc(s.zh) + "</p>";

      var btn = document.createElement("button");
      btn.className = "delete-btn";
      btn.setAttribute("aria-label", "Delete");
      btn.textContent = "✕";
      btn.addEventListener("click", function () {
        removeSentence(s.en);
        renderCollection();
      });

      div.appendChild(body);
      div.appendChild(btn);
      list.appendChild(div);
    });
  }

  // Escape text before inserting into innerHTML (sentences may contain quotes).
  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  /* --------------------------------------------------------------------------
     Boot
     -------------------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    initCards();
    initQuiz();
    initCollectionPage();
  });
})();
