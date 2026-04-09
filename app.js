// ── CONFIG ───────────────────────────────────────────────────
var DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwj-Jsd1MloVH0cfb89OyKtBoWKKoh-u1zO_fglakFAGYJ6t6BLx8eXeH-fulMwXcsP/exec';
var SCRIPT_URL = localStorage.getItem('cssa_script_url') || DEFAULT_SCRIPT_URL;
var PASSCODE   = 'softball';

// ── DEMO DATA ────────────────────────────────────────────────
var DEMO_TEAMS = ['Sluggers','Dirt Bags','Diamond Dogs','The Bench','Fly Ballers',
                  'Iron Mitts','Bases Loaded','Mudcats','The Naturals','Home Plates'];

var DEMO_SCHEDULE = (function() {
  var games = [], id = 1;
  for (var week = 1; week <= 10; week++) {
    for (var g = 0; g < 5; g++) {
      var hasScores = week < 4;
      games.push({
        id: id++, week: week,
        home: DEMO_TEAMS[g * 2],
        away: DEMO_TEAMS[g * 2 + 1],
        homeScore:  hasScores ? Math.floor(Math.random()*10)+2 : null,
        awayScore:  hasScores ? Math.floor(Math.random()*10)+2 : null,
        homeScore2: hasScores ? Math.floor(Math.random()*10)+2 : null,
        awayScore2: hasScores ? Math.floor(Math.random()*10)+2 : null
      });
    }
  }
  return games;
})();

// ── AUTH ─────────────────────────────────────────────────────
function checkAuth() {
  var val = document.getElementById('passcodeInput').value.trim();
  if (!val) { document.getElementById('authError').textContent = 'Enter a passcode.'; return; }
  if (val === PASSCODE) {
    document.getElementById('authWall').style.display = 'none';
    initApp();
  } else {
    document.getElementById('authError').textContent = 'Wrong passcode. Try again.';
    document.getElementById('passcodeInput').value = '';
  }
}

// ── NAV ──────────────────────────────────────────────────────
function showView(name) {
  document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('active'); });
  document.querySelectorAll('nav button').forEach(function(b) { b.classList.remove('active'); });
  document.getElementById('view-' + name).classList.add('active');
  document.getElementById('nav' + name.charAt(0).toUpperCase() + name.slice(1)).classList.add('active');
}

// ── INIT ─────────────────────────────────────────────────────
function initApp() {
  document.getElementById('scriptUrl').value = SCRIPT_URL;
  document.getElementById('passcodeConfig').value = PASSCODE;
  if (SCRIPT_URL) { fetchData(); } else { renderDemoStandings(); renderDemoSchedule(); }
}

// ── FETCH ────────────────────────────────────────────────────
function fetchData() {
  fetch(SCRIPT_URL + '?action=getAll')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      renderStandings(data.games);
      renderSchedule(data.games);
      document.getElementById('connectionStatus').innerHTML =
        '<span class="status-dot dot-live"></span>LIVE';
    })
    .catch(function() {
      showToast('Connection failed — showing demo data');
      renderDemoStandings();
      renderDemoSchedule();
    });
}

// ── SAVE SCORE ───────────────────────────────────────────────
function doSaveScore(gameId, homeScore, awayScore, homeScore2, awayScore2, btn, savedLabel) {
  btn.disabled = true;
  btn.textContent = 'Saving...';

  if (!SCRIPT_URL) {
    var game = DEMO_SCHEDULE.find(function(g) { return g.id === gameId; });
    if (game) {
      game.homeScore = homeScore; game.awayScore = awayScore;
      game.homeScore2 = homeScore2; game.awayScore2 = awayScore2;
    }
    btn.style.display = 'none';
    savedLabel.style.display = 'block';
    renderDemoStandings();
    showToast('Scores saved (demo)');
    return;
  }

  var url = SCRIPT_URL +
    '?action=saveScore' +
    '&passcode=' + encodeURIComponent(PASSCODE) +
    '&gameId=' + encodeURIComponent(gameId) +
    '&homeScore=' + encodeURIComponent(homeScore) +
    '&awayScore=' + encodeURIComponent(awayScore) +
    '&homeScore2=' + encodeURIComponent(homeScore2) +
    '&awayScore2=' + encodeURIComponent(awayScore2);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) {
        btn.style.display = 'none';
        savedLabel.style.display = 'block';
        fetchData();
        showToast('Scores saved!');
      } else {
        btn.disabled = false; btn.textContent = 'Save';
        showToast('Error saving scores');
      }
    })
    .catch(function() {
      btn.disabled = false; btn.textContent = 'Save';
      showToast('Network error');
    });
}

// ── STANDINGS ────────────────────────────────────────────────
function calcStandings(games) {
  var teams = {};
  games.forEach(function(g) {
    [g.home, g.away].forEach(function(t) {
      if (!teams[t]) teams[t] = { name: t, w: 0, l: 0, rs: 0, ra: 0 };
    });
    // Game 1
    if (g.homeScore !== null && g.awayScore !== null) {
      var h = teams[g.home], a = teams[g.away];
      h.rs += g.homeScore; h.ra += g.awayScore;
      a.rs += g.awayScore; a.ra += g.homeScore;
      if (g.homeScore > g.awayScore) { h.w++; a.l++; }
      else if (g.awayScore > g.homeScore) { a.w++; h.l++; }
      else { h.w += 0.5; a.w += 0.5; }
    }
    // Game 2
    if (g.homeScore2 !== null && g.awayScore2 !== null) {
      var h2 = teams[g.home], a2 = teams[g.away];
      h2.rs += g.homeScore2; h2.ra += g.awayScore2;
      a2.rs += g.awayScore2; a2.ra += g.homeScore2;
      if (g.homeScore2 > g.awayScore2) { h2.w++; a2.l++; }
      else if (g.awayScore2 > g.homeScore2) { a2.w++; h2.l++; }
      else { h2.w += 0.5; a2.w += 0.5; }
    }
  });
  return Object.values(teams).sort(function(a, b) {
    var wa = a.w / (a.w + a.l || 1), wb = b.w / (b.w + b.l || 1);
    if (wb !== wa) return wb - wa;
    return (b.rs - b.ra) - (a.rs - a.ra);
  });
}

function renderStandings(games) { renderStandingsRows(calcStandings(games)); }
function renderDemoStandings() { renderStandingsRows(calcStandings(DEMO_SCHEDULE)); }

function renderStandingsRows(standings) {
  document.getElementById('standingsLoading').style.display = 'none';
  document.getElementById('standingsContent').style.display = 'block';
  var container = document.getElementById('standingsRows');
  container.innerHTML = '';
  standings.forEach(function(t, i) {
    var gp = t.w + t.l;
    var pct = gp > 0 ? (t.w / gp).toFixed(3) : '.000';
    var rd = t.rs - t.ra;
    var rdClass = rd > 0 ? 'rd-pos' : rd < 0 ? 'rd-neg' : 'rd-zero';
    var rdStr = rd > 0 ? '+' + rd : rd;
    var rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
    var row = document.createElement('div');
    row.className = 'team-row ' + rankClass;
    row.innerHTML =
      '<div class="team-name"><span class="team-rank">' + (i+1) + '</span>' + t.name + '</div>' +
      '<div class="team-stat">' + t.w + '</div>' +
      '<div class="team-stat">' + t.l + '</div>' +
      '<div class="team-stat pct">' + pct + '</div>' +
      '<div class="team-stat ' + rdClass + '">' + rdStr + '</div>';
    container.appendChild(row);
  });
}

// ── SCHEDULE ─────────────────────────────────────────────────
function renderDemoSchedule() { renderSchedule(DEMO_SCHEDULE); }

function renderSchedule(games) {
  document.getElementById('scheduleLoading').style.display = 'none';
  var container = document.getElementById('scheduleContent');
  container.style.display = 'block';
  container.innerHTML = '';

  var weeks = {};
  games.forEach(function(g) {
    if (!weeks[g.week]) weeks[g.week] = [];
    weeks[g.week].push(g);
  });

  Object.keys(weeks).sort(function(a,b){return a-b;}).forEach(function(week) {
    var div = document.createElement('div');
    div.className = 'week-group';
    var label = document.createElement('div');
    label.className = 'week-label';
    label.textContent = 'Week ' + week;
    div.appendChild(label);

    weeks[week].forEach(function(game) {
      var scored1 = game.homeScore !== null && game.awayScore !== null;
      var scored2 = game.homeScore2 !== null && game.awayScore2 !== null;
      var bothScored = scored1 && scored2;

      var card = document.createElement('div');
      card.className = 'game-card' + (bothScored ? ' scored' : '');

      // ── Away side ──
      var awaySide = document.createElement('div');
      awaySide.className = 'team-side away';

      var awayName = document.createElement('div');
      awayName.className = 'team-label';
      awayName.textContent = game.away;

      var awayScores = document.createElement('div');
      awayScores.className = 'score-pair';

      var awayIn1 = document.createElement('input');
      awayIn1.className = 'score-input'; awayIn1.type = 'number';
      awayIn1.min = '0'; awayIn1.max = '99'; awayIn1.placeholder = 'G1';
      awayIn1.id = 'away1-' + game.id;
      if (scored1) awayIn1.value = game.awayScore;

      var awayIn2 = document.createElement('input');
      awayIn2.className = 'score-input'; awayIn2.type = 'number';
      awayIn2.min = '0'; awayIn2.max = '99'; awayIn2.placeholder = 'G2';
      awayIn2.id = 'away2-' + game.id;
      if (scored2) awayIn2.value = game.awayScore2;

      awayScores.appendChild(awayIn1);
      awayScores.appendChild(awayIn2);
      awaySide.appendChild(awayName);
      awaySide.appendChild(awayScores);

      // ── Middle ──
      var middle = document.createElement('div');
      middle.className = 'vs-badge';

      var vsText = document.createElement('div');
      vsText.textContent = 'VS';

      var g1label = document.createElement('div');
      g1label.className = 'game-num-label';
      g1label.textContent = 'G1';

      var g2label = document.createElement('div');
      g2label.className = 'game-num-label';
      g2label.textContent = 'G2';

      var saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'save-btn';
      saveBtn.id = 'btn-' + game.id;
      saveBtn.textContent = 'Save';
      if (bothScored) saveBtn.style.display = 'none';

      var savedLabel = document.createElement('div');
      savedLabel.className = 'saved-label';
      savedLabel.id = 'saved-' + game.id;
      savedLabel.textContent = bothScored ? '✓ saved' : '';
      savedLabel.style.display = bothScored ? 'block' : 'none';

      middle.appendChild(vsText);
      middle.appendChild(g1label);
      middle.appendChild(g2label);
      middle.appendChild(saveBtn);
      middle.appendChild(savedLabel);

      // ── Home side ──
      var homeSide = document.createElement('div');
      homeSide.className = 'team-side';

      var homeName = document.createElement('div');
      homeName.className = 'team-label';
      homeName.textContent = game.home;

      var homeScores = document.createElement('div');
      homeScores.className = 'score-pair';

      var homeIn1 = document.createElement('input');
      homeIn1.className = 'score-input'; homeIn1.type = 'number';
      homeIn1.min = '0'; homeIn1.max = '99'; homeIn1.placeholder = 'G1';
      homeIn1.id = 'home1-' + game.id;
      if (scored1) homeIn1.value = game.homeScore;

      var homeIn2 = document.createElement('input');
      homeIn2.className = 'score-input'; homeIn2.type = 'number';
      homeIn2.min = '0'; homeIn2.max = '99'; homeIn2.placeholder = 'G2';
      homeIn2.id = 'home2-' + game.id;
      if (scored2) homeIn2.value = game.homeScore2;

      homeScores.appendChild(homeIn1);
      homeScores.appendChild(homeIn2);
      homeSide.appendChild(homeName);
      homeSide.appendChild(homeScores);

      card.appendChild(awaySide);
      card.appendChild(middle);
      card.appendChild(homeSide);

      // Save click
      (function(gid, btn, lbl) {
        btn.addEventListener('click', function() {
          var h1 = parseInt(document.getElementById('home1-' + gid).value);
          var a1 = parseInt(document.getElementById('away1-' + gid).value);
          var h2 = parseInt(document.getElementById('home2-' + gid).value);
          var a2 = parseInt(document.getElementById('away2-' + gid).value);
          if (isNaN(h1) || isNaN(a1) || isNaN(h2) || isNaN(a2)) {
            showToast('Enter all 4 scores first'); return;
          }
          doSaveScore(gid, h1, a1, h2, a2, btn, lbl);
        });
      })(game.id, saveBtn, savedLabel);

      // Re-show save on any input change
      [homeIn1, homeIn2, awayIn1, awayIn2].forEach(function(inp) {
        inp.addEventListener('input', function() {
          saveBtn.style.display = 'inline-block';
          savedLabel.style.display = 'none';
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save';
        });
      });

      div.appendChild(card);
    });

    container.appendChild(div);
  });
}

// ── CONFIG ───────────────────────────────────────────────────
function saveConfig() {
  SCRIPT_URL = document.getElementById('scriptUrl').value.trim();
  localStorage.setItem('cssa_script_url', SCRIPT_URL);
  document.getElementById('configStatus').textContent = 'Saved. Reload to reconnect.';
  showToast('Config saved!');
}

function testConnection() {
  var url = document.getElementById('scriptUrl').value.trim();
  var status = document.getElementById('configStatus');
  status.textContent = 'Testing...';
  fetch(url + '?action=ping')
    .then(function(r) { return r.json(); })
    .then(function(data) { status.textContent = data.ok ? '✓ Connected!' : '✗ Script error.'; })
    .catch(function() { status.textContent = '✗ Could not connect.'; });
}

// ── TOAST ────────────────────────────────────────────────────
var toastTimer;
function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function() { t.classList.remove('show'); }, 2500);
}

// ── WIRE UP ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('authEnterBtn').addEventListener('click', checkAuth);
  document.getElementById('passcodeInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') checkAuth();
  });
  document.getElementById('navStandings').addEventListener('click', function() { showView('standings'); });
  document.getElementById('navSchedule').addEventListener('click', function() { showView('schedule'); });
  document.getElementById('navAdmin').addEventListener('click', function() { showView('admin'); });
  document.getElementById('saveConfigBtn').addEventListener('click', saveConfig);
  document.getElementById('testConnectionBtn').addEventListener('click', testConnection);
});
