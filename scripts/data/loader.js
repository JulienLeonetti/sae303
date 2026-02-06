export class DataLoader {
  constructor() {
    this.matches = [];
    this.teamStats = [];
    this.rawTeamStats = [];
    this.seasons = new Set();
    this.teams = new Set();
    this.isLoaded = false;
    this.metricKeys = [];
    this.metricOptions = [];
    this.metricLabelMap = this.buildMetricLabelMap();
  }

  async load(matchesPath = '/data/csvjson.json', statsPath = '/data/csvjson (1).json') {
    this.matches = [];
    this.teamStats = [];
    this.seasons = new Set();
    this.teams = new Set();
    this.isLoaded = false;

    try {
      console.log('[DataLoader] Loading data from:', matchesPath, statsPath);

      let matchesData, statsData;

      try {
        matchesData = await this.fetchJSON(matchesPath);
      } catch (e) {
        console.warn('[DataLoader] Failed with absolute path, trying relative:', matchesPath);
        matchesData = await this.fetchJSON(matchesPath.replace(/^\//, ''));
      }

      try {
        statsData = await this.fetchJSON(statsPath);
      } catch (e) {
        console.warn('[DataLoader] Failed with absolute path, trying relative:', statsPath);
        statsData = await this.fetchJSON(statsPath.replace(/^\//, ''));
      }

      console.log('[DataLoader] Matches loaded:', Array.isArray(matchesData) ? matchesData.length : 0);
      if (matchesData && matchesData.length > 0) {
        console.log('[DataLoader] Sample matches:', matchesData.slice(0, 2));
      }

      console.log('[DataLoader] Stats loaded:', Array.isArray(statsData) ? statsData.length : 0);
      if (statsData && statsData.length > 0) {
        console.log('[DataLoader] Sample stats:', statsData.slice(0, 2));
      }

      this.detectAndNormalize(matchesData, statsData);
      this.isLoaded = true;
      
      console.log('[DataLoader] Data loaded successfully! Seasons:', Array.from(this.seasons), 'Teams:', this.teams.size);
      return true;
    } catch (error) {
      console.error('[DataLoader] Failed to load data:', error.message);
      console.error('[DataLoader] Stack:', error.stack);
      return false;
    }
  }

  async fetchJSON(path) {
    try {
      const response = await fetch(path);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${response.url}`);
      }
      
      const json = await response.json();
      console.log('[DataLoader] Fetched:', response.url, '- Status:', response.status);
      return json;
    } catch (error) {
      throw new Error(`Failed to load ${path}: ${error.message}`);
    }
  }

  detectAndNormalize(rawMatches, rawStats) {
    if (Array.isArray(rawMatches)) {
      this.matches = rawMatches.map(m => this.normalizeMatch(m));
    } else if (rawMatches.matches && Array.isArray(rawMatches.matches)) {
      this.matches = rawMatches.matches.map(m => this.normalizeMatch(m));
    }

    if (Array.isArray(rawStats)) {
      this.rawTeamStats = rawStats;
      this.teamStats = rawStats.map(s => this.normalizeStats(s));
    } else if (rawStats && rawStats.team_stats && Array.isArray(rawStats.team_stats)) {
      this.rawTeamStats = rawStats.team_stats;
      this.teamStats = rawStats.team_stats.map(s => this.normalizeStats(s));
    } else if (rawStats && rawStats.stats && Array.isArray(rawStats.stats)) {
      this.rawTeamStats = rawStats.stats;
      this.teamStats = rawStats.stats.map(s => this.normalizeStats(s));
    } else {
      this.rawTeamStats = [];
      this.teamStats = [];
    }

    this.matches.forEach(m => {
      if (m.season) this.seasons.add(m.season);
      if (m.homeTeam) this.teams.add(m.homeTeam);
      if (m.awayTeam) this.teams.add(m.awayTeam);
    });

    this.teamStats.forEach(s => {
      if (s.season) this.seasons.add(s.season);
      if (s.team) this.teams.add(s.team);
    });

    this.metricKeys = this.extractMetricKeys(this.rawTeamStats);
    this.metricOptions = this.sortMetricOptions(this.metricKeys);

    console.log('[DataLoader] Normalized:', this.matches.length, 'matches,', this.teamStats.length, 'stats');
    console.log('[DataLoader] Seasons extracted:', Array.from(this.seasons).sort());
  }

  normalizeMatch(m) {
    const homeGoals = Number(m.home_goals !== undefined ? m.home_goals : (m.homeGoals || 0));
    const awayGoals = Number(m.away_goals !== undefined ? m.away_goals : (m.awayGoals || 0));
    
    return {
      homeTeam: m.home_team || m.homeTeam || '',
      awayTeam: m.away_team || m.awayTeam || '',
      homeGoals: isNaN(homeGoals) ? 0 : homeGoals,
      awayGoals: isNaN(awayGoals) ? 0 : awayGoals,
      result: m.result || '',
      season: m.season || ''
    };
  }

  normalizeStats(s) {
    const stats = {
      team: s.team || s.name || '',
      season: s.season || ''
    };

    Object.keys(s || {}).forEach((key) => {
      if (key === 'team' || key === 'season' || key === 'name') return;
      stats[key] = this.toNum(s[key]);
    });

    return stats;
  }

  toNum(val) {
    if (val === '' || val == null) return 0;
    const n = parseFloat(val);
    return !isNaN(n) ? n : 0;
  }

  isNumericValue(val) {
    if (val === '' || val == null) return false;
    if (typeof val === 'number') return Number.isFinite(val);
    const n = parseFloat(String(val).replace(',', '.'));
    return Number.isFinite(n);
  }

  extractMetricKeys(rawStats) {
    const excluded = new Set([
      'team',
      'season',
      'name',
      'club',
      'id',
      'logo',
      'crest',
      'badge',
      'team_id',
      'club_id',
      'squad',
      'position',
      'rank'
    ]);
    const keys = new Set();

    (rawStats || []).forEach((row) => {
      Object.keys(row || {}).forEach((key) => {
        if (excluded.has(key)) return;
        if (this.isNumericValue(row[key])) {
          keys.add(key);
        }
      });
    });

    return Array.from(keys);
  }

  sortMetricOptions(metricKeys) {
    const priority = [
      'points',
      'wins',
      'draws',
      'losses',
      'goals',
      'goals_for',
      'goalsFor',
      'goals_against',
      'goalsAgainst',
      'goals_conceded',
      'goal_difference',
      'goalDifference'
    ];
    const priorityMap = new Map(priority.map((key, index) => [key, index]));

    return (metricKeys || [])
      .map((key) => ({ key, label: this.getMetricLabel(key) }))
      .sort((a, b) => {
        const pa = priorityMap.has(a.key) ? priorityMap.get(a.key) : Number.POSITIVE_INFINITY;
        const pb = priorityMap.has(b.key) ? priorityMap.get(b.key) : Number.POSITIVE_INFINITY;
        if (pa !== pb) return pa - pb;
        return a.label.localeCompare(b.label, 'fr');
      });
  }

  buildMetricLabelMap() {
    return {
      points: 'Points',
      wins: 'Victoires',
      draws: 'Nuls',
      losses: 'Défaites',
      goals: 'Buts marqués',
      goals_for: 'Buts marqués',
      goalsAgainst: 'Buts concédés',
      goals_against: 'Buts concédés',
      goals_conceded: 'Buts concédés',
      goal_difference: 'Différence de buts',
      goalDifference: 'Différence de buts',
      total_scoring_att: 'Tirs',
      ontarget_scoring_att: 'Tirs cadrés',
      total_pass: 'Passes totales',
      total_tackle: 'Tacles',
      clean_sheet: 'Clean sheets',
      total_yel_card: 'Cartons jaunes',
      total_red_card: 'Cartons rouges',
      hit_woodwork: 'Poteaux',
      att_hd_goal: 'Buts de la tête',
      att_pen_goal: 'Buts sur penalty',
      att_freekick_goal: 'Buts sur coup franc',
      att_ibox_goal: 'Buts dans la surface',
      att_obox_goal: 'Buts hors surface',
      goal_fastbreak: 'Buts en contre',
      total_offside: 'Hors-jeu',
      saves: 'Arrêts',
      outfielder_block: 'Contres',
      interception: 'Interceptions',
      last_man_tackle: 'Tacles du dernier défenseur',
      total_clearance: 'Dégagements',
      head_clearance: 'Dégagements de la tête',
      own_goals: 'Buts contre son camp',
      penalty_conceded: 'Penalties concédés',
      pen_goals_conceded: 'Buts encaissés sur penalty',
      total_through_ball: 'Passes en profondeur',
      total_long_balls: 'Passes longues',
      backward_pass: 'Passes en retrait',
      total_cross: 'Centres',
      corner_taken: 'Corners',
      touches: 'Touches',
      big_chance_missed: 'Grosses occasions manquées',
      clearance_off_line: 'Sauvetages sur la ligne',
      dispossessed: 'Ballons perdus',
      penalty_save: 'Penalties arrêtés',
      total_high_claim: 'Prises de balle en hauteur',
      punches: 'Dégagements au poing'
    };
  }

  getMetricLabel(key) {
    if (!key) return '';
    if (this.metricLabelMap && this.metricLabelMap[key]) return this.metricLabelMap[key];
    return this.humanizeMetricKey(key);
  }

  humanizeMetricKey(key) {
    return String(key)
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  getMetricOptions() {
    return Array.isArray(this.metricOptions) ? this.metricOptions.slice() : [];
  }

  getSeasons() {
    return Array.from(this.seasons).sort();
  }

  getTeams(season = null) {
    if (!season) return Array.from(this.teams).sort();
    
    const seasonTeams = new Set();
    this.matches.forEach(m => {
      if (m.season === season) {
        seasonTeams.add(m.homeTeam);
        seasonTeams.add(m.awayTeam);
      }
    });
    return Array.from(seasonTeams).sort();
  }

  getMatchesBySeason(season) {
    return this.matches.filter(m => m.season === season);
  }

  getMatchesByTeamAndSeason(team, season) {
    return this.matches.filter(m =>
      m.season === season && (m.homeTeam === team || m.awayTeam === team)
    );
  }

  getStatsByTeamAndSeason(team, season) {
    return this.teamStats.find(s => s.team === team && s.season === season) || null;
  }

  getStandingsBySeason(season, mode = 'global') {
    const standings = {};
    const matches = this.getMatchesBySeason(season);

    matches.forEach(m => {
      if (!standings[m.homeTeam]) standings[m.homeTeam] = this.initTeamRecord();
      if (!standings[m.awayTeam]) standings[m.awayTeam] = this.initTeamRecord();

      const home = standings[m.homeTeam];
      const away = standings[m.awayTeam];

      home.gf += m.homeGoals;
      home.ga += m.awayGoals;
      home.mj++;

      away.gf += m.awayGoals;
      away.ga += m.homeGoals;
      away.mj++;

      if (m.homeGoals > m.awayGoals) {
        home.v++;
        home.pts += 3;
        away.d++;
      } else if (m.homeGoals < m.awayGoals) {
        away.v++;
        away.pts += 3;
        home.d++;
      } else {
        home.n++;
        home.pts += 1;
        away.n++;
        away.pts += 1;
      }
    });

    if (mode === 'home') {
      Object.keys(standings).forEach(team => {
        const home = standings[team];
        const away = this.initTeamRecord();
        standings[team] = home;
      });
    } else if (mode === 'away') {
      const awayStandings = {};
      matches.forEach(m => {
        if (!awayStandings[m.homeTeam]) awayStandings[m.homeTeam] = this.initTeamRecord();
        if (!awayStandings[m.awayTeam]) awayStandings[m.awayTeam] = this.initTeamRecord();

        const home = awayStandings[m.homeTeam];
        const away = awayStandings[m.awayTeam];

      });
    }

    return this.sortStandings(standings);
  }

  sortStandings(standings) {
    return Object.entries(standings)
      .map(([team, record]) => ({
        team,
        ...record,
        diff: record.gf - record.ga
      }))
      .sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.diff !== a.diff) return b.diff - a.diff;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return a.team.localeCompare(b.team);
      });
  }

  initTeamRecord() {
    return {
      mj: 0,
      v: 0,
      n: 0,
      d: 0,
      gf: 0,
      ga: 0,
      pts: 0
    };
  }

  getTeamSeasons(team) {
    const seasons = new Set();
    this.matches.forEach(m => {
      if (m.homeTeam === team || m.awayTeam === team) {
        seasons.add(m.season);
      }
    });
    return Array.from(seasons).sort();
  }

  getTotalMatchesByTeam(team) {
    return this.matches.filter(m =>
      m.homeTeam === team || m.awayTeam === team
    ).length;
  }

  getTotalGoalsBySeason(season) {
    return this.getMatchesBySeason(season).reduce((acc, m) =>
      acc + m.homeGoals + m.awayGoals, 0
    );
  }

  getTotalMatches() {
    return this.matches.length;
  }

  getTotalGoals() {
    return this.matches.reduce((acc, m) =>
      acc + m.homeGoals + m.awayGoals, 0
    );
  }

  getTotalTeams() {
    return this.teams.size;
  }

  getTotalSeasons() {
    return this.seasons.size;
  }
}

export const dataLoader = new DataLoader();
