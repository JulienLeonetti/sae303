export class App {
  static async initDataLoader(dataLoader) {
    const paths = [
      { matches: 'data/csvjson.json', stats: 'data/csvjson (1).json' },
      { matches: '../data/csvjson.json', stats: '../data/csvjson (1).json' },
      { matches: '../../data/csvjson.json', stats: '../../data/csvjson (1).json' },
      { matches: '/data/csvjson.json', stats: '/data/csvjson (1).json' }
    ];

    for (const path of paths) {
      try {
        const success = await dataLoader.load(path.matches, path.stats);
        if (success && dataLoader.getTotalMatches() > 0) {
          console.log('Data loaded successfully from:', path);
          return true;
        }
      } catch (e) {
        console.log('Failed to load from:', path);
      }
    }

    console.error('Failed to load data from any path');
    return false;
  }

  static async detectDataLocation() {
    const locations = [
      'data/csvjson.json',
      '../data/csvjson.json',
      '../../data/csvjson.json',
      '/data/csvjson.json'
    ];

    for (const loc of locations) {
      try {
        const response = await fetch(loc);
        if (response.ok) {
          return loc.replace('csvjson.json', '');
        }
      } catch (e) {
      }
    }

    return null;
  }
}

export default App;
