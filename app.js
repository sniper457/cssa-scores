// ── CONFIG ───────────────────────────────────────────────────
var DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxXgVMUtvVtIlzVs1qh8c7Y-3RBNLWxERbbJqqa0yK5MLYQkH9oHIY73ybrN0zzj9gA/exec';
var SCRIPT_URL = localStorage.getItem('cssa_script_url') || DEFAULT_SCRIPT_URL;
var PASSCODE   = 'blanco';

// ── DEMO DATA ────────────────────────────────────────────────
var DEMO_TEAMS = ['Sluggers','Dirt Bags','Diamond Dogs','The Bench','Fly Ballers',
                  'Iron Mitts','Bases Loaded','Mudcats','The Naturals','Home Plates'];

var DEMO_SCHEDULE = (function() {
  var games = [], id = 1;
  for (var week = 1; week <= 10; week++) {
    for (var g = 0; g < 5; g++) {
      games.push({
        id: id++, week: week,
        home: DEMO_TEAMS[g * 2],
        away: DEMO_TEAMS[g * 2 + 1],
        homeScore: week < 4 ? Math.floor(Math.random()*10)+2 : null,
        awayScore: week < 4 ? Math.floor(Math.random()*10)+2 : null
      });
    }
  }
  return games;
})();

// ── AUTH ─────────────────────────────────────────────────────
function checkAuth() {
  var val = document.getElementById('passcodeInput').value.trim();
  if (!val) {
    document.getElementById('authError').textContent = 'Enter a passcode.';
    return;
  }
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
  if (SCRIPT_URL) {
    fetchData();
  } else {
    renderDemoStandings();
    renderDemoSchedule();
  }
}

// ── FETCH ─────────────────────────────────────────────────────
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

function doSaveScore(gameId, homeScore, awayScore, btn, savedLabel) {
  btn.disabled = true;
  btn.textContent = 'Saving...';

  if (!SCRIPT_URL) {
    var game = DEMO_SCHEDULE.find(function(g) { return g.id === gameId; });
    if (game) { game.homeScore = homeScore; game.awayScore = awayScore; }
    btn.style.display = 'none';
    savedLabel.style.display = 'block';
    renderDemoStandings();
    showToast('Score saved (demo)');
    return;
  }

  var url = SCRIPT_URL + '?action=saveScore&passcode=' + encodeURIComponent(PASSCODE) +
            '&gameId=' + encodeURIComponent(gameId) +
            '&homeScore=' + encodeURIComponent(homeScore) +
            '&awayScore=' + encodeURIComponent(awayScore);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) {
        btn.style.display = 'none';
        savedLabel.style.display = 'block';
        fetchData();
        showToast('Score saved!');
      } else {
        btn.disabled = false;
        btn.textContent = 'Save';
        showToast('Error saving score');
      }
    })
    .catch(function() {
      btn.disabled = false;
      btn.textContent = 'Save';
      showToast('Network error');
    });
}

// ── STANDINGS ─────────────────────────────────────────────────
function calcStandings(games) {
  var teams = {};
  games.forEach(function(g) {
    [g.home, g.away].forEach(function(t) {
      if (!teams[t]) teams[t] = { name: t, w: 0, l: 0, rs: 0, ra: 0 };
    });
    if (g.homeScore !== null && g.awayScore !== null) {
      var h = teams[g.home], a = teams[g.away];
      h.rs += g.homeScore; h.ra += g.awayScore;
      a.rs += g.awayScore; a.ra += g.homeScore;
      if (g.homeScore > g.awayScore) { h.w++; a.l++; }
      else if (g.awayScore > g.homeScore) { a.w++; h.l++; }
      else { h.w += 0.5; a.w += 0.5; }
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

// ── SCHEDULE ──────────────────────────────────────────────────
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
      var scored = game.homeScore !== null && game.awayScore !== null;
      var card = document.createElement('div');
      card.className = 'game-card' + (scored ? ' scored' : '');

      // Away side
      var awaySide = document.createElement('div');
      awaySide.className = 'team-side away';
      var awayLabel = document.createElement('div');
      awayLabel.className = 'team-label';
      awayLabel.textContent = game.away;
      var awayInput = document.createElement('input');
      awayInput.className = 'score-input';
      awayInput.type = 'number';
      awayInput.min = '0'; awayInput.max = '99';
      awayInput.placeholder = '—';
      awayInput.id = 'away-' + game.id;
      if (game.awayScore !== null) awayInput.value = game.awayScore;
      awaySide.appendChild(awayLabel);
      awaySide.appendChild(awayInput);

      // VS middle
      var vsBadge = document.createElement('div');
      vsBadge.className = 'vs-badge';
      var vsText = document.createElement('div');
      vsText.textContent = 'VS';
      var saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'save-btn';
      saveBtn.id = 'btn-' + game.id;
      saveBtn.textContent = 'Save';
      if (scored) saveBtn.style.display = 'none';
      var savedLabel = document.createElement('div');
      savedLabel.className = 'saved-label';
      savedLabel.id = 'saved-' + game.id;
      savedLabel.textContent = scored ? '✓ saved' : '';
      savedLabel.style.display = scored ? 'block' : 'none';
      vsBadge.appendChild(vsText);
      vsBadge.appendChild(saveBtn);
      vsBadge.appendChild(savedLabel);

      // Home side
      var homeSide = document.createElement('div');
      homeSide.className = 'team-side';
      var homeLabel = document.createElement('div');
      homeLabel.className = 'team-label';
      homeLabel.textContent = game.home;
      var homeInput = document.createElement('input');
      homeInput.className = 'score-input';
      homeInput.type = 'number';
      homeInput.min = '0'; homeInput.max = '99';
      homeInput.placeholder = '—';
      homeInput.id = 'home-' + game.id;
      if (game.homeScore !== null) homeInput.value = game.homeScore;
      homeSide.appendChild(homeLabel);
      homeSide.appendChild(homeInput);

      card.appendChild(awaySide);
      card.appendChild(vsBadge);
      card.appendChild(homeSide);

      // Save button click
      (function(gid, btn, lbl) {
        btn.addEventListener('click', function() {
          var hs = parseInt(document.getElementById('home-' + gid).value);
          var as = parseInt(document.getElementById('away-' + gid).value);
          if (isNaN(hs) || isNaN(as)) { showToast('Enter both scores first'); return; }
          doSaveScore(gid, hs, as, btn, lbl);
        });
      })(game.id, saveBtn, savedLabel);

      // Re-show save btn on input change
      [homeInput, awayInput].forEach(function(inp) {
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

// ── CONFIG ────────────────────────────────────────────────────
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
    .then(function(data) {
      status.textContent = data.ok ? '✓ Connected!' : '✗ Script error.';
    })
    .catch(function() {
      status.textContent = '✗ Could not connect. Check URL and deploy settings.';
    });
}

// ── TOAST ─────────────────────────────────────────────────────
var toastTimer;
function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function() { t.classList.remove('show'); }, 2500);
}

// ── WIRE UP EVENTS ────────────────────────────────────────────
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
