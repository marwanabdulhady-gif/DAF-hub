/**
 * Standalone Single-File HTML Exporter
 * Bundles the ActivityEngine runtime and activity JSON configuration into an offline HTML deliverable.
 */
class ActivityExporter {
  static async exportToHtml(activityConfig, fileName = 'activity-game.html') {
    // Fetch or inline CSS and JS
    let cssContent = '';
    let soundContent = '';
    let particleContent = '';
    let engineContent = '';

    try {
      const [resCss, resSound, resParticle, resEngine] = await Promise.all([
        fetch('css/activity-engine.css').then(r => r.text()),
        fetch('js/sound-synth.js').then(r => r.text()),
        fetch('js/particles.js').then(r => r.text()),
        fetch('js/activity-engine.js').then(r => r.text())
      ]);
      cssContent = resCss;
      soundContent = resSound;
      particleContent = resParticle;
      engineContent = resEngine;
    } catch (e) {
      console.warn('Exporter fetching inline resources, fallbacking if embedded:', e);
    }

    const configJson = JSON.stringify(activityConfig, null, 2);

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${activityConfig.title || 'Interactive Activity Game'}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #game-container {
      width: 100%;
      max-width: 1100px;
      margin: 20px auto;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      border-radius: 24px;
      overflow: hidden;
    }
    ${cssContent}
  </style>
</head>
<body>
  <div id="game-container"></div>

  <script>
    ${soundContent}
  </script>
  <script>
    ${particleContent}
  </script>
  <script>
    ${engineContent}
  </script>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const config = ${configJson};
      const game = new ActivityEngine('#game-container', {
        theme: config.theme || 'default',
        sound: true
      });
      game.load(config);
    });
  </script>
</body>
</html>`;

    // Download blob
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return fullHtml;
  }
}

window.ActivityExporter = ActivityExporter;
