import { spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DEFAULT_URL = 'http://127.0.0.1:4201/';
const DEFAULT_DURATION_MS = 45000;
const DEFAULT_VIEWPORT = '1280x720';
const DEFAULT_PORT = 9451;
const AUTO_PORT = 9300 + (process.pid % 400);

const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browserPath = process.env.BROWSER_PATH || firstExisting([chromePath, edgePath]);
const cliOptions = parseCliOptions(process.argv.slice(2));

if (!browserPath) {
  throw new Error('No supported browser found. Set BROWSER_PATH to a Chromium-compatible executable.');
}

const durationMs = durationOption(cliOptions.duration, 'PERF_DURATION_MS', DEFAULT_DURATION_MS);
const port = numberOption(cliOptions.port, 'PERF_CDP_PORT', process.env.PERF_CDP_PORT ? DEFAULT_PORT : AUTO_PORT);
const cpuRate = numberOption(cliOptions.cpuRate, 'PERF_CPU_RATE', 1);
const viewport = parseViewport(viewportOption(cliOptions.viewport, process.env.PERF_VIEWPORT || DEFAULT_VIEWPORT));
const invulnerable = booleanOption(cliOptions.invulnerable ?? cliOptions.testInvulnerable, 'PERF_INVULNERABLE');
const expectedBuild = cliOptions.expectBuild || process.env.PERF_EXPECT_BUILD || '';
const requiredBossVariant = numberOption(cliOptions.requireBossVariant, 'PERF_REQUIRE_BOSS_VARIANT', 0);
const requiredBossPhase = numberOption(cliOptions.requireBossPhase, 'PERF_REQUIRE_BOSS_PHASE', 0);
const disableGpu = booleanOption(cliOptions.disableGpu, 'PERF_DISABLE_GPU');
const baseUrl = cliOptions.url || process.env.PERF_URL || DEFAULT_URL;
const verify = cliOptions.verify || process.env.PERF_VERIFY || `perf-${Date.now()}`;
const targetUrl = withPerfParams(baseUrl, verify, invulnerable);
const userDataDir = join(tmpdir(), `stormraider-perf-${port}-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`);

safeRm(userDataDir);

const browserArgs = [
  '--headless=new',
  '--mute-audio',
  '--ignore-gpu-blocklist',
  '--enable-gpu-rasterization',
  '--enable-zero-copy',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--remote-debugging-address=127.0.0.1',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  `--window-size=${viewport.width},${viewport.height}`,
  targetUrl
];

if (disableGpu) {
  browserArgs.splice(1, 0, '--disable-gpu');
}

const browser = spawn(browserPath, browserArgs, { stdio: 'ignore' });

try {
  const tab = await waitForTab(port, targetUrl);
  const cdp = await connect(tab.webSocketDebuggerUrl);
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await sleep(1200);
  if (cpuRate > 1) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuRate });
  }

  await clickStart(cdp);
  const result = await sampleRun(cdp, durationMs);
  cdp.close();

  console.log(JSON.stringify(result, null, 2));

  if (result.bootError) {
    process.exitCode = 1;
  }
  if (expectedBuild && result.build !== expectedBuild) {
    console.error(`Expected build ${expectedBuild}, got ${result.build}`);
    process.exitCode = 1;
  }
  if ((requiredBossVariant > 0 || requiredBossPhase > 0) && !hasSeenBossState(result, requiredBossVariant, requiredBossPhase)) {
    console.error(`Expected to sample boss variant ${requiredBossVariant || '*'} phase >= ${requiredBossPhase || 1}.`);
    process.exitCode = 1;
  }
} finally {
  browser.kill();
  safeRm(userDataDir);
}

function safeRm(path) {
  try {
    rmSync(path, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 });
  } catch {
    // Chromium can briefly hold profile files on Windows; stale temp profiles are harmless.
  }
}

function parseCliOptions(args) {
  const options = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith('--')) {
      continue;
    }
    const [rawKey, inlineValue] = arg.slice(2).split('=', 2);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const nextValue = inlineValue ?? (args[i + 1]?.startsWith('--') ? undefined : args[i + 1]);
    if (inlineValue == null && nextValue != null && !args[i + 1]?.startsWith('--')) {
      i += 1;
    }
    options[key] = nextValue ?? '1';
  }
  return options;
}

function numberOption(cliValue, envName, fallback) {
  if (cliValue != null) {
    const value = Number(cliValue);
    return Number.isFinite(value) ? value : fallback;
  }
  return numberEnv(envName, fallback);
}

function durationOption(cliValue, envName, fallback) {
  if (cliValue != null) {
    const value = Number(cliValue);
    return Number.isFinite(value) ? Math.round(value * 1000) : fallback;
  }
  return numberEnv(envName, fallback);
}

function booleanOption(cliValue, envName) {
  if (cliValue != null) {
    return cliValue === '1' || cliValue === 'true';
  }
  return process.env[envName] === '1';
}

function viewportOption(value, fallback) {
  if (value === 'mobile') {
    return '390x844';
  }
  if (value === 'desktop') {
    return DEFAULT_VIEWPORT;
  }
  return value || fallback;
}

function firstExisting(paths) {
  return paths.find((path) => existsSync(path)) || '';
}

function numberEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function parseViewport(value) {
  const match = /^(\d+)x(\d+)$/i.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid PERF_VIEWPORT "${value}". Use WIDTHxHEIGHT, for example 390x844.`);
  }
  return { width: Number(match[1]), height: Number(match[2]) };
}

function hasSeenBossState(result, requiredVariant, requiredPhase) {
  const samples = [...(result.seenBossStates || []), result.finalBoss].filter(Boolean);
  return samples.some((sample) => {
    const [active, variant, phase] = sample.split('/').map((part) => Number(part) || 0);
    if (active !== 1) {
      return false;
    }
    if (requiredVariant > 0 && variant !== requiredVariant) {
      return false;
    }
    return phase >= Math.max(1, requiredPhase);
  });
}

function withPerfParams(baseUrl, verify, invulnerable) {
  const url = new URL(baseUrl);
  url.searchParams.set('verify', verify);
  if (invulnerable) {
    url.searchParams.set('testInvulnerable', '1');
  }
  return url.toString();
}

async function waitForTab(port, targetUrl) {
  const deadline = Date.now() + 10000;
  const expected = new URL(targetUrl);
  while (Date.now() < deadline) {
    try {
      const tabs = await fetchJson(port, '/json/list');
      const tab =
        tabs.find((item) => item.type === 'page' && isTargetTab(item.url, expected)) ??
        tabs.find((item) => item.type === 'page' && item.url.includes('127.0.0.1')) ??
        tabs.find((item) => item.type === 'page') ??
        tabs[0];
      if (tab?.webSocketDebuggerUrl) {
        return tab;
      }
    } catch {
      // Browser is still starting.
    }
    await sleep(150);
  }
  throw new Error('CDP tab not available.');
}

function isTargetTab(tabUrl, expected) {
  try {
    const url = new URL(tabUrl);
    return url.origin === expected.origin && url.pathname === expected.pathname;
  } catch {
    return false;
  }
}

async function fetchJson(port, path) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`);
  if (!response.ok) {
    throw new Error(`CDP HTTP ${response.status}`);
  }
  return response.json();
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    let id = 0;

    ws.addEventListener('open', () => {
      resolve({
        send(method, params = {}) {
          const callId = ++id;
          ws.send(JSON.stringify({ id: callId, method, params }));
          return new Promise((res, rej) => pending.set(callId, { res, rej, method }));
        },
        close() {
          ws.close();
        }
      });
    });

    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !pending.has(message.id)) {
        return;
      }

      const entry = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) {
        entry.rej(new Error(`${entry.method}: ${message.error.message}`));
      } else {
        entry.res(message.result);
      }
    });

    ws.addEventListener('error', reject);
  });
}

async function clickStart(cdp) {
  await waitForStartButton(cdp);
  const rectResult = await evaluateRetry(cdp, {
    expression: `(() => {
      const r = document.querySelector('#start-run')?.getBoundingClientRect();
      return r ? JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 }) : '';
    })()`,
    returnByValue: true
  });
  const rect = JSON.parse(rectResult.result.value || '{}');
  if (!Number.isFinite(rect.x) || !Number.isFinite(rect.y)) {
    throw new Error('Start button rect missing.');
  }

  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
  await sleep(250);
  const modeAfterPointer = await readGameMode(cdp);
  if (modeAfterPointer && modeAfterPointer !== 'ready') {
    return;
  }

  await cdp.send('Runtime.evaluate', {
    expression: `document.querySelector('#start-run')?.click()`,
    returnByValue: true
  });
  await waitForGameStart(cdp);
}

async function waitForStartButton(cdp) {
  const deadline = Date.now() + 20000;
  const buildReadyCheck = expectedBuild
    ? `document.querySelector('#build-badge')?.textContent === ${JSON.stringify(expectedBuild)}`
    : `document.querySelector('#build-badge')?.textContent !== 'BUILD'`;
  while (Date.now() < deadline) {
    const exists = await evaluateRetry(cdp, {
      expression: `Boolean(document.querySelector('#start-run')) && document.documentElement.dataset.gameMode === 'ready' && (${buildReadyCheck})`,
      returnByValue: true
    });
    if (exists.result.value === true) {
      return;
    }
    await sleep(150);
  }
  throw new Error('Start button missing.');
}

async function waitForGameStart(cdp) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const mode = await readGameMode(cdp);
    if (mode && mode !== 'ready') {
      return;
    }
    await sleep(100);
  }
  throw new Error('Start button did not enter gameplay.');
}

async function readGameMode(cdp) {
  const result = await cdp.send('Runtime.evaluate', {
    expression: `document.documentElement.dataset.gameMode || ''`,
    returnByValue: true
  });
  return result.result.value || '';
}

async function sampleRun(cdp, durationMs) {
  const expression = `new Promise(resolve => {
    const intervals = [];
    const warmIntervals = [];
    const tiers = [];
    const details = [];
    const loads = [];
    const survival = [];
    const bossSamples = [];
    const slowFrames = [];
    let last = 0;
    let moveRight = true;
    const offenseUpgrades = new Set(['spread', 'damage', 'rapid', 'velocity', 'pierce', 'heavy', 'fork', 'chain', 'wing', 'surge', 'critical']);
    const chooseTimer = setInterval(() => {
      const options = Array.from(document.querySelectorAll('.upgrade-panel__option'));
      const ultra = options.find((option) => option.classList.contains('upgrade-panel__option--ultra'));
      const offense = options.find((option) => offenseUpgrades.has(option.dataset.upgradeId || ''));
      (ultra || offense || options[0])?.click();
    }, 140);
    const skillTimer = setInterval(() => {
      document.querySelector('#skill-shock')?.click();
      document.querySelector('#skill-burst')?.click();
      document.querySelector('#skill-missile')?.click();
      document.querySelector('#skill-bomb')?.click();
    }, 850);
    const moveTimer = setInterval(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: moveRight ? 'KeyA' : 'KeyD' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { code: moveRight ? 'KeyD' : 'KeyA' }));
      moveRight = !moveRight;
    }, 620);
    const started = Date.now();
    function frame(t) {
      const age = Date.now() - started;
      if (last > 0) {
        const interval = t - last;
        intervals.push(interval);
        if (age > 5000) {
          warmIntervals.push(interval);
        }
        if (interval > 33.4) {
          slowFrames.push({
            ms: Math.round(interval),
            ageSeconds: Math.round(age / 100) / 10,
            mode: document.documentElement.dataset.gameMode || null,
            survival: document.documentElement.dataset.survivalSeconds || null,
            tier: document.documentElement.dataset.perfTier || null,
            details: document.documentElement.dataset.enemyModelDetails || null,
            pixelRatio: document.documentElement.dataset.renderPixelRatio || null,
            load: document.documentElement.dataset.activeLoad || null,
            boss: [
              document.documentElement.dataset.bossActive || '0',
              document.documentElement.dataset.bossVariant || '0',
              document.documentElement.dataset.bossPhase || '0',
              document.documentElement.dataset.bossHp || '0',
              document.documentElement.dataset.bossMaxHp || '0'
            ].join('/')
          });
          slowFrames.sort((a, b) => b.ms - a.ms);
          if (slowFrames.length > 8) {
            slowFrames.length = 8;
          }
        }
      }
      last = t;
      if (intervals.length % 60 === 0) {
        tiers.push(document.documentElement.dataset.perfTier || null);
        details.push(document.documentElement.dataset.enemyModelDetails || null);
        loads.push(document.documentElement.dataset.activeLoad || null);
        survival.push(document.documentElement.dataset.survivalSeconds || null);
        bossSamples.push([
          document.documentElement.dataset.bossActive || '0',
          document.documentElement.dataset.bossVariant || '0',
          document.documentElement.dataset.bossPhase || '0',
          document.documentElement.dataset.bossHp || '0',
          document.documentElement.dataset.bossMaxHp || '0'
        ].join('/'));
      }
      if (Date.now() - started < ${durationMs}) {
        requestAnimationFrame(frame);
        return;
      }
      clearInterval(chooseTimer);
      clearInterval(skillTimer);
      clearInterval(moveTimer);
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD' }));
      const total = intervals.reduce((sum, value) => sum + value, 0);
      const avg = total / Math.max(1, intervals.length);
      const sorted = intervals.slice().sort((a, b) => a - b);
      const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
      const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
      const warmTotal = warmIntervals.reduce((sum, value) => sum + value, 0);
      const warmAvg = warmTotal / Math.max(1, warmIntervals.length);
      const warmSorted = warmIntervals.slice().sort((a, b) => a - b);
      const warmP95 = warmSorted[Math.floor(warmSorted.length * 0.95)] || 0;
      const warmP99 = warmSorted[Math.floor(warmSorted.length * 0.99)] || 0;
      resolve(JSON.stringify({
        durationMs: ${durationMs},
        frames: intervals.length,
        avgFps: Math.round(1000 / avg),
        p95FrameMs: Math.round(p95),
        p99FrameMs: Math.round(p99),
        maxFrameMs: Math.round(intervals.reduce((max, value) => Math.max(max, value), 0)),
        warmAvgFps: Math.round(1000 / warmAvg),
        warmP95FrameMs: Math.round(warmP95),
        warmP99FrameMs: Math.round(warmP99),
        warmMaxFrameMs: Math.round(warmIntervals.reduce((max, value) => Math.max(max, value), 0)),
        over33: intervals.filter((value) => value > 33.4).length,
        over50: intervals.filter((value) => value > 50).length,
        finalMode: document.documentElement.dataset.gameMode || null,
        survivalSeconds: document.documentElement.dataset.survivalSeconds || null,
        hp: document.documentElement.dataset.hp || null,
        finalTier: document.documentElement.dataset.perfTier || null,
        modelDetails: document.documentElement.dataset.enemyModelDetails || null,
        estimatedFps: document.documentElement.dataset.estimatedFps || null,
        pixelRatio: document.documentElement.dataset.renderPixelRatio || null,
        finalLoad: document.documentElement.dataset.activeLoad || null,
        finalBoss: [
          document.documentElement.dataset.bossActive || '0',
          document.documentElement.dataset.bossVariant || '0',
          document.documentElement.dataset.bossPhase || '0',
          document.documentElement.dataset.bossHp || '0',
          document.documentElement.dataset.bossMaxHp || '0'
        ].join('/'),
        gpuMode: ${JSON.stringify(disableGpu ? 'disabled' : 'enabled')},
        seenTiers: Array.from(new Set(tiers)),
        seenModelDetails: Array.from(new Set(details)),
        seenBossStates: Array.from(new Set(bossSamples)).filter(Boolean),
        peakEnemyLoad: peak(loads, 0),
        peakBulletLoad: peak(loads, 1),
        peakEnemyBulletLoad: peak(loads, 2),
        peakExplosionLoad: peak(loads, 3),
        peakHazardLoad: peak(loads, 4),
        slowFrames,
        lastLoads: loads.slice(-10),
        lastSurvivalSamples: survival.slice(-10),
        lastBossSamples: bossSamples.slice(-10),
        build: document.querySelector('#build-badge')?.textContent || null,
        bootError: document.querySelector('#boot-status.boot-status--error')?.textContent || null
      }));
    }
    function peak(samples, index) {
      return samples.reduce((max, item) => Math.max(max, Number((item || '').split('/')[index]) || 0), 0);
    }
    requestAnimationFrame(frame);
  })`;
  const result = await evaluateRetry(cdp, { awaitPromise: true, returnByValue: true, expression });
  return JSON.parse(result.result.value);
}

async function evaluateRetry(cdp, params, tries = 3) {
  let lastError;
  for (let i = 0; i < tries; i += 1) {
    try {
      return await cdp.send('Runtime.evaluate', params);
    } catch (error) {
      lastError = error;
      await sleep(900);
    }
  }
  throw lastError;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
